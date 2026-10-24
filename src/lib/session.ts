import { cookies } from 'next/headers';
import { getT } from './i18n/server';
import { getRepo } from './repo';
import { isDemoMode } from './store';
import { supabaseServer } from './supabase/server';
import type { AccountKind, AccountStatus, Profile, Role } from './types';

export const SESSION_COOKIE = 'omolink_demo_session';
export type DemoSession = { userId: string };

/**
 * Who is acting, in whichever mode the app is running.
 *
 * demo:     the signed-in demo account, resolved from the session cookie to the
 *           stored profile. The cookie only carries a user id — the role and the
 *           account status are read back from the profile, so a cookie cannot
 *           invent a privilege. It is not authentication: forging it lets the
 *           holder act as that sample account, which is acceptable only because
 *           demo mode holds throwaway sample data and nothing else.
 * supabase: the Supabase Auth user, with role and status read from their profile
 *           row.
 *
 * In Supabase mode Row Level Security evaluates auth.uid() in Postgres, so this
 * value decides what the UI offers, not what the database allows. In demo mode
 * the repository is the only enforcement point, which is why every privileged
 * repository method re-checks the actor itself.
 */
export type Actor = {
  userId: string;
  profileId: string;
  role: Role;
  accountKind: AccountKind;
  status: AccountStatus;
};

const ROLES: Role[] = ['buyer', 'producer', 'coordinator', 'admin'];
const ACCOUNT_KINDS: AccountKind[] = [
  'tourist',
  'individual_buyer',
  'business_buyer',
  'producer',
  'group_or_cooperative',
  'platform_admin'
];

export async function getSessionActor(): Promise<Actor | undefined> {
  if (isDemoMode()) {
    const session = getSession();
    if (!session) return undefined;
    const profile = await getRepo().getProfileByUserId(session.userId);
    if (!profile) return undefined;
    return toActor(profile, session.userId);
  }

  const client = supabaseServer();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return undefined;

  const { data: row, error } = await client
    .from('profiles')
    .select('id, role, account_kind, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return undefined;
  const raw = row as { id: string; role: string; account_kind: string | null; status: string | null };
  const accountKind = ACCOUNT_KINDS.includes(raw.account_kind as AccountKind)
    ? (raw.account_kind as AccountKind)
    : 'individual_buyer';
  return {
    userId: user.id,
    profileId: raw.id,
    role: ROLES.includes(raw.role as Role) ? (raw.role as Role) : 'buyer',
    accountKind,
    status: raw.status === 'suspended' ? 'suspended' : 'active'
  };
}

function toActor(profile: Profile, userId: string): Actor {
  return {
    userId,
    profileId: profile.id,
    role: profile.role,
    accountKind: profile.accountKind,
    status: profile.status
  };
}

export async function getSessionProfile(): Promise<Profile | undefined> {
  const actor = await getSessionActor();
  if (!actor) return undefined;
  return (await getRepo().getProfile(actor.profileId)) ?? undefined;
}

export function getSession(): DemoSession | undefined {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as DemoSession;
    if (typeof parsed.userId !== 'string' || !parsed.userId) return undefined;
    return { userId: parsed.userId };
  } catch {
    return undefined;
  }
}

export function writeSession(session: DemoSession) {
  if (!isDemoMode()) throw new Error(getT()('auth.demoSessionModeOnly'));
  cookies().set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Where a sign-in is allowed to send someone afterwards. Only same-site relative
 * paths under the account areas are accepted, so ?next= cannot be turned into an
 * open redirect to another host.
 */
export function safeNext(value: string | undefined | null): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  if (!value.startsWith('/dashboard') && !value.startsWith('/admin') && !value.startsWith('/buyer')) return undefined;
  return value;
}

/**
 * The area a role owns, used after sign-in and registration. A buyer is never
 * dropped on the selling dashboard, and an administrator lands on the controls.
 */
export function landingFor(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'buyer') return '/buyer';
  return '/dashboard';
}

/**
 * Server-side authorization for route handlers and server components. A
 * suspended account is rejected even when it still holds a valid session
 * cookie, because the role and status are re-read on every request.
 */
export async function requireRole(role: Role | Role[]): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) throw new AuthorizationError(getT()('auth.signInToContinue'), 401);
  if (actor.status === 'suspended') {
    throw new AuthorizationError(getT()('auth.accountSuspendedContact'), 403);
  }
  const required = Array.isArray(role) ? role : [role];
  if (!required.includes(actor.role)) {
    throw new AuthorizationError(getT()('auth.notPermitted'), 403);
  }
  return actor;
}

/** Anyone with an account, suspended or not — used by pages that must show the suspension notice. */
export async function requireSignedIn(): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) throw new AuthorizationError(getT()('auth.signInToContinue'), 401);
  return actor;
}

/**
 * Turns a failed requireRole()/requireSignedIn() call into the response a route
 * handler should send, keeping the honest status code instead of flattening
 * every refusal into a 400.
 */
export function authErrorResponse(err: unknown, fallback: string): { body: { error: string }; status: 401 | 403 } {
  if (err instanceof AuthorizationError) return { body: { error: err.message }, status: err.status };
  return { body: { error: fallback }, status: 401 };
}
