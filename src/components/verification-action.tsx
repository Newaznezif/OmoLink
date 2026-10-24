'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Textarea } from './ui';
import { t } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

export function VerificationAction({ lang, profileId, sampleRecords }: { lang: LanguageCode; profileId: string; sampleRecords: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<null | 'approved' | 'rejected' | 'needs_more_info'>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(decision: 'approved' | 'rejected' | 'needs_more_info') {
    if (!reason.trim()) {
      setMessage(t(lang, 'verificationAdmin.reasonRequired'));
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
      if (!res.ok) throw new Error(json?.error ?? t(lang, 'verificationAdmin.saveFailed'));
      setMessage(sampleRecords ? t(lang, 'verificationAdmin.recordedSample') : t(lang, 'verificationAdmin.recordedProfile'));
      setReason('');
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t(lang, 'report.generic'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Field label={t(lang, 'verificationAdmin.reasonLabel')} htmlFor={`reason-${profileId}`} required hint={t(lang, 'verificationAdmin.reasonHint')}>
        <Textarea id={`reason-${profileId}`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => submit('approved')} disabled={busy !== null}>
          {busy === 'approved' ? t(lang, 'arrangement.recording') : t(lang, 'verificationAdmin.approve')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => submit('needs_more_info')} disabled={busy !== null}>
          {busy === 'needs_more_info' ? t(lang, 'arrangement.recording') : t(lang, 'verificationAdmin.requestMoreInfo')}
        </Button>
        <Button size="sm" variant="danger" onClick={() => submit('rejected')} disabled={busy !== null}>
          {busy === 'rejected' ? t(lang, 'arrangement.recording') : t(lang, 'verificationAdmin.reject')}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-ink-700">{message}</p>}
    </div>
  );
}
