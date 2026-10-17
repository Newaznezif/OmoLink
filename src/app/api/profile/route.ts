import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { SUPPORTED_LANGUAGES, type ContactMethod, type LanguageCode, type Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LANGUAGE_CODES = SUPPORTED_LANGUAGES as readonly string[];

/**
 * Profile edits for the signed-in account. The starting point is always the
 * stored profile, and only these fields can be overwritten — so role, account
 * status, verification and the account id cannot be set from a request body.
 */
export async function PATCH(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (profile.status === 'suspended') {
    return NextResponse.json({ error: 'This account is suspended. Contact an administrator.' }, { status: 403 });
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
      return NextResponse.json({ error: 'A short bio needs at least 20 characters.' }, { status: 400 });
    }
    if (field !== 'shortBio' && value.length < 2) {
      return NextResponse.json({ error: `${field} is too short.` }, { status: 400 });
    }
    next[field] = value;
  }

  if (typeof body.preferredLanguage === 'string') {
    if (!LANGUAGE_CODES.includes(body.preferredLanguage)) {
      return NextResponse.json({ error: 'That language is not on the list.' }, { status: 400 });
    }
    if (body.preferredLanguage !== 'en') {
      // Only English copy is reviewed today; claiming otherwise would be false.
      return NextResponse.json(
        { error: 'Only English interface text is ready. Amharic copy is still being reviewed with native speakers.' },
        { status: 400 }
      );
    }
    next.preferredLanguage = body.preferredLanguage as LanguageCode;
  }

  const method = readContactMethod(body.contactMethod);
  if ('error' in method) return NextResponse.json({ error: method.error }, { status: 400 });
  if (method.value) next.contactMethod = method.value;

  next.updatedAt = new Date().toISOString();
  const saved = await getRepo().upsertProfile(next);
  return NextResponse.json({ profile: saved });
}

/** Contact is only published with the account holder's own consent tick. */
function readContactMethod(input: unknown): { value?: ContactMethod } | { error: string } {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object') return { error: 'Contact settings are not shaped correctly.' };
  const raw = input as Record<string, unknown>;
  const kind = raw.kind;
  if (kind === 'none' || kind === 'in_app') return { value: { kind } };
  if (kind !== 'phone' && kind !== 'email') return { error: 'Choose how you want to be contacted.' };
  const value = typeof raw.value === 'string' ? raw.value.trim() : '';
  if (!value) return { error: 'Add the number or address for that contact method.' };
  if (value.length > 120) return { error: 'That contact value is too long.' };
  if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return { error: 'That does not look like an email address.' };
  if (kind === 'phone' && !/^[+0-9][0-9 ()/-]{5,}$/.test(value)) return { error: 'That does not look like a phone number.' };
  if (raw.consent !== true) return { error: 'Tick the consent box before publishing a contact detail.' };
  return { value: { kind, value, consent: true } };
}
