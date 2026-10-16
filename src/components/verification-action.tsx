'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Textarea } from './ui';

export function VerificationAction({ profileId, reviewerProfileId }: { profileId: string; reviewerProfileId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<null | 'approved' | 'rejected' | 'needs_more_info'>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(decision: 'approved' | 'rejected' | 'needs_more_info') {
    if (!reason.trim()) {
      setMessage('A reason must be recorded with every decision.');
      return;
    }
    setBusy(decision);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, reviewerProfileId, decision, reason })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Failed to record decision.');
      setMessage('Simulated decision recorded.');
      setReason('');
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Field label="Recorded reason" htmlFor={`reason-${profileId}`} required hint="Approvals and rejections must both carry a reason.">
        <Textarea id={`reason-${profileId}`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => submit('approved')} disabled={busy !== null}>
          {busy === 'approved' ? 'Recording…' : 'Simulate approval'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => submit('needs_more_info')} disabled={busy !== null}>
          {busy === 'needs_more_info' ? 'Recording…' : 'Request more info'}
        </Button>
        <Button size="sm" variant="danger" onClick={() => submit('rejected')} disabled={busy !== null}>
          {busy === 'rejected' ? 'Recording…' : 'Simulate rejection'}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-ink-700">{message}</p>}
    </div>
  );
}
