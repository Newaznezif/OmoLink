'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t, type TranslationKey } from '@/lib/i18n';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from './ui';
import { LANGUAGE_OPTIONS } from '@/lib/language';
import type { ContactMethod, LanguageCode, Profile } from '@/lib/types';

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
type VariantCopy = {
  details: TranslationKey;
  name: TranslationKey;
  nameHint: TranslationKey;
  area: TranslationKey;
  areaHint: TranslationKey;
  bio: TranslationKey;
  bioHint: TranslationKey;
  contact: TranslationKey;
  in_app: TranslationKey;
  phone: TranslationKey;
  email: TranslationKey;
  none: TranslationKey;
};

const COPY: Record<'buyer' | 'seller', VariantCopy> = {
  buyer: {
    details: 'buyerProfile.detailsHeading',
    name: 'register.displayNameBuyer',
    nameHint: 'buyerProfile.nameHint',
    area: 'register.operatingAreaBuyer',
    areaHint: 'buyerProfile.areaHint',
    bio: 'buyerProfile.bioLabel',
    bioHint: 'buyerProfile.bioHint',
    contact: 'buyerProfile.contactHeading',
    in_app: 'buyerProfile.contactOptionInApp',
    phone: 'buyerProfile.contactOptionPhone',
    email: 'buyerProfile.contactOptionEmail',
    none: 'buyerProfile.contactOptionNone'
  },
  seller: {
    details: 'accountSettings.sellerDetailsHeading',
    name: 'accountSettings.sellerNameLabel',
    nameHint: 'accountSettings.sellerNameHint',
    area: 'accountSettings.sellerAreaLabel',
    areaHint: 'accountSettings.sellerAreaHint',
    bio: 'producerProfile.aboutHeading',
    bioHint: 'accountSettings.sellerBioHint',
    contact: 'accountSettings.sellerContactHeading',
    in_app: 'accountSettings.sellerContactInApp',
    phone: 'accountSettings.sellerContactPhone',
    email: 'accountSettings.sellerContactEmail',
    none: 'accountSettings.sellerContactNone'
  }
};

export function AccountSettingsForm({
  profile,
  variant,
  lang
}: {
  profile: Profile;
  variant: 'buyer' | 'seller';
  lang: LanguageCode;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
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
      if (!res.ok) throw new Error(json?.error ?? tr('accountSettings.saveFailed'));
      setMessage({ ok: true, text: tr('accountSettings.savedMessage') });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : tr('listingForm.genericError') });
    } finally {
      setBusy(false);
    }
  }

  const wantsValue = draft.contactKind === 'phone' || draft.contactKind === 'email';

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-semibold text-ink-900">{tr(copy.details)}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={tr(copy.name)} htmlFor="displayName" hint={tr(copy.nameHint)}>
              <Input
                id="displayName"
                value={draft.displayName}
                maxLength={120}
                onChange={(e) => set('displayName', e.target.value)}
              />
            </Field>
            <Field label={tr('register.communityTownLabel')} htmlFor="community">
              <Input id="community" value={draft.community} maxLength={120} onChange={(e) => set('community', e.target.value)} />
            </Field>
            <Field label={tr(copy.area)} htmlFor="operatingArea" hint={tr(copy.areaHint)}>
              <Input
                id="operatingArea"
                value={draft.operatingArea}
                maxLength={160}
                onChange={(e) => set('operatingArea', e.target.value)}
              />
            </Field>
            <Field label={tr('common.interfaceLanguage')} htmlFor="preferredLanguage">
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
              <p className="mt-1 text-xs text-ink-500">{tr('accountSettings.languageNote')}</p>
            </Field>
          </div>
          <Field label={tr(copy.bio)} htmlFor="shortBio" hint={tr(copy.bioHint)}>
            <Textarea id="shortBio" value={draft.shortBio} maxLength={1200} onChange={(e) => set('shortBio', e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-semibold text-ink-900">{tr(copy.contact)}</h2>
          <div className="space-y-2 text-sm">
            {(
              [
                ['in_app', tr(copy.in_app)],
                ['phone', tr(copy.phone)],
                ['email', tr(copy.email)],
                ['none', tr(copy.none)]
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
              <Field
                label={draft.contactKind === 'email' ? tr('auth.emailAddressLabel') : tr('accountSettings.phoneLabel')}
                htmlFor="contactValue"
              >
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
                <span>{tr('accountSettings.consentCheckbox')}</span>
              </label>
            </>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? tr('listingForm.saving') : tr('listingForm.saveChanges')}
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
