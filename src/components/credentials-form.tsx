'use client';

import { useState } from 'react';
import type { LanguageCode } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Button, Field, Input } from './ui';

export function CredentialsForm({
  lang,
  submitPath,
  submitLabel,
  next
}: {
  lang: LanguageCode;
  submitPath: string;
  submitLabel: string;
  next?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    // The server re-checks this value with safeNext(); it is a hint, not trusted.
    if (next) form.set('next', next);
    try {
      const res = await fetch(submitPath, { method: 'POST', body: form });
      if (res.ok) {
        window.location.assign(next ?? '/dashboard');
        return;
      }
      const json = await res.json().catch(() => ({}));
      setError(json?.error ?? t(lang, 'auth.signInFailed'));
    } catch {
      setError(t(lang, 'auth.networkProblem'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label={t(lang, 'auth.email')} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t(lang, 'auth.password')} htmlFor="password" required hint={t(lang, 'auth.passwordHint')}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? t(lang, 'auth.signingIn') : submitLabel}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
