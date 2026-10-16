import { cookies } from 'next/headers';
import { getRepo } from './repo';
import type { Profile, Role } from './types';

export const SESSION_COOKIE = 'omolink_demo_session';
export type DemoSession = { userId: string; role: Role };

export async function getSessionProfile(): Promise<Profile | undefined> {
  const session = getSession();
  if (!session) return undefined;
  return (await getRepo().getProfileByUserId(session.userId)) ?? undefined;
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

export function requireRole(role: Role | Role[]): DemoSession {
  const session = getSession();
  if (!session) throw new Error('Not signed in.');
  const required = Array.isArray(role) ? role : [role];
  if (!required.includes(session.role)) throw new Error('Not authorised for this action.');
  return session;
}
