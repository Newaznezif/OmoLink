'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t, type TranslationKey } from '@/lib/i18n';
import { Badge, Button, Card, CardBody, Field, Input } from './ui';
import type { LanguageCode, Listing, ListingImage } from '@/lib/types';

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
export function ListingImages({ lang, listing }: { lang: LanguageCode; listing: Listing }) {
  const router = useRouter();
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
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
        setMessage({ ok: false, text: json?.error ?? tr('listingImages.refused', { status: res.status }) });
        return;
      }
      setMessage({ ok: true, text: successText });
      setDraft(emptyDraft);
      router.refresh();
    } catch {
      setMessage({ ok: false, text: tr('listingImages.network') });
    } finally {
      setBusy(false);
    }
  }

  const add = () => {
    save(
      [...toPayload(listing.images), { src: draft.src.trim(), alt: draft.alt.trim(), caption: draft.caption.trim(), consentRecorded: true }],
      tr('listingImages.added')
    );
  };

  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">{tr('listingImages.heading')}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {tr('listingImages.countLine', { count: listing.images.length, max: 6 })}
        </p>

        {listing.images.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500 rounded-lg border border-ink-100 bg-white p-3">
            {tr('listingImages.emptyNote')}
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
                    {img.isSample && <Badge tone="warning">{tr('listingImages.sampleBadge')}</Badge>}
                    {!img.consentRecorded && <Badge tone="danger">{tr('listingImages.consentBadge')}</Badge>}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => save(toPayload(listing.images.filter((i) => i.id !== img.id)), tr('listingImages.removed'))}
                >
                  {busy ? tr('listingImages.saving') : tr('listingImages.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {listing.images.length < 6 && (
          <div className="mt-4 rounded-lg border border-ink-100 bg-white p-3 space-y-2">
            <Field
              label={tr('listingImages.srcLabel')}
              htmlFor={`img-src-${listing.id}`}
              hint={tr('listingImages.srcHint')}
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
              label={tr('listingImages.altLabel')}
              htmlFor={`img-alt-${listing.id}`}
              hint={tr('listingImages.altHint')}
            >
              <Input
                id={`img-alt-${listing.id}`}
                value={draft.alt}
                onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
                placeholder={tr('listingImages.altPlaceholder')}
              />
            </Field>
            <Field label={tr('listingImages.captionLabel')} htmlFor={`img-caption-${listing.id}`}>
              <Input
                id={`img-caption-${listing.id}`}
                value={draft.caption}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                placeholder={tr('listingImages.captionPlaceholder')}
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
                {tr('listingImages.consentStatement')}
              </span>
            </label>
            <Button type="button" size="sm" disabled={busy || !/^https?:\/\/\S+$/i.test(draft.src) || draft.alt.trim().length < 3 || !draft.consent} onClick={add}>
              {busy ? tr('listingImages.saving') : tr('listingImages.add')}
            </Button>
          </div>
        )}

        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={`mt-3 text-sm ${message.ok ? 'text-moss-700' : 'text-red-700'}`}>
            {message.text}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-500">
          {tr('listingImages.consentNote')}
        </p>
      </CardBody>
    </Card>
  );
}
