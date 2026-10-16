import { cookies } from 'next/headers';
import { getRepo } from './repo';
import { isDemoMode } from './store';
import { supabaseServer } from './supabase/server';
import type { Profile, Role } from './types';

export const SESSION_COOKIE = 'omolink_demo_session';
export type DemoSession = { userId: string; role: Role };

/**
 * Who is acting, in whichever mode the app is running.
 *
 * demo:     the signed-in demo account, read from the session cookie.
 * supabase: the Supabase Auth user, with the role read from their profile row.
 *
 * The role is always resolved on the server. In Supabase mode nothing a client
 * can write grants access — Row Level Security evaluates auth.uid() instead, so
 * this value only decides what the UI offers, not what the database allows.
 */
export type Actor = { userId: string; profileId: string; role: Role };

export async function getSessionActor(): Promise<Actor | undefined> {
  if (isDemoMode()) {
    const session = getSession();
    if (!session) return undefined;
    const profile = await getRepo().getProfileByUserId(session.userId);
    if (!profile) return undefined;
    return { userId: session.userId, profileId: profile.id, role: session.role };
  }

  const client = supabaseServer();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return undefined;

  const { data: row, error } = await client.from('profiles').select('id, role').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return undefined;
  const profile = row as { id: string; role: Role };
  return { userId: user.id, profileId: profile.id, role: profile.role };
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
    if (typeof parsed.userId !== 'string' || typeof parsed.role !== 'string') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeSession(session: DemoSession) {
  if (!isDemoMode()) throw new Error('Demo sessions are only valid in demo mode.');
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

export async function requireRole(role: Role | Role[]): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) throw new Error('Not signed in.');
  const required = Array.isArray(role) ? role : [role];
  if (!required.includes(actor.role)) throw new Error('Not authorised for this action.');
  return actor;
}
