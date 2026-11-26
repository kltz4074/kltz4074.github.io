import type { Draft } from './draft';
import type { Snapshot } from './github';

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function rebaseDraft(draft: Draft, previous: Snapshot, next: Snapshot): Draft {
  if (draft.base !== previous.sha) throw new Error('The original draft revision is unavailable.');
  function merge(base: unknown, local: unknown, published: unknown, path: string): unknown {
    if (equal(local, base)) return published;
    if (equal(published, base) || equal(local, published)) return local;
    if (object(base) && object(local) && object(published)) {
      return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(published), ...Object.keys(local)])].flatMap(key => {
        const value = merge(base[key], local[key], published[key], path ? path + ' / ' + key : key);
        return value === undefined ? [] : [[key, value]];
      }));
    }
    throw new Error('Both revisions changed ' + path + '. Your local draft is still available.');
  }

  const data = merge(previous.data, draft.data, next.data, '') as Draft['data'];
  for (const { path } of draft.changes) {
    const previousSha = previous.media.find(item => item.path.endsWith(path))?.sha;
    const nextSha = next.media.find(item => item.path.endsWith(path))?.sha;
    if (previousSha !== nextSha) throw new Error('Both revisions changed ' + path + '. Your local draft is still available.');
  }
  return { ...draft, base: next.sha, data };
}
