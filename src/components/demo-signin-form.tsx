'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from './ui';

type Account = { userId: string; displayName: string; detail?: string };

export function DemoSignInForm({
  selling,
  buyers,
  admins,
  next
}: {
  selling: Account[];
  buyers: Account[];
  admins: Account[];
  next?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(userId: string, destination: string) {
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
      router.push(next ?? destination);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <AccountPicker
          title="Producer and group accounts"
          intro="Open a selling dashboard, publish listings, and answer inquiries."
          accounts={selling}
          destination="/dashboard"
          busy={busy}
          onPick={pick}
        />
        <AccountPicker
          title="Buyer and visitor accounts"
          intro="See the buyer view of inquiries and arrangements. Tourists and customers share the same permissions."
          accounts={buyers}
          destination="/buyer"
          busy={busy}
          onPick={pick}
        />
      </div>
      <AccountPicker
        title="Administrator"
        intro="Reviewer role. In demo mode the sample data is held in memory and the same server-side permission checks apply, so this is the real control surface with fictional records."
        accounts={admins}
        destination="/admin"
        busy={busy}
        onPick={pick}
        compact
      />
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
          {error}
        </div>
      )}
      <p className="text-xs text-ink-500">
        A buyer can also send an inquiry without an account: press “Send inquiry” on any{' '}
        <a href="/products" className="underline font-semibold">
          product
        </a>{' '}
        or{' '}
        <a href="/tourism" className="underline font-semibold">
          tourism
        </a>{' '}
        listing.
      </p>
    </div>
  );
}

function AccountPicker({
  title,
  intro,
  accounts,
  destination,
  busy,
  onPick,
  compact
}: {
  title: string;
  intro: string;
  accounts: Account[];
  destination: string;
  busy: string | null;
  onPick: (userId: string, destination: string) => void;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">{title}</h2>
        <p className="mt-1 text-sm text-ink-700">{intro}</p>
        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No sample account of this kind exists.</p>
        ) : (
          <ul className={compact ? 'mt-3 flex flex-wrap gap-2' : 'mt-3 space-y-2'}>
            {accounts.map((a) => (
              <li key={a.userId}>
                <button
                  onClick={() => onPick(a.userId, destination)}
                  disabled={busy === a.userId}
                  className="text-left rounded-lg border border-ink-100 px-3 py-2 hover:bg-clay-50 disabled:opacity-60"
                >
                  <div className="font-semibold text-ink-900">{a.displayName}</div>
                  {a.detail && <div className="text-xs text-ink-500">{a.detail}</div>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
