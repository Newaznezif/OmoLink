'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './ui';

export function PublishListingButton({ listingId, published }: { listingId: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published })
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={toggle}>
      {busy ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
    </Button>
  );
}

export function ToggleAvailabilityButton({ listingId, current }: { listingId: string; current: 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next: 'available' | 'unavailable' = current === 'unavailable' ? 'available' : 'unavailable';
  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next })
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={toggle}>
      {busy ? 'Saving…' : next === 'available' ? 'Mark available' : 'Mark unavailable'}
    </Button>
  );
}
