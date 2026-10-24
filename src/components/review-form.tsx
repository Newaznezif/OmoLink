'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { Button, Field, Select, Textarea } from './ui';

const RATING_KEYS: { v: string; label: TranslationKey }[] = [
  { v: '5', label: 'reviewForm.score5' },
  { v: '4', label: 'reviewForm.score4' },
  { v: '3', label: 'reviewForm.score3' },
  { v: '2', label: 'reviewForm.score2' },
  { v: '1', label: 'reviewForm.score1' }
];

export function ReviewForm({
  lang,
  listingId,
  inquiryId,
  listingTitle
}: {
  lang: LanguageCode;
  listingId: string;
  inquiryId: string;
  listingTitle: string;
}) {
  const router = useRouter();
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (comment.trim().length < 4) {
      setMessage({ ok: false, text: tr('reviewForm.errorTooShort') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, inquiryId, rating: Number(rating), comment })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? tr('reviewForm.saveFailed'));
      setMessage({ ok: true, text: tr('reviewForm.saved') });
      setComment('');
      router.refresh();
    } catch (err: unknown) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : tr('report.generic') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label={tr('reviewForm.ratingLabel', { name: listingTitle })} htmlFor="review-rating" hint={tr('reviewForm.ratingHint')}>
        <Select id="review-rating" name="rating" value={rating} onChange={(e) => setRating(e.target.value)}>
          {RATING_KEYS.map((r) => (
            <option key={r.v} value={r.v}>
              {tr(r.label)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={tr('reviewForm.commentLabel')} htmlFor="review-comment" hint={tr('reviewForm.commentHint')}>
        <Textarea
          id="review-comment"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1200}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submit} disabled={busy}>
          {busy ? tr('reviewForm.saving') : tr('reviewForm.submit')}
        </Button>
        {message && (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={`text-sm ${message.ok ? 'text-moss-700' : 'text-red-700'}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
