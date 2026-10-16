'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './ui';

export function SaveProfileButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: (document.getElementById('displayName') as HTMLInputElement | null)?.value,
          community: (document.getElementById('community') as HTMLInputElement | null)?.value,
          operatingArea: (document.getElementById('operatingArea') as HTMLInputElement | null)?.value,
          shortBio: (document.getElementById('shortBio') as HTMLTextAreaElement | null)?.value
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Could not save.');
      setMessage('Saved.');
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3">
      <Button type="button" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </Button>
      {message && (
        <span className="text-sm text-ink-700" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
