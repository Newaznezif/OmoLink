'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Local-first draft persistence using IndexedDB with a localStorage fallback.
 * The draft is scoped to (producerId, listingId?). A draft created without a
 * listingId is treated as "new listing pending sync"; the sync action uploads
 * the payload and clears the local record.
 *
 * Status semantics:
 *  - idle:     nothing on this device
 *  - local:    draft saved on this device, not yet marked for sync
 *  - pending:  draft saved on this device and marked as queued for sync
 *  - synced:   last sync attempt succeeded, draft cleared
 *  - failed:   last sync attempt failed, retry is available
 */

type Status = 'idle' | 'local' | 'pending' | 'synced' | 'failed';

const DB_NAME = 'omolink_drafts';
const STORE = 'listing_drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function keyFor(producerId: string, listingId?: string) {
  return `${producerId}::${listingId ?? 'new'}`;
}

async function idbGet(key: string): Promise<unknown | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as unknown | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// localStorage fallback for browsers without IndexedDB or in privacy mode.
function lsGet(key: string): unknown | undefined {
  try {
    const raw = window.localStorage.getItem(`omolink_draft_${key}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
function lsPut(key: string, value: unknown) {
  try {
    window.localStorage.setItem(`omolink_draft_${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
function lsDelete(key: string) {
  try {
    window.localStorage.removeItem(`omolink_draft_${key}`);
  } catch {
    /* ignore */
  }
}

export function useListingDraft<T = unknown>(producerId: string, listingId?: string) {
  const key = keyFor(producerId, listingId);
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState<T | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = (await idbGet(key)) as { payload: T; pending?: boolean } | undefined;
        if (cancelled) return;
        if (stored) {
          setDraft(stored.payload);
          setStatus(stored.pending ? 'pending' : 'local');
        }
      } catch {
        const raw = lsGet(key) as { payload: T; pending?: boolean } | undefined;
        if (cancelled) return;
        if (raw) {
          setDraft(raw.payload);
          setStatus(raw.pending ? 'pending' : 'local');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const saveDraft = useCallback(
    async (payload: T, pending = false) => {
      const record = { payload, pending };
      try {
        await idbPut(key, record);
      } catch {
        lsPut(key, record);
      }
      setDraft(payload);
      setStatus(pending ? 'pending' : 'local');
    },
    [key]
  );

  const clearDraft = useCallback(async () => {
    try {
      await idbDelete(key);
    } catch {
      /* ignore */
    }
    lsDelete(key);
    setDraft(undefined);
    setStatus('idle');
  }, [key]);

  const sync = useCallback(
    async (payload: T) => {
      setStatus('pending');
      await saveDraft(payload, true);
      try {
        const url = listingId ? `/api/listings/${listingId}` : '/api/listings';
        const method = listingId ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ producerId, ...(payload as object) })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error ?? 'Server rejected the draft.');
        }
        setStatus('synced');
        await clearDraft();
      } catch {
        setStatus('failed');
        throw new Error('Could not sync. Your draft is safe on this device — retry when the network returns.');
      }
    },
    [clearDraft, listingId, producerId, saveDraft]
  );

  return { status, draft, saveDraft, clearDraft, sync } as const;
}
