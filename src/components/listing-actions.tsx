'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t, type TranslationKey } from '@/lib/i18n';
import { Button } from './ui';
import type { AvailabilityStatus, LanguageCode, Listing } from '@/lib/types';

type State = { busy: boolean; message: { ok: boolean; text: string } | null };

/**
 * One row of lifecycle controls per listing. Every action reports what the
 * server actually said, so a failed publish is never mistaken for a silent
 * success — and delete is offered only when no inquiry record depends on the
 * listing, which is the repository's own rule restated in the UI.
 */
export function ListingLifecycleActions({
  lang,
  listing,
  inquiryCount
}: {
  lang: LanguageCode;
  listing: Listing;
  inquiryCount: number;
}) {
  const router = useRouter();
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const [{ busy, message }, setState] = useState<State>({ busy: false, message: null });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nextAvailability: AvailabilityStatus = listing.availability === 'unavailable' ? 'available' : 'unavailable';

  async function run(action: () => Promise<Response>, successText: string, refresh = true) {
    setState({ busy: true, message: null });
    try {
      const res = await action();
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState({ busy: false, message: { ok: false, text: json?.error ?? tr('listingActions.couldNot', { action: successText, status: res.status }) } });
        return;
      }
      setState({ busy: false, message: { ok: true, text: successText } });
      if (refresh) router.refresh();
    } catch {
      setState({ busy: false, message: { ok: false, text: tr('listingActions.network') } });
    }
  }

  const patch = (body: Record<string, unknown>) =>
    () =>
      fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() =>
            run(
              patch({ published: !listing.published }),
              listing.published ? tr('listingActions.hidden') : listing.archived ? tr('listingActions.restored') : tr('listingActions.published')
            )
          }
        >
          {busy ? tr('listingActions.saving') : listing.published ? tr('listingActions.unpublish') : tr('listingActions.publish')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            run(
              patch({ availability: nextAvailability }),
              nextAvailability === 'available' ? tr('listingActions.markedAvailable') : tr('listingActions.markedUnavailable')
            )
          }
        >
          {busy ? tr('listingActions.saving') : nextAvailability === 'available' ? tr('listingActions.markAvailable') : tr('listingActions.markUnavailable')}
        </Button>

        {!listing.archived && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(patch({ archived: true }), tr('listingActions.archived'), true)
            }
          >
            {busy ? tr('listingActions.saving') : tr('listingActions.archive')}
          </Button>
        )}

        {inquiryCount === 0 ? (
          confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2 py-1">
              <span className="text-xs text-red-800">{tr('listingActions.deleteConfirm', { title: listing.title })}</span>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => fetch(`/api/listings/${listing.id}`, { method: 'DELETE' }),
                    tr('listingActions.deleted'),
                    false
                  )
                }
              >
                {busy ? tr('listingActions.deleting') : tr('listingActions.yesDelete')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {tr('listingActions.keepIt')}
              </Button>
            </span>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
              {tr('listingActions.delete')}
            </Button>
          )
        ) : (
          <span className="text-xs text-ink-500 self-center">
            {tr('listingActions.cannotDelete', { count: inquiryCount })}
          </span>
        )}
      </div>

      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={`mt-2 text-sm ${message.ok ? 'text-moss-700' : 'text-red-700'}`}
        >
          {message.text}
        </p>
      )}

      {listing.archived && (
        <p className="mt-2 text-xs text-ink-500">
          {tr('listingActions.archivedNote')}
        </p>
      )}
    </div>
  );
}
