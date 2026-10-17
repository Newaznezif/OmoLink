'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from './ui';
import type { ContactMethod, Profile } from '@/lib/types';

type Draft = {
  displayName: string;
  community: string;
  operatingArea: string;
  shortBio: string;
  preferredLanguage: string;
  contactKind: 'in_app' | 'none' | 'phone' | 'email';
  contactValue: string;
  consent: boolean;
};

function draftFrom(profile: Profile): Draft {
  return {
    displayName: profile.displayName,
    community: profile.community,
    operatingArea: profile.operatingArea,
    shortBio: profile.shortBio,
    preferredLanguage: profile.preferredLanguage,
    contactKind: profile.contactMethod.kind,
    contactValue: 'value' in profile.contactMethod ? profile.contactMethod.value : '',
    consent: 'consent' in profile.contactMethod ? profile.contactMethod.consent : false
  };
}

export function BuyerSettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    setBusy(true);
    setMessage(null);
    const contactMethod: ContactMethod =
      draft.contactKind === 'phone' || draft.contactKind === 'email'
        ? { kind: draft.contactKind, value: draft.contactValue, consent: draft.consent }
        : { kind: draft.contactKind };
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: draft.displayName,
          community: draft.community,
          operatingArea: draft.operatingArea,
          shortBio: draft.shortBio,
          preferredLanguage: draft.preferredLanguage,
          contactMethod
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Could not save.');
      setMessage({ ok: true, text: 'Saved.' });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  const wantsValue = draft.contactKind === 'phone' || draft.contactKind === 'email';

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-semibold text-ink-900">Your details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Name you want people to see" htmlFor="displayName" hint="Sellers receive this on an inquiry.">
              <Input
                id="displayName"
                value={draft.displayName}
                maxLength={120}
                onChange={(e) => set('displayName', e.target.value)}
              />
            </Field>
            <Field label="Community or town" htmlFor="community">
              <Input id="community" value={draft.community} maxLength={120} onChange={(e) => set('community', e.target.value)} />
            </Field>
            <Field label="Where you usually are" htmlFor="operatingArea" hint="Helps a seller judge pickup or meeting point.">
              <Input
                id="operatingArea"
                value={draft.operatingArea}
                maxLength={160}
                onChange={(e) => set('operatingArea', e.target.value)}
              />
            </Field>
            <Field label="Interface language" htmlFor="preferredLanguage">
              <Select
                id="preferredLanguage"
                value={draft.preferredLanguage}
                onChange={(e) => set('preferredLanguage', e.target.value)}
              >
                <option value="en">English</option>
                <option value="am" disabled>
                  Amharic — copy not reviewed yet
                </option>
                <option value="hamer" disabled>
                  Hamer — no reviewed translation
                </option>
                <option value="dag" disabled>
                  Dasenech — no reviewed translation
                </option>
                <option value="tsamai" disabled>
                  Tsamai — no reviewed translation
                </option>
              </Select>
              <p className="mt-1 text-xs text-ink-500">
                Only options with reviewed wording can be offered. The others are listed so the gap is visible instead of
                pretending support exists.
              </p>
            </Field>
          </div>
          <Field
            label="A note about what you are looking for"
            htmlFor="shortBio"
            hint="Optional here, but sellers see it when you inquire. 20 characters minimum."
          >
            <Textarea id="shortBio" value={draft.shortBio} maxLength={1200} onChange={(e) => set('shortBio', e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-semibold text-ink-900">How sellers reach you</h2>
          <div className="space-y-2 text-sm">
            {(
              [
                ['in_app', 'Only through the platform inquiry form'],
                ['phone', 'Add my phone number to each inquiry I send'],
                ['email', 'Add my email address to each inquiry I send'],
                ['none', 'Do not share a direct contact detail']
              ] as const
            ).map(([kind, label]) => (
              <label key={kind} htmlFor={`contact-${kind}`} className="flex items-start gap-2">
                <input
                  id={`contact-${kind}`}
                  name="contactKind"
                  type="radio"
                  value={kind}
                  checked={draft.contactKind === kind}
                  onChange={() => set('contactKind', kind)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-ink-700">{label}</span>
              </label>
            ))}
          </div>

          {wantsValue && (
            <>
              <Field label={draft.contactKind === 'email' ? 'Email address' : 'Phone number'} htmlFor="contactValue">
                <Input
                  id="contactValue"
                  value={draft.contactValue}
                  maxLength={120}
                  inputMode={draft.contactKind === 'email' ? 'email' : 'tel'}
                  onChange={(e) => set('contactValue', e.target.value)}
                />
              </Field>
              <label htmlFor="consent" className="flex items-start gap-2 text-sm text-ink-700">
                <input
                  id="consent"
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(e) => set('consent', e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I agree that this contact detail is shared with the seller on each inquiry I send. It is not published
                  on any public page.
                </span>
              </label>
            </>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </Button>
        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-moss-700' : 'text-red-700'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
