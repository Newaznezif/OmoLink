'use client';

import { useState } from 'react';
import type { LanguageCode } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Button, Field, Input, Textarea } from './ui';

export function ReportListingButton({ listingId, lang }: { listingId: string; lang: LanguageCode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || !name.trim() || !contact.trim()) {
      setResult(t(lang, 'report.incomplete'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, reason: reason.trim(), reporterName: name.trim(), reporterContact: contact.trim() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? t(lang, 'report.failed'));
      setResult(t(lang, 'report.received'));
      setOpen(false);
      setReason('');
      setName('');
      setContact('');
    } catch (err: unknown) {
      setResult(err instanceof Error ? err.message : t(lang, 'report.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-ink-100 rounded-2xl card-shadow p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">{t(lang, 'report.title')}</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="report-panel">
          {open ? t(lang, 'report.hide') : t(lang, 'report.open')}
        </Button>
      </div>
      {open && (
        <form id="report-panel" onSubmit={submit} className="mt-3 space-y-3">
          <Field label={t(lang, 'report.reasonLabel')} htmlFor="report-reason" required>
            <Textarea
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(lang, 'report.reasonPlaceholder')}
            />
          </Field>
          <Field label={t(lang, 'report.nameLabel')} htmlFor="report-name" required>
            <Input id="report-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t(lang, 'report.contactLabel')} htmlFor="report-contact" required>
            <Input id="report-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" disabled={busy}>
            {busy ? t(lang, 'report.sending') : t(lang, 'report.submit')}
          </Button>
        </form>
      )}
      {result && (
        <p role="status" className="mt-2 text-sm text-ink-700">
          {result}
        </p>
      )}
    </div>
  );
}
