'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, CardBody, Field, Input } from './ui';
import type { Listing, ListingImage } from '@/lib/types';

type Draft = { src: string; alt: string; caption: string; consent: boolean };

const emptyDraft: Draft = { src: '', alt: '', caption: '', consent: false };

/** The wire form the PATCH route expects. An id means "keep this one as stored". */
type Payload = { id?: string; src: string; alt: string; caption: string; consentRecorded: boolean };

function toPayload(images: ListingImage[]): Payload[] {
  return images.map((img) => ({ id: img.id, src: img.src, alt: img.alt, caption: img.caption, consentRecorded: img.consentRecorded }));
}

/**
 * Picture management for one listing. There is deliberately no file picker:
 * this build has no object storage configured, so a listing points at a picture
 * that is already hosted somewhere else. Every save replaces the whole set and
 * reports the server's own answer, so a rejected image never looks like it stuck.
 */
export function ListingImages({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(next: Payload[], successText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: next })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: json?.error ?? `The server refused this change (status ${res.status}).` });
        return;
      }
      setMessage({ ok: true, text: successText });
      setDraft(emptyDraft);
      router.refresh();
    } catch {
      setMessage({ ok: false, text: 'Network problem: nothing was changed. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  const add = () => {
    save(
      [...toPayload(listing.images), { src: draft.src.trim(), alt: draft.alt.trim(), caption: draft.caption.trim(), consentRecorded: true }],
      'Picture added. Buyers see it on the listing page.'
    );
  };

  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">Pictures</h2>
        <p className="mt-1 text-sm text-ink-500">
          {listing.images.length} of 6 picture(s) attached. This build stores a web address for each picture and does not
          upload files — there is no storage service configured yet, so a picture must already be hosted somewhere you
          may link to.
        </p>

        {listing.images.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500 rounded-lg border border-ink-100 bg-white p-3">
            No picture is attached, so the listing page shows its title only.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {listing.images.map((img) => (
              <li key={img.id} className="flex flex-wrap items-start gap-3">
                <img src={img.src} alt={img.alt} className="w-24 h-24 rounded-lg object-cover border border-ink-100" />
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm text-ink-900 font-medium">{img.alt}</p>
                  {img.caption && <p className="mt-1 text-xs text-ink-500">{img.caption}</p>}
                  <p className="mt-1 text-xs break-all text-ink-500">{img.src}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {img.isSample && <Badge tone="warning">Sample placeholder</Badge>}
                    {!img.consentRecorded && <Badge tone="danger">Consent not recorded</Badge>}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => save(toPayload(listing.images.filter((i) => i.id !== img.id)), 'Picture removed from the listing.')}
                >
                  {busy ? 'Saving…' : 'Remove'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {listing.images.length < 6 && (
          <div className="mt-4 rounded-lg border border-ink-100 bg-white p-3 space-y-2">
            <Field
              label="Picture web address"
              htmlFor={`img-src-${listing.id}`}
              hint="A full https:// address of a picture you may publish."
            >
              <Input
                id={`img-src-${listing.id}`}
                value={draft.src}
                onChange={(e) => setDraft({ ...draft, src: e.target.value })}
                placeholder="https://…"
                inputMode="url"
              />
            </Field>
            <Field
              label="Description for readers who cannot see it"
              htmlFor={`img-alt-${listing.id}`}
              hint="Say what the picture shows, so the page still makes sense without sight of it."
            >
              <Input
                id={`img-alt-${listing.id}`}
                value={draft.alt}
                onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
                placeholder="Woven basket set on a market table"
              />
            </Field>
            <Field label="Caption (optional)" htmlFor={`img-caption-${listing.id}`}>
              <Input
                id={`img-caption-${listing.id}`}
                value={draft.caption}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                placeholder="Shown at the Saturday market in Key Afer"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.consent}
                onChange={(e) => setDraft({ ...draft, consent: e.target.checked })}
              />
              <span>
                I may publish this picture. If it shows a person, a ceremony or cultural property, the people concerned
                agreed to it being shown.
              </span>
            </label>
            <Button type="button" size="sm" disabled={busy || !/^https?:\/\/\S+$/i.test(draft.src) || draft.alt.trim().length < 3 || !draft.consent} onClick={add}>
              {busy ? 'Saving…' : 'Add picture'}
            </Button>
          </div>
        )}

        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={`mt-3 text-sm ${message.ok ? 'text-moss-700' : 'text-red-700'}`}>
            {message.text}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-500">
          The consent statement is recorded on this listing; nobody has verified it. An administrator can hide a listing
          whose pictures are contested.
        </p>
      </CardBody>
    </Card>
  );
}
