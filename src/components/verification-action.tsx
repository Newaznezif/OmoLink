'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Textarea } from './ui';

export function VerificationAction({ profileId, sampleRecords }: { profileId: string; sampleRecords: boolean }) {
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
        // The reviewer is identified by the session on the server, never here.
        body: JSON.stringify({ profileId, decision, reason })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Failed to record decision.');
      setMessage(sampleRecords ? 'Decision recorded against sample data.' : 'Decision recorded against this profile.');
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
          {busy === 'approved' ? 'Recording…' : 'Approve'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => submit('needs_more_info')} disabled={busy !== null}>
          {busy === 'needs_more_info' ? 'Recording…' : 'Request more info'}
        </Button>
        <Button size="sm" variant="danger" onClick={() => submit('rejected')} disabled={busy !== null}>
          {busy === 'rejected' ? 'Recording…' : 'Reject'}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-ink-700">{message}</p>}
    </div>
  );
}
