'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Select, Textarea } from './ui';

const RATINGS = [
  { v: '5', label: '5 — exactly as described, would buy again' },
  { v: '4', label: '4 — good, small issue' },
  { v: '3', label: '3 — acceptable' },
  { v: '2', label: '2 — problems worth knowing' },
  { v: '1', label: '1 — did not arrive or was not as described' }
];

export function ReviewForm({
  listingId,
  inquiryId,
  listingTitle
}: {
  listingId: string;
  inquiryId: string;
  listingTitle: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (comment.trim().length < 4) {
      setMessage({ ok: false, text: 'Add a few words so the review is useful to the next buyer.' });
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
      if (!res.ok) throw new Error(json?.error ?? 'Could not save the review.');
      setMessage({ ok: true, text: 'Review saved and shown on the listing. Thank you — it is tied to the arrangement you completed.' });
      setComment('');
      router.refresh();
    } catch (err: unknown) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label={`Rating for ${listingTitle}`} htmlFor="review-rating" hint="One review per arrangement.">
        <Select id="review-rating" name="rating" value={rating} onChange={(e) => setRating(e.target.value)}>
          {RATINGS.map((r) => (
            <option key={r.v} value={r.v}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="What happened"
        htmlFor="review-comment"
        hint="Quantity, quality, whether the pickup or the guide went as agreed. No phone numbers or addresses — they are published to every visitor."
      >
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
          {busy ? 'Saving…' : 'Post review'}
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
