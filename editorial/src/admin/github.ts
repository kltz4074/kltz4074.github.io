import { contentPath, mediaPattern, portfolioSchema, type Portfolio } from '../lib/schema';

export const repository = 'kltz4074/kltz4074.github.io';
export const branch = 'main';
const api = 'https://api.github.com';
const repoBase = '/repos/' + repository;
const mediaPrefix = 'editorial/public/media/';

type TreeEntry = { path: string; mode: string; type: string; sha: string; size?: number };
export type Snapshot = { sha: string; tree: string; data: Portfolio; media: TreeEntry[] };
export type Change = { path: string; file: Blob | null };

class GitHubResponseError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function mediaPath(path: string) {
  if (!path.startsWith('/media/') || !mediaPattern.test(path.slice(7))) throw new Error('Invalid media path.');
  return mediaPrefix + path.slice(7);
}

export class GitHub {
  #token: string;
  constructor(token: string) { this.#token = token; }
  close() { this.#token = ''; }

  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const token = this.#token;
    if (!token) throw new Error('Sign in again.');
    let response: Response;
    try {
      response = await fetch(api + path, {
        method, redirect: 'error', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(body === undefined ? 20_000 : 120_000),
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('GitHub could not be reached. Check your connection and retry.');
    }
    const code = response.status;
    if (code === 401) throw new GitHubResponseError(code, 'GitHub rejected the token. Check its value and expiry.');
    if (code === 429 || (code === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
      throw new GitHubResponseError(code, 'GitHub is rate limiting requests. Wait before retrying.');
    }
    if (code === 403) throw new GitHubResponseError(code, 'GitHub denied this operation. Check the token’s repository access and permissions.');
    if (code === 404) throw new GitHubResponseError(code, 'GitHub could not access this repository resource with your token.');
    if (code === 413) throw new GitHubResponseError(code, 'GitHub rejected the encoded upload because it is too large. Try a smaller file.');
    if (!response.ok) throw new GitHubResponseError(code, `GitHub returned HTTP ${code}.`);
    return response.json() as Promise<T>;
  }

  async signIn() {
    const [user, repo] = await Promise.all([
      this.request<{ login: string }>('/user'),
      this.request<{ permissions?: { push?: boolean }; archived: boolean }>(repoBase),
    ]);
    if (user.login.toLowerCase() !== 'kltz4074' || repo.permissions?.push === false || repo.archived) {
      throw new Error('Use the repository owner’s token with Contents read and write access.');
    }
    return this.snapshot();
  }

  async head() {
    const ref = await this.request<{ object: { sha: string } }>(repoBase + '/git/ref/heads/' + branch);
    return ref.object.sha;
  }

  async contentAt(sha: string) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid revision.');
    const content = await this.request<{ content: string; encoding: string }>(repoBase + '/contents/' + contentPath + '?ref=' + sha);
    if (content.encoding !== 'base64') throw new Error('GitHub could not return the content file in Base64.');
    const bytes = Uint8Array.from(atob(content.content), value => value.charCodeAt(0));
    return portfolioSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  }

  async snapshot(): Promise<Snapshot> {
    return this.snapshotAt(await this.head());
  }

  async snapshotAt(sha: string): Promise<Snapshot> {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid revision.');
    const [commit, data] = await Promise.all([
      this.request<{ tree: { sha: string } }>(repoBase + '/git/commits/' + sha),
      this.contentAt(sha),
    ]);
    const tree = commit.tree.sha;
    const listing = await this.request<{ tree: TreeEntry[]; truncated: boolean }>(repoBase + '/git/trees/' + tree + '?recursive=1');
    if (listing.truncated) throw new Error('GitHub returned an incomplete media index.');
    return { sha, tree, data, media: listing.tree.filter(entry => entry.path.startsWith(mediaPrefix) && entry.type === 'blob') };
  }

  async blobAt(sha: string, mime: string) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid media revision.');
    const payload = await this.request<{ content: string; encoding: string }>(repoBase + '/git/blobs/' + sha);
    if (payload.encoding !== 'base64') throw new Error('GitHub could not read this media file.');
    return new Blob([Uint8Array.from(atob(payload.content), c => c.charCodeAt(0))], { type: mime });
  }

  async publish(base: Snapshot, data: Portfolio, changes: Change[], report: (message: string) => void) {
    if (!base.tree || await this.head() !== base.sha) throw new Error('Main changed on GitHub. Reload the published version and review your draft before publishing.');
    const paths = new Set<string>();
    const tree: Array<{ path: string; mode: string; type: string; content?: string; sha?: string | null }> = [{
      path: contentPath, mode: '100644', type: 'blob', content: JSON.stringify(portfolioSchema.parse(data), null, 2) + '\n',
    }];
    for (const [index, { path, file }] of changes.entries()) {
      const fullPath = mediaPath(path);
      if (paths.has(path)) throw new Error('Duplicate media change.');
      paths.add(path);
      let sha = null;
      if (file) {
        report(`Uploading media ${index + 1} / ${changes.length}`);
        const encoded = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const blob = await this.request<{ sha: string }>(repoBase + '/git/blobs', 'POST', { content: encoded, encoding: 'base64' });
        sha = blob.sha;
      }
      tree.push({ path: fullPath, mode: '100644', type: 'blob', sha });
    }
    report('Creating one Git commit…');
    const nextTree = await this.request<{ sha: string }>(repoBase + '/git/trees', 'POST', { base_tree: base.tree, tree });
    const commit = await this.request<{ sha: string }>(repoBase + '/git/commits', 'POST', {
      message: 'Publish portfolio content', tree: nextTree.sha, parents: [base.sha],
    });
    try {
      await this.request(repoBase + '/git/refs/heads/' + branch, 'PATCH', { sha: commit.sha, force: false });
    } catch (error) {
      // The response can be lost after GitHub has already advanced the branch.
      const latest = await this.head().catch(() => null);
      if (latest !== commit.sha) {
        if (latest && latest !== base.sha) throw new Error('Main changed during publication. Refresh the published revision in Overview to review your draft.');
        if (error instanceof GitHubResponseError && [409, 422].includes(error.status)) {
          throw new Error('GitHub refused to advance main. Check the repository’s branch rules and refresh the published revision.');
        }
        throw error;
      }
    }
    return commit.sha;
  }

  history() {
    return this.request<Array<{ sha: string; commit: { message: string; author: { date: string } } }>>(repoBase + '/commits?per_page=20&path=' + encodeURIComponent(contentPath) + '&sha=' + branch);
  }

  actions(sha: string) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid revision.');
    return this.request<{ workflow_runs: Array<{ status: string; conclusion: string | null; html_url: string; updated_at: string }> }>(repoBase + '/actions/workflows/pages.yml/runs?per_page=1&head_sha=' + sha);
  }
}

export const mediaUrl = (path: string) => '/media/' + path.slice(mediaPrefix.length);
