'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getRepo } from './repo';
import { getSessionProfile } from './session';
import { THEME_COOKIE, isThemePreference, themeCookieOptions } from './theme';
import type { ThemePreference } from './types';

export type ThemeSaveResult = {
  ok: boolean;
  /**
   * Where the choice now lives: `account` (also written to the signed-in profile,
   * so another browser gets it back after signing in), `device` (nobody is signed
   * in, so only this browser remembers it), `account_failed` (signed in, but the
   * profile write was refused by the store), or `null` when the value was refused.
   */
  savedTo: 'account' | 'device' | 'account_failed' | null;
};

/**
 * Applies a colour scheme: the cookie decides what the next server render paints,
 * and a signed-in account also gets the choice saved on its own record so signing
 * in somewhere else brings it back.
 *
 * The three outcomes are reported apart on purpose. The stored copy needs the
 * `theme` column of migration 0007, which is provided for review and has not been
 * applied to any live database. Where that column is missing, an account write
 * fails, and the honest answer is "this browser only" rather than a silent
 * failure or a claim nobody can verify.
 */
export async function saveThemePreference(input: { theme: unknown }): Promise<ThemeSaveResult> {
  if (!isThemePreference(input.theme)) return { ok: false, savedTo: null };
  const theme: ThemePreference = input.theme;

  // The class on <html> comes from this cookie on the next server render, so no
  // script has to read it back.
  cookies().set(THEME_COOKIE, theme, themeCookieOptions());

  const profile = await getSessionProfile();
  let savedTo: ThemeSaveResult['savedTo'] = 'device';
  if (profile) {
    try {
      await getRepo().upsertProfile({ ...profile, theme, updatedAt: new Date().toISOString() });
      savedTo = 'account';
    } catch {
      // The cookie is still set, so this browser keeps the choice even though the
      // account could not be updated.
      savedTo = 'account_failed';
    }
  }

  revalidatePath('/', 'layout');
  return { ok: true, savedTo };
}
