import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { isLanguageCode } from '@/lib/language';
import { isThemePreference } from '@/lib/theme';
import { getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n';
import { type ContactMethod, type LanguageCode, type Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Profile edits for the signed-in account. The starting point is always the
 * stored profile, and only these fields can be overwritten — so role, account
 * status, verification and the account id cannot be set from a request body.
 */
export async function PATCH(req: Request) {
  const t = getT();
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: t('apiProfile.notSignedIn') }, { status: 401 });
  if (profile.status === 'suspended') {
    return NextResponse.json({ error: t('apiProfile.accountSuspended') }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clean = (key: string, max: number): string | undefined => {
    if (typeof body[key] !== 'string') return undefined;
    const value = (body[key] as string).trim();
    if (!value) return '';
    return value.length > max ? undefined : value;
  };

  const next: Profile = { ...profile };

  for (const [field, max] of [
    ['displayName', 120],
    ['community', 120],
    ['operatingArea', 160],
    ['shortBio', 1200]
  ] as const) {
    const value = clean(field, max);
    if (value === undefined) continue;
    if (field === 'shortBio' && value.length < 20) {
      return NextResponse.json({ error: t('apiProfile.bioTooShort', { min: 20 }) }, { status: 400 });
    }
    if (field !== 'shortBio' && value.length < 2) {
      return NextResponse.json({ error: t('apiProfile.fieldTooShort', { field }) }, { status: 400 });
    }
    next[field] = value;
  }

  if (typeof body.preferredLanguage === 'string') {
    if (!isLanguageCode(body.preferredLanguage)) {
      return NextResponse.json({ error: t('apiProfile.languageNotOffered') }, { status: 400 });
    }
    // Storing the preference is safe for every offered language: the interface
    // itself says out loud which languages have no reviewed wording yet.
    next.preferredLanguage = body.preferredLanguage;
  }

  if (body.theme !== undefined) {
    if (!isThemePreference(body.theme)) {
      return NextResponse.json({ error: t('apiProfile.themeNotOffered') }, { status: 400 });
    }
    next.theme = body.theme;
  }

  const method = readContactMethod(t, body.contactMethod);
  if ('error' in method) return NextResponse.json({ error: method.error }, { status: 400 });
  if (method.value) next.contactMethod = method.value;

  next.updatedAt = new Date().toISOString();
  const saved = await getRepo().upsertProfile(next);
  return NextResponse.json({ profile: saved });
}

/** Contact is only published with the account holder's own consent tick. */
function readContactMethod(t: Translator, input: unknown): { value?: ContactMethod } | { error: string } {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object') return { error: t('apiProfile.contactShape') };
  const raw = input as Record<string, unknown>;
  const kind = raw.kind;
  if (kind === 'none' || kind === 'in_app') return { value: { kind } };
  if (kind !== 'phone' && kind !== 'email') return { error: t('apiProfile.contactChoose') };
  const value = typeof raw.value === 'string' ? raw.value.trim() : '';
  if (!value) return { error: t('apiProfile.contactValueMissing') };
  if (value.length > 120) return { error: t('apiProfile.contactValueTooLong') };
  if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return { error: t('apiProfile.contactEmailInvalid') };
  if (kind === 'phone' && !/^[+0-9][0-9 ()/-]{5,}$/.test(value)) return { error: t('apiProfile.contactPhoneInvalid') };
  if (raw.consent !== true) return { error: t('apiProfile.contactConsentRequired') };
  return { value: { kind, value, consent: true } };
}
