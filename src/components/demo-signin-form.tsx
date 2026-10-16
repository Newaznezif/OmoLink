'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody } from './ui';

export function DemoSignInForm({
  producers,
  admin
}: {
  producers: { userId: string; displayName: string; community: string }[];
  admin?: { userId: string; displayName: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(userId: string) {
    setBusy(userId);
    setError(null);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Sign-in failed.');
      router.push(userId.includes('admin') ? '/admin' : '/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Producer accounts</h2>
          <p className="mt-1 text-sm text-ink-700">
            Pick a sample producer to open their dashboard, manage their listings, and respond to inquiries.
          </p>
          <ul className="mt-3 space-y-2">
            {producers.map((p) => (
              <li key={p.userId}>
                <button
                  onClick={() => pick(p.userId)}
                  disabled={busy === p.userId}
                  className="w-full text-left rounded-lg border border-ink-100 p-3 hover:bg-clay-50 disabled:opacity-60"
                >
                  <div className="font-semibold text-ink-900">{p.displayName}</div>
                  <div className="text-xs text-ink-500">{p.community}</div>
                </button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Administrator</h2>
          <p className="mt-1 text-sm text-ink-700">
            Simulated reviewer role. All actions in <em>admin</em> mode are labelled “simulated” in the UI. Do not
            present them as real authorisation decisions.
          </p>
          {admin && (
            <Button className="mt-3" onClick={() => pick(admin.userId)} disabled={busy === admin.userId}>
              {busy === admin.userId ? 'Signing in…' : `Open ${admin.displayName}`}
            </Button>
          )}
          <h3 className="mt-6 font-semibold text-ink-900">Buyer checkout</h3>
          <p className="mt-1 text-sm text-ink-700">
            Buyers do not need an account to submit inquiries. Head back to{' '}
            <a href="/products" className="underline font-semibold">
              products
            </a>{' '}
            or{' '}
            <a href="/tourism" className="underline font-semibold">
              tourism
            </a>{' '}
            and press “Send inquiry”.
          </p>
          {error && (
            <div role="alert" className="mt-3 rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
              {error}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
