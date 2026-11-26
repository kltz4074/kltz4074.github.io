import { mediaReferences, portfolioSchema, type Frame, type Portfolio, type Seo } from '../lib/schema';
import { actions, button, checkbox, clearPreview, field, group, node } from './form';
import { GitHub, mediaPath, mediaUrl, type Change, type Snapshot } from './github';
import { clearDraft, getDraft, saveDraft, type Draft } from './draft';
import { mimeFor, prepareMedia } from './media';
import { rebaseDraft } from './merge';

const sections = ['Overview', 'Projects', 'Lab', 'Devlog', 'About', 'Now', 'Contacts', 'Media Library', 'Navigation', 'Appearance', 'Localization', 'SEO', 'Settings', 'Publishing History'] as const;
type Section = typeof sections[number];
type Copy = Record<string, string>;
type MediaItem = { path: string; bytes: number; sha?: string; file?: Blob };
type Entry = Portfolio['lab'][number];
type Link = Portfolio['site']['contacts'][number];

const select = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const panel = select('panel');
const status = select('status');
const review = select<HTMLDialogElement>('review');
const publishButton = select<HTMLButtonElement>('publish');
const undoButton = select<HTMLButtonElement>('undo');
const publishStatus = select('publish-status');
const editor = select('workspace');
const signIn = select<HTMLFormElement>('sign-in');
const tokenField = select<HTMLInputElement>('token');
let api: GitHub | undefined;
let remote: Snapshot;
let draft: Draft;
let undo: Draft | undefined;
let section: Section = 'Overview';
let busy = false;
let persistence = Promise.resolve();
const previewUrls = new Set<string>();

function report(message: string) { status.textContent = message; }
function message(error: unknown) { return error instanceof Error ? error.message : 'The operation failed.'; }
function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }
function dirty() { return !same(remote.data, draft.data) || draft.changes.length > 0; }

function store() {
  const copy = structuredClone(draft);
  persistence = persistence.catch(() => {}).then(async () => {
    if (same(copy.data, remote.data) && !copy.changes.length) await clearDraft();
    else await saveDraft(copy);
  }).catch(() => report('Local storage failed. Keep this tab open until your changes are published.'));
}

function edited<T>(update: (value: T) => void) {
  return (value: T) => {
    if (busy) return;
    undo = structuredClone(draft);
    update(value);
    undoButton.disabled = false;
    report('Unpublished draft');
    store();
  };
}

function transact(update: () => void) {
  edited(update)(undefined);
  render();
}

