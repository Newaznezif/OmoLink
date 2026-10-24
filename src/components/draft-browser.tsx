'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { Card, CardBody, Empty, Badge, Button } from './ui';

type DraftRecord = { key: string; producerId: string; listingId: string | null; updatedAt: string; title: string };

/**
 * Lists drafts stored on this device under IndexedDB (`omolink_drafts` /
 * `listing_drafts`). Provides a way to inspect what has been saved locally
 * and remove stale drafts. This is intentionally minimal — the real editing
 * surface is the listing form itself.
 */
export function DraftBrowser({ lang }: { lang: LanguageCode }) {
  const [drafts, setDrafts] = useState<DraftRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await listDrafts();
        setDrafts(all);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t(lang, 'offline.draftReadError'));
        setDrafts([]);
      }
    })();
  }, [lang]);

  async function clearAll() {
    await clearAllDrafts();
    setDrafts([]);
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">{t(lang, 'offline.draftBrowserTitle')}</h2>
          {drafts !== null && drafts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              {t(lang, 'offline.draftClearAll')}
            </Button>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
        {drafts === null ? (
          <p className="mt-1 text-sm text-ink-500">{t(lang, 'offline.draftLoading')}</p>
        ) : drafts.length === 0 ? (
          <div className="mt-3">
            <Empty title={t(lang, 'offline.draftEmptyTitle')} body={t(lang, 'offline.draftEmptyBody')} />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {drafts.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-ink-900">{d.title || t(lang, 'offline.draftUntitled')}</span>
                <span className="text-xs text-ink-500">{new Date(d.updatedAt).toLocaleString()}</span>
                <Badge tone="warning">{t(lang, 'offline.draftLocalBadge')}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

async function listDrafts(): Promise<DraftRecord[]> {
  if (typeof indexedDB === 'undefined') {
    const out: DraftRecord[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith('omolink_draft_')) continue;
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const payload = parsed?.payload ?? {};
        out.push({
          key: k,
          producerId: k.split('::')[0]?.replace('omolink_draft_', '') ?? 'unknown',
          listingId: null,
          updatedAt: new Date().toISOString(),
          title: payload.title ?? ''
        });
      } catch {
        /* ignore */
      }
    }
    return out;
  }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('omolink_drafts', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('listing_drafts')) d.createObjectStore('listing_drafts');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction('listing_drafts', 'readonly');
    const store = tx.objectStore('listing_drafts');
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => {
      const keys = keysReq.result as IDBValidKey[];
      const vals = valsReq.result as Array<{ payload?: Record<string, unknown>; pending?: boolean }>;
      resolve(
        keys.map((k, i) => {
          const key = String(k);
          const parts = key.split('::');
          const payload = vals[i]?.payload ?? {};
          return {
            key,
            producerId: parts[0] ?? 'unknown',
            listingId: parts[1] && parts[1] !== 'new' ? parts[1] : null,
            updatedAt: new Date().toISOString(),
            title: typeof payload.title === 'string' ? payload.title : ''
          };
        })
      );
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAllDrafts() {
  if (typeof indexedDB !== 'undefined') {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('omolink_drafts', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('listing_drafts')) d.createObjectStore('listing_drafts');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('listing_drafts', 'readwrite');
      tx.objectStore('listing_drafts').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith('omolink_draft_')) toRemove.push(k);
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));
}
