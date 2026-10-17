'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './ui';
import type { AvailabilityStatus, Listing } from '@/lib/types';

type State = { busy: boolean; message: { ok: boolean; text: string } | null };

/**
 * One row of lifecycle controls per listing. Every action reports what the
 * server actually said, so a failed publish is never mistaken for a silent
 * success — and delete is offered only when no inquiry record depends on the
 * listing, which is the repository's own rule restated in the UI.
 */
export function ListingLifecycleActions({
  listing,
  inquiryCount
}: {
  listing: Listing;
  inquiryCount: number;
}) {
  const router = useRouter();
  const [{ busy, message }, setState] = useState<State>({ busy: false, message: null });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nextAvailability: AvailabilityStatus = listing.availability === 'unavailable' ? 'available' : 'unavailable';

  async function run(action: () => Promise<Response>, successText: string, refresh = true) {
    setState({ busy: true, message: null });
    try {
      const res = await action();
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState({ busy: false, message: { ok: false, text: json?.error ?? `Could not ${successText} (status ${res.status}).` } });
        return;
      }
      setState({ busy: false, message: { ok: true, text: successText } });
      if (refresh) router.refresh();
    } catch {
      setState({ busy: false, message: { ok: false, text: 'Network problem: nothing was changed. Try again.' } });
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
              listing.published ? 'Listing hidden from the marketplace.' : listing.archived ? 'Listing published again and restored from the archive.' : 'Listing published: buyers can find it now.'
            )
          }
        >
          {busy ? 'Saving…' : listing.published ? 'Unpublish' : 'Publish'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            run(
              patch({ availability: nextAvailability }),
              nextAvailability === 'available' ? 'Marked available.' : 'Marked unavailable: buyers can still read the page but cannot order.'
            )
          }
        >
          {busy ? 'Saving…' : nextAvailability === 'available' ? 'Mark available' : 'Mark unavailable'}
        </Button>

        {!listing.archived && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(patch({ archived: true }), 'Listing archived. Its inquiry history is kept, so the record is still correct for both sides.', true)
            }
          >
            {busy ? 'Saving…' : 'Archive'}
          </Button>
        )}

        {inquiryCount === 0 ? (
          confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2 py-1">
              <span className="text-xs text-red-800">Delete “{listing.title}” permanently? Nothing can recover it.</span>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => fetch(`/api/listings/${listing.id}`, { method: 'DELETE' }),
                    'Listing deleted. No inquiry record pointed at it.',
                    false
                  )
                }
              >
                {busy ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </span>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )
        ) : (
          <span className="text-xs text-ink-500 self-center">
            Cannot delete: {inquiryCount} inquiry record(s) depend on this listing. Archive it instead.
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
          Archived: hidden from the marketplace and from search. Publishing again brings it back with the same history.
        </p>
      )}
    </div>
  );
}
