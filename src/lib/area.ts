import { redirect } from 'next/navigation';
import { getSessionActor, type Actor } from './session';
import type { Role } from './types';

/**
 * Gate for a whole route area (dashboard / buyer / admin).
 *
 * Signed out -> sign-in page, remembering where they were headed.
 * Signed in with the wrong role -> an honest access-denied page rather than a
 * redirect loop back through sign-in.
 *
 * This is convenience and clarity only. Each page and each repository method
 * checks the actor again, and in Supabase mode Row Level Security decides what
 * the database returns regardless of this function.
 */
export async function requireArea(path: string, roles: Role[]): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  if (!roles.includes(actor.role)) redirect('/access-denied');
  return actor;
}
