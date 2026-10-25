import { redirect } from 'next/navigation';
import { enforceAreaLock } from './app-lock/gate';
import { getSessionActor, type Actor } from './session';
import type { Role } from './types';

/**
 * Gate for a whole route area (dashboard / buyer / admin).
 *
 * Signed out -> sign-in page, remembering where they were headed.
 * Signed in with the wrong role -> an honest access-denied page rather than a
 * redirect loop back through sign-in.
 * Signed in with the app lock on and no valid unlock -> the unlock screen, with the
 * same `?next=` they were owed. No page in an account area renders its server-fetched
 * data before that check passes, which is the whole point: an overlay on top of
 * already-rendered content would hide nothing.
 *
 * This is convenience and clarity only. Each page and each repository method
 * checks the actor again, and in Supabase mode Row Level Security decides what
 * the database returns regardless of this function.
 */
export async function requireArea(path: string, roles: Role[]): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  if (!roles.includes(actor.role)) redirect('/access-denied');
  await enforceAreaLock(actor, path);
  return actor;
}
