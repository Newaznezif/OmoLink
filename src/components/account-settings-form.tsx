'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from './ui';
import { LANGUAGE_OPTIONS } from '@/lib/language';
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

/** The same four fields mean different things to each side of a sale. */
const COPY = {
  buyer: {
    details: 'Your details',
    name: 'Name you want people to see',
    nameHint: 'Sellers receive this on an inquiry.',
    area: 'Where you usually are',
    areaHint: 'Helps a seller judge pickup or meeting point.',
    bio: 'A note about what you are looking for',
    bioHint: 'Optional here, but sellers see it when you inquire. 20 characters minimum.',
    contact: 'How sellers reach you',
    in_app: 'Only through the platform inquiry form',
    phone: 'Add my phone number to each inquiry I send',
    email: 'Add my email address to each inquiry I send',
    none: 'Do not share a direct contact detail'
  },
  seller: {
    details: 'How you appear to buyers',
    name: 'Display name',
    nameHint: 'Shown on your public seller page and on every listing.',
    area: 'Where buyers can collect or meet you',
    areaHint: 'Shown beside your listings so pickup expectations are clear.',
    bio: 'About your work',
    bioHint: 'Shown on your public seller page. 20 characters minimum. No identity documents are ever stored here.',
    contact: 'How buyers reach you',
    in_app: 'Only through the inquiry form on my listings',
    phone: 'Publish my phone number on my listings',
    email: 'Publish my email address on my listings',
    none: 'Do not publish a direct contact detail'
  }
} as const;

export function AccountSettingsForm({ profile, variant }: { profile: Profile; variant: 'buyer' | 'seller' }) {
  const copy = COPY[variant];
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
          <h2 className="font-semibold text-ink-900">{copy.details}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={copy.name} htmlFor="displayName" hint={copy.nameHint}>
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
            <Field label={copy.area} htmlFor="operatingArea" hint={copy.areaHint}>
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
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.english} ({option.native})
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-ink-500">
                Every offered language can be saved as your preference. Pages state plainly which ones still have no
                reviewed wording instead of pretending support exists.
              </p>
            </Field>
          </div>
          <Field label={copy.bio} htmlFor="shortBio" hint={copy.bioHint}>
            <Textarea id="shortBio" value={draft.shortBio} maxLength={1200} onChange={(e) => set('shortBio', e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-semibold text-ink-900">{copy.contact}</h2>
          <div className="space-y-2 text-sm">
            {(
              [
                ['in_app', copy.in_app],
                ['phone', copy.phone],
                ['email', copy.email],
                ['none', copy.none]
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
                  I agree that this contact detail is shared with the other side of each arrangement. It is not published
                  anywhere else.
                </span>
              </label>
            </>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm text-moss-700' : 'text-sm text-red-700'}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
