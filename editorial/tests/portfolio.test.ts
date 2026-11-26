import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentPath, mediaReferences, portfolioSchema, safeLink } from '../src/lib/schema.ts';
import { markdown } from '../src/lib/markdown.ts';
import { GitHub, mediaPath } from '../src/admin/github.ts';
import { rebaseDraft } from '../src/admin/merge.ts';
import { matchesFormat } from '../src/admin/media.ts';

const data = portfolioSchema.parse(JSON.parse(await readFile(new URL('../content/portfolio.json', import.meta.url), 'utf8')));
const base = { sha: 'a'.repeat(40), tree: 'b'.repeat(40), data, media: [] };

test('all published references resolve to media in the repository', async () => {
  for (const file of mediaReferences(data)) {
    const bytes = await readFile(new URL('../public' + file, import.meta.url));
    assert.ok(bytes.length, file);
  }
});

test('the schema rejects duplicate and unsafe project data', () => {
  const draft = structuredClone(data);
  draft.projects.push({ ...draft.projects[0] });
  assert.equal(portfolioSchema.safeParse(draft).success, false);
  assert.equal(safeLink('https://user@example.com'), false);
  assert.equal(safeLink('javascript:alert(1)'), false);
  assert.equal(safeLink('/\\evil.example'), false);
  assert.equal(safeLink('https://github.com/kltz4074'), true);
  assert.throws(() => mediaPath('/media/../index.html'));
  assert.throws(() => mediaPath('/media/image.svg'));
  assert.throws(() => mediaPath('/media/a/%2findex.html'));
  assert.equal(mediaPath('/media/project/image.webp'), 'editorial/public/media/project/image.webp');
});

test('Markdown renders a table and escapes raw HTML and invalid URLs', () => {
  const rendered = markdown('<img onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n| Header |\n| --- |\n| cell |');
  assert.match(rendered, /&lt;img/);
  assert.doesNotMatch(rendered, /href="javascript:/);
  assert.match(rendered, /<table>/);
});

test('media validation checks file signatures', () => {
  assert.equal(matchesFormat(Uint8Array.of(137,80,78,71,13,10,26,10), 'image/png'), true);
  assert.equal(matchesFormat(new TextEncoder().encode('<html>'), 'image/png'), false);
});

test('a stale draft cannot publish', async (context) => {
  const api = new GitHub('test-token');
  const request = context.mock.method(api, 'request', async () => ({ object: { sha: 'c'.repeat(40) } }));
  await assert.rejects(() => api.publish(base, data, [], () => {}), /Main changed/);
  assert.equal(request.mock.callCount(), 1);
});

test('publishing creates a single commit and advances the ref without force', async (context) => {
  const api = new GitHub('test-token');
  const request = context.mock.method(api, 'request', async (path: string) => {
    if (path.endsWith('/git/ref/heads/main')) return { object: { sha: base.sha } };
    return { sha: 'd'.repeat(40) };
  });
  await api.publish(base, data, [], () => {});
  assert.deepEqual(request.mock.calls.map(call => call.arguments[1]), [undefined, 'POST', 'POST', 'PATCH']);
  assert.equal(request.mock.calls[1].arguments[2].tree[0].path, contentPath);
  assert.deepEqual(request.mock.calls[2].arguments[2].parents, [base.sha]);
  assert.equal(request.mock.calls[3].arguments[2].force, false);
});

test('a concurrent update is reported without retrying the ref write', async (context) => {
  const api = new GitHub('test-token');
  let head = base.sha;
  const request = context.mock.method(api, 'request', async (path: string, method?: string) => {
    if (path.endsWith('/git/ref/heads/main')) return { object: { sha: head } };
    if (method === 'PATCH') {
      head = 'e'.repeat(40);
      throw new Error('Update rejected');
    }
    return { sha: 'd'.repeat(40) };
  });
  await assert.rejects(() => api.publish(base, data, [], () => {}), /Main changed during publication/);
  assert.equal(request.mock.calls.filter(call => call.arguments[1] === 'PATCH').length, 1);
});

test('a lost response is recovered when GitHub already applied the update', async (context) => {
  const api = new GitHub('test-token');
  const commit = 'd'.repeat(40);
  let head = base.sha;
  context.mock.method(api, 'request', async (path: string, method?: string) => {
    if (path.endsWith('/git/ref/heads/main')) return { object: { sha: head } };
    if (method === 'PATCH') {
      head = commit;
      throw new Error('Connection lost');
    }
    return { sha: commit };
  });
  assert.equal(await api.publish(base, data, [], () => {}), commit);
});

test('a rebase combines different edits and rejects overlapping changes', () => {
  const local = structuredClone(data);
  local.site.footer = 'Local';
  const published = structuredClone(data);
  published.site.intro.en = 'Published';
  const draft = { base: base.sha, data: local, changes: [] };
  const next = { ...base, sha: 'c'.repeat(40), data: published };
  assert.equal(rebaseDraft(draft, base, next).data.site.footer, 'Local');
  assert.equal(rebaseDraft(draft, base, next).data.site.intro.en, 'Published');
  published.site.footer = 'Published';
  assert.throws(() => rebaseDraft(draft, base, next), /Both revisions changed site \/ footer/);
});
