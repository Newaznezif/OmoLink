'use client';

import { useState } from 'react';
import { Button, Field, Input } from './ui';

export function CredentialsForm({ submitPath, submitLabel }: { submitPath: string; submitLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(submitPath, { method: 'POST', body: form });
      if (res.ok) {
        window.location.assign('/dashboard');
        return;
      }
      const json = await res.json().catch(() => ({}));
      setError(json?.error ?? 'Sign in failed.');
    } catch {
      setError('Network problem — sign in needs a connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" required hint="Minimum 6 characters.">
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : submitLabel}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