function mediaItems() {
  const items = new Map<string, MediaItem>(remote.media.map(file => {
    const path = mediaUrl(file.path);
    return [path, { path, bytes: file.size ?? 0, sha: file.sha }];
  }));
  for (const { path, file } of draft.changes) {
    if (file) items.set(path, { path, bytes: file.size, file });
    else items.delete(path);
  }
  return [...items.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function stage(path: string, file: Blob | null) {
  mediaPath(path);
  draft.changes = draft.changes.filter(change => change.path !== path);
  if (file || remote.media.some(entry => mediaUrl(entry.path) === path)) draft.changes.push({ path, file });
}

function addAssetField(label: string, value: string | undefined, update: (value: string) => void) {
  return field(label, value ?? '', edited(update), { list: 'media-paths' });
}

function plain(label: string, value: string | undefined, update: (value: string) => void) {
  return field(label, value ?? '', edited(update));
}

function translated(label: string, value: Copy | undefined, update: (value: Copy) => void, rich = false) {
  const box = group(label);
  let current = value ?? {};
  for (const lang of new Set([...draft.data.site.languages, ...Object.keys(current)])) {
    box.append(field(lang.toUpperCase(), current[lang] ?? '', edited(text => {
      current = { ...current, [lang]: text };
      update(current);
    }), { multiline: rich, rich }));
  }
  return box;
}

function sortItems<T>(list: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
  transact(() => { const [item] = list.splice(from, 1); list.splice(to, 0, item); });
}

function rows<T>(list: T[], title: (item: T) => string, fields: (item: T) => HTMLElement[], add: () => T, duplicate?: (item: T) => T) {
  const wrapper = node('div');
  let dragged = -1;
  for (const [index, item] of list.entries()) {
    const row = node('details');
    const summary = node('summary', title(item) || 'Untitled');
    summary.draggable = true;
    summary.addEventListener('dragstart', event => {
      dragged = index;
      event.dataTransfer?.setData('text/plain', String(index));
    });
    summary.addEventListener('dragend', () => { dragged = -1; });
    row.addEventListener('dragover', event => { if (dragged >= 0) event.preventDefault(); });
    row.addEventListener('drop', event => {
      if (dragged < 0) return;
      event.preventDefault();
      sortItems(list, dragged, index);
      dragged = -1;
    });
    const up = button('Move up', () => sortItems(list, index, index - 1));
    const down = button('Move down', () => sortItems(list, index, index + 1));
    up.disabled = index === 0;
    down.disabled = index === list.length - 1;
    const remove = button('Delete', () => {
      if (confirm('Remove this item from the draft?')) transact(() => list.splice(index, 1));
    });
    const controls = actions(up, down, remove);
    if (duplicate) controls.append(button('Duplicate', () => transact(() => list.splice(index + 1, 0, duplicate(item)))));
    row.append(summary, ...fields(item), controls);
    wrapper.append(row);
  }
  wrapper.append(button('Add item', () => {
    transact(() => list.push(add()));
    const entries = panel.querySelectorAll<HTMLDetailsElement>('main > div > details');
    const last = entries[entries.length - 1];
    if (last) last.open = true;
  }));
  return wrapper;
}

function optionalRows<T>(list: T[] | undefined, set: (data: T[]) => void, title: (item: T) => string, fields: (item: T) => HTMLElement[], add: () => T) {
  if (list) return rows(list, title, fields, add);
  return actions(button('Add item', () => transact(() => set([add()]))));
}

const newLink = (): Link => ({ label: '', url: 'https://' });
const linkFields = (link: Link) => [
  plain('Label', link.label, value => { link.label = value; }),
  plain('URL', link.url, value => { link.url = value; }),
  plain('Display value', link.value, value => { link.value = value; }),
];
const newFrame = (): Frame => ({ src: '', alt: '' });
const frameFields = (frame: Frame) => [
  addAssetField('Media URL', frame.src, value => { frame.src = value; }),
  plain('Alternative text', frame.alt, value => { frame.alt = value; }),
];

function seoFields(seo: Seo) {
  return [
    plain('SEO title', seo.title, value => { seo.title = value; }),
    plain('SEO description', seo.description, value => { seo.description = value; }),
    addAssetField('Social preview image', seo.image, value => { seo.image = value || undefined; }),
  ];
}

function entryFields(item: Entry) {
  const media = group('Media');
  media.append(optionalRows(item.media, value => { item.media = value; }, frame => frame.src, frameFields, newFrame));
  const seo = group('SEO');
  if (item.seo) seo.append(...seoFields(item.seo));
  else seo.append(button('Add SEO settings', () => transact(() => { item.seo = {}; })));
  return [
    plain('Title', item.title, value => { item.title = value; }),
    plain('Slug', item.slug, value => { item.slug = value; }),
    translated('Body', item.body, value => { item.body = value; }, true),
    addAssetField('Cover', item.cover, value => { item.cover = value; }),
    plain('Tags, comma separated', item.tags?.join(', '), value => { item.tags = listInput(value); }),
    checkbox('Hidden', !!item.hidden, edited(value => { item.hidden = value; })),
    media, seo,
  ];
}

function listInput(value: string) {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}
const today = () => new Date().toISOString().slice(0, 10);
const slug = () => 'entry-' + Date.now().toString(36);

function projectFields(item: Portfolio['projects'][number]) {
  const site = draft.data.site;
  const properties = node('div');
  properties.className = 'field-grid';
  properties.append(
    field('Category', item.category, edited(value => { item.category = value; }), { options: site.categories }),
    field('Status', item.status, edited(value => { item.status = value; }), { options: site.statuses }),
    plain('Created', item.created, value => { item.created = value; }),
    field('Updated', item.updated ?? '', edited(value => { item.updated = value; }), { type: 'date' }),
    plain('Role', item.role, value => { item.role = value; }),
    plain('Tools, comma separated', item.tech?.join(', '), value => { item.tech = listInput(value); }),
  );
  const links = group('Links');
  links.append(optionalRows(item.links, value => { item.links = value; }, link => link.label, linkFields, newLink));
  return [
    ...entryFields(item), properties,
    translated('Short description', item.summary, value => { item.summary = value; }),
    translated('Updates', item.updates, value => { item.updates = value; }, true),
    checkbox('Feature on home', !!item.featured, edited(value => { item.featured = value; })),
    checkbox('Archived', !!item.archived, edited(value => { item.archived = value; })),
    links,
  ];
}

function related(item: Entry) {
  return field('Related project', item.project ?? '', edited(value => { item.project = value; }), { options: ['', ...draft.data.projects.map(project => project.slug)] });
}

function mediaLibrary() {
  const box = node('div', 'Drop files here or choose files to add to the draft.');
  box.className = 'drop';
  const picker = node('input');
  picker.type = 'file';
  picker.accept = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm';
  picker.multiple = true;
  picker.setAttribute('aria-label', 'Choose media files');
  let folder = '';
  let optimize = true;
  box.append(field('Folder under /media/', '', value => { folder = value; }), checkbox('Optimize still images as WebP', optimize, value => { optimize = value; }), picker);
  async function upload(files: File[]) {
    if (busy || !files.length) return;
    busy = true;
    editor.inert = true;
    const prepared: Change[] = [];
    const errors: string[] = [];
    const paths = new Set(mediaItems().map(item => item.path));
    for (const [index, file] of files.entries()) {
      report(`Preparing media ${index + 1} / ${files.length}`);
      try {
        const item = await prepareMedia(file, optimize);
        const normalizedFolder = folder.trim().toLowerCase().replace(/\/$/, '');
        const name = item.name.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/\.(?=.*\.)/g, '-');
        const path = '/media/' + (normalizedFolder ? normalizedFolder + '/' : '') + name;
        mediaPath(path);
        if (paths.has(path)) throw new Error('A file already uses this path.');
        paths.add(path);
        prepared.push({ path, file: item.file });
      } catch (error) {
        errors.push(file.name + ' — ' + message(error));
      }
    }
    busy = false;
    editor.inert = false;
    if (prepared.length) transact(() => prepared.forEach(change => stage(change.path, change.file)));
    report([`${prepared.length} files added to the draft.`, ...errors].join(' '));
    picker.value = '';
  }
  picker.addEventListener('change', () => void upload([...picker.files ?? []]));
  box.addEventListener('dragover', event => event.preventDefault());
  box.addEventListener('drop', event => { event.preventDefault(); void upload([...event.dataTransfer?.files ?? []]); });
  const list = node('div');
  const listingUrls = new Set<string>();
  function listing(filter = '', order = 'Name') {
    listingUrls.forEach(url => { URL.revokeObjectURL(url); previewUrls.delete(url); });
    listingUrls.clear();
    list.replaceChildren();
    const items = mediaItems().filter(item => item.path.toLowerCase().includes(filter.toLowerCase()));
    if (order === 'Largest first') items.sort((a, b) => b.bytes - a.bytes);
    for (const item of items) {
      const row = node('details');
      row.className = 'media-row';
      const url = item.file ? URL.createObjectURL(item.file) : item.path;
      if (item.file) { previewUrls.add(url); listingUrls.add(url); }
      const media = mimeFor(item.path)?.startsWith('video/') ? node('video') : node('img');
      if (media instanceof HTMLVideoElement) { media.controls = true; media.preload = 'none'; }
      else { media.alt = ''; media.loading = 'lazy'; }
      const dimensions = node('small');
      if (media instanceof HTMLImageElement) media.addEventListener('load', () => { dimensions.textContent = `${media.naturalWidth} × ${media.naturalHeight} px`; });
      row.addEventListener('toggle', () => { if (row.open && !media.hasAttribute('src')) media.src = url; });
      const remove = button('Delete', () => {
        if (mediaReferences(draft.data).has(item.path)) return report('Remove all references to this file before deleting it.');
        if (confirm('Remove this file from the draft?')) transact(() => stage(item.path, null));
      });
      let target = item.path;
      const rename = button('Rename', async () => {
        if (busy || target === item.path) return;
        try {
          mediaPath(target);
          if (mimeFor(target) !== mimeFor(item.path)) throw new Error('Keep the original file format when renaming.');
          if (mediaItems().some(file => file.path === target)) throw new Error('A file already uses this path.');
          if (mediaReferences(draft.data).has(item.path)) throw new Error('Remove references to this file before renaming it.');
          busy = true;
          editor.inert = true;
          const file = item.file ?? await api!.blobAt(item.sha!, mimeFor(item.path));
          busy = false;
          editor.inert = false;
          transact(() => { stage(target, file); stage(item.path, null); });
        } catch (error) { report(message(error)); }
        finally { busy = false; editor.inert = false; }
      });
      row.append(node('summary', item.path), node('small', `${Math.ceil(item.bytes / 1024).toLocaleString()} KiB`), media, dimensions,
        field('New path', item.path, value => { target = value; }),
        actions(button('Copy path', async () => {
          try { await navigator.clipboard.writeText(item.path); report('Media path copied.'); }
          catch { report('Clipboard is unavailable. Copy the path from the file name.'); }
        }), rename, remove));
      list.append(row);
    }
  }
  let filter = '';
  let order = 'Name';
  const search = field('Search media', '', value => { filter = value; listing(filter, order); }, { type: 'search' });
  const sort = field('Sort', order, value => { order = value; listing(filter, order); }, { options: ['Name', 'Largest first'] });
  listing();
  panel.append(box, search, sort, list);
}

function render() {
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  previewUrls.clear();
  const data = draft.data;
  const site = data.site;
  panel.replaceChildren(node('h1', section));
  const media = node('datalist');
  media.id = 'media-paths';
  for (const item of mediaItems()) { const option = node('option'); option.value = item.path; media.append(option); }
  panel.append(media);
  for (const control of select('sections').querySelectorAll('button')) {
    if (control.textContent === section) control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  }

  if (section === 'Overview') {
    const metrics = node('ul');
    for (const label of [
      `${data.projects.length} projects`, `${remote.data.devlog.filter(post => !post.hidden).length} published devlog posts`,
      `${dirty() ? 1 : 0} local draft`, `${(mediaItems().reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(2)} MiB of media`,
    ]) metrics.append(node('li', label));
    const state = node('p', 'Checking Pages workflow…');
    void showActions(state, remote.sha);
    panel.append(metrics, state, button('Refresh published revision', refresh));
  }
  if (section === 'Projects') panel.append(rows(data.projects, item => item.title, projectFields,
    () => ({ title: 'New project', slug: slug(), summary: { en: '' }, category: site.categories[0] ?? '', status: site.statuses[0] ?? '', media: [], links: [] }),
    item => ({ ...structuredClone(item), slug: slug(), title: item.title + ' copy', featured: false })));
  if (section === 'Lab') panel.append(rows(data.lab, item => item.title || item.media?.[0]?.src || item.slug, item => [...entryFields(item), related(item)], () => ({ slug: slug(), media: [] })));
  if (section === 'Devlog') panel.append(rows(data.devlog, item => item.title, item => [
    ...entryFields(item), related(item), field('Date', item.date, edited(value => { item.date = value; }), { type: 'date' }),
  ], () => ({ title: 'New post', slug: slug(), date: today(), media: [] })));
  if (section === 'About') panel.append(translated('Biography', site.about, value => { site.about = value; }, true),
    optionalRows(site.aboutMedia, value => { site.aboutMedia = value; }, item => item.src, frameFields, newFrame));
  if (section === 'Now') panel.append(translated('Current work', data.now.body, value => { data.now.body = value; }, true),
    field('Last updated', data.now.updated ?? '', edited(value => { data.now.updated = value; }), { type: 'date' }));
  if (section === 'Contacts') panel.append(
    rows(site.contacts, item => item.label, linkFields, newLink),
    translated('Collaboration availability', site.collaboration, value => { site.collaboration = value; }, true),
  );
  if (section === 'Navigation') panel.append(rows(site.navigation, item => item.label, linkFields, () => ({ label: '', url: '/' })));
  if (section === 'Appearance') panel.append(
    plain('Site name', site.name, value => { site.name = value; }),
    addAssetField('Avatar', site.avatar, value => { site.avatar = value; }),
    addAssetField('Hero image', site.hero, value => { site.hero = value; }),
    addAssetField('Mobile hero image', site.heroMobile, value => { site.heroMobile = value || undefined; }),
    checkbox('Show Alive', site.alive, edited(value => { site.alive = value; })),
    plain('Footer text', site.footer, value => { site.footer = value; }),
    translated('Home introduction', site.intro, value => { site.intro = value; }),
  );
  if (section === 'Localization') panel.append(plain('Languages, comma separated', site.languages.join(', '), value => { site.languages = listInput(value); }));
  if (section === 'SEO') {
    panel.append(...seoFields(site.seo));
    for (const page of ['projects', 'about', 'contact', 'now', 'lab', 'devlog']) {
      const box = group(page);
      const seo = site.pageSeo?.[page];
      if (seo) box.append(...seoFields(seo));
      else box.append(button('Add page metadata', () => transact(() => { (site.pageSeo ??= {})[page] = {}; })));
      panel.append(box);
    }
  }
  if (section === 'Settings') {
    panel.append(plain('Project categories, comma separated', site.categories.join(', '), value => { site.categories = listInput(value); }),
      plain('Project statuses, comma separated', site.statuses.join(', '), value => { site.statuses = listInput(value); }));
    const box = group('Sections');
    for (const name of ['projects', 'about', 'contact', 'lab', 'now', 'devlog']) {
      box.append(checkbox('Show ' + name, site.sectionVisibility?.[name] !== false, edited(value => { (site.sectionVisibility ??= {})[name] = value; })));
    }
    panel.append(box, button('Discard draft', async () => {
      if (!confirm('Discard all unpublished changes on this device?')) return;
      draft = { base: remote.sha, data: structuredClone(remote.data), changes: [] };
      undo = undefined;
      undoButton.disabled = true;
      await persistence;
      await clearDraft().catch(error => report(message(error)));
      render();
    }));
  }
  if (section === 'Media Library') mediaLibrary();
  if (section === 'Publishing History') {
    const container = node('div', 'Loading publication history…');
    panel.append(container);
    void api?.history().then(entries => {
      container.replaceChildren();
      for (const entry of entries) {
        const row = node('div');
        row.className = 'group';
        const link = node('a', entry.sha.slice(0, 8));
        link.href = 'https://github.com/kltz4074/kltz4074.github.io/commit/' + entry.sha;
        row.append(node('p', entry.commit.message.split('\n')[0]), link, node('p', entry.commit.author.date),
          button('Restore content to draft', async () => {
            if (!confirm('Replace the current draft content with this revision? Media files will stay in place.')) return;
            try {
              const published = await api!.contentAt(entry.sha);
              transact(() => { draft.data = published; });
            } catch (error) { report(message(error)); }
          }));
        container.append(row);
      }
    }).catch(error => { container.textContent = message(error); });
  }
}

async function showActions(target: HTMLElement, sha: string) {
  try {
    const { workflow_runs: [run] } = await api!.actions(sha);
    if (!run) { target.textContent = 'No Pages workflow run was returned for this revision.'; return; }
    const link = node('a', 'Open workflow run');
    link.href = run.html_url;
    target.replaceChildren(`Pages: ${run.conclusion || run.status} · ${run.updated_at} · `, link);
  } catch { target.textContent = 'Workflow status unavailable. Actions read access may be needed.'; }
}

async function refresh() {
  if (busy || !api) return;
  busy = true;
  editor.inert = true;
  try {
    const next = await api.snapshot();
    if (dirty()) {
      const previous = draft.base === remote.sha ? remote : await api.snapshotAt(draft.base);
      draft = rebaseDraft(draft, previous, next);
    } else {
      draft = { base: next.sha, data: structuredClone(next.data), changes: [] };
    }
    remote = next;
    undo = undefined;
    undoButton.disabled = true;
    store();
    render();
    report('Published revision checked.');
  } catch (error) { report(message(error)); }
  finally { busy = false; editor.inert = false; }
}

function reviewChanges() {
  if (busy || !api) return;
  const body = select('review-body');
  body.replaceChildren();
  publishStatus.textContent = '';
  const validation = portfolioSchema.safeParse(draft.data);
  const files = new Set(mediaItems().map(item => item.path));
  const missing = [...mediaReferences(draft.data)].filter(path => !files.has(path));
  const errors = validation.success ? [] : validation.error.issues.map(issue => issue.path.join(' / ') + ' — ' + issue.message);
  errors.push(...missing.map(path => 'Missing media: ' + path));
  if (!remote.tree) errors.push('Refresh the published revision in Overview before publishing again.');
  if (draft.base !== remote.sha) errors.push('This draft is based on an older revision. Use Refresh published revision in Overview to check for conflicts.');
  publishButton.disabled = errors.length > 0 || !dirty();
  if (errors.length) {
    const list = node('ul');
    for (const error of errors) list.append(node('li', error));
    body.append(list);
  }
  if (dirty()) {
    const list = node('ul');
    if (!same(remote.data, draft.data)) list.append(node('li', 'editorial/content/portfolio.json'));
    draft.changes.forEach(change => list.append(node('li', (change.file ? 'Add / replace ' : 'Delete ') + mediaPath(change.path))));
    body.append(list);
    for (const key of ['site', 'projects', 'lab', 'devlog', 'now'] as const) {
      if (same(remote.data[key], draft.data[key])) continue;
      const section = node('details');
      section.append(node('summary', key));
      if (key === 'projects' || key === 'lab' || key === 'devlog') {
        for (const entry of draft.data[key].filter(item => !same(item, remote.data[key].find(previous => previous.slug === item.slug)))) {
          const preview = node('div');
          preview.className = 'preview';
          clearPreview(preview, entry.body?.en ?? '');
          section.append(node('h3', entry.title || entry.slug), preview);
        }
      } else {
        const preview = node('div');
        preview.className = 'preview';
        clearPreview(preview, key === 'site' ? draft.data.site.about.en : draft.data.now.body?.en ?? '');
        section.append(preview);
      }
      body.append(section);
    }
  } else body.append(node('p', 'No unpublished changes.'));
  if (!review.open) review.showModal();
}

select('close-review').addEventListener('click', () => { if (!busy) review.close(); });
review.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
select('preview').addEventListener('click', reviewChanges);
publishButton.addEventListener('click', async () => {
  if (!api || busy || publishButton.disabled) return;
  busy = true;
  publishButton.disabled = true;
  select<HTMLButtonElement>('close-review').disabled = true;
  try {
    const sha = await api.publish(remote, draft.data, draft.changes, progress => { publishStatus.textContent = progress; });
    await persistence;
    const publishedMedia = mediaItems().map(item => ({ path: mediaPath(item.path), size: item.bytes, sha: item.sha ?? '', mode: '100644', type: 'blob' }));
    const published = structuredClone(draft.data);
    const fresh = await api.snapshot().catch(() => undefined);
    if (fresh) remote = fresh;
    else remote = { sha, tree: '', data: published, media: publishedMedia };
    draft = { base: remote.sha, data: structuredClone(remote.data), changes: [] };
    undo = undefined;
    undoButton.disabled = true;
    await clearDraft().catch(() => report('The commit succeeded. The local draft could not be cleared.'));
    publishStatus.textContent = 'Committed to GitHub. Pages deployment is handled by GitHub Actions.';
    report('Published commit ' + sha.slice(0, 8));
    const run = node('p');
    publishStatus.append(run);
    void showActions(run, sha);
    render();
  } catch (error) {
    publishStatus.textContent = message(error);
    publishButton.disabled = false;
  } finally {
    busy = false;
    select<HTMLButtonElement>('close-review').disabled = false;
  }
});

signIn.addEventListener('submit', async event => {
  event.preventDefault();
  const token = tokenField.value.trim();
  tokenField.value = '';
  const state = select('login-status');
  if (!token.startsWith('github_pat_')) { state.textContent = 'Enter a fine-grained GitHub token.'; return; }
  const submit = signIn.querySelector('button')!;
  submit.disabled = true;
  state.textContent = 'Connecting to GitHub…';
  const client = new GitHub(token);
  try {
    remote = await client.signIn();
    const restored = await getDraft().catch(() => undefined);
    api = client;
    draft = restored ?? { base: remote.sha, data: structuredClone(remote.data), changes: [] };
    select('login').hidden = true;
    editor.hidden = false;
    section = 'Overview';
    render();
    if (restored) report(restored.base === remote.sha ? 'Local draft restored.' : 'Local draft restored from an older revision. Review before continuing.');
  } catch (error) {
    client.close();
    state.textContent = message(error);
  } finally { submit.disabled = false; }
});

select('logout').addEventListener('click', () => {
  api?.close();
  api = undefined;
  editor.hidden = true;
  panel.replaceChildren();
  undo = undefined;
  undoButton.disabled = true;
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  previewUrls.clear();
  select('login').hidden = false;
  select('login-status').textContent = 'Signed out.';
  tokenField.focus();
});

undoButton.addEventListener('click', () => {
  if (!undo || busy) return;
  draft = undo;
  undo = undefined;
  undoButton.disabled = true;
  store();
  render();
  report('Last edit undone.');
});

const sidebar = select('sections');
for (const name of sections) sidebar.append(button(name, () => {
  section = name;
  render();
  panel.focus();
}));

document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's' && api) {
    event.preventDefault();
    reviewChanges();
  }
});
window.addEventListener('beforeunload', event => {
  if (api && (busy || dirty())) event.preventDefault();
});
