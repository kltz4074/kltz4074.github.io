import type { Portfolio } from '../lib/schema';
import type { Change } from './github';

export type Draft = { base: string; data: Portfolio; changes: Change[] };

async function storage<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open('kltzqu-editorial-cms', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('drafts');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('drafts', mode);
      const request = operation(transaction.objectStore('drafts'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? request.error);
      transaction.onerror = () => reject(transaction.error ?? request.error);
    });
  } finally {
    database.close();
  }
}

export const getDraft = () => storage<Draft | undefined>('readonly', store => store.get('portfolio'));
export const saveDraft = (draft: Draft) => storage('readwrite', store => store.put(draft, 'portfolio'));
export const clearDraft = () => storage('readwrite', store => store.delete('portfolio'));
