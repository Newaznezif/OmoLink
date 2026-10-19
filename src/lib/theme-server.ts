import { cookies } from 'next/headers';
import { DEFAULT_THEME, THEME_COOKIE, isThemePreference, safeThemePreference, themeCookieOptions } from './theme';
import type { ThemePreference } from './types';

/**
 * The theme this page is being painted in right now.
 *
 * Reading the cookie makes a render dynamic, which this app already accepts: every
 * data-bearing page declares `force-dynamic`, and the statically prerendered 404
 * has no cookie to read, so it falls back to the default rather than failing the
 * build.
 */
export function getTheme(): ThemePreference {
  try {
    return safeThemePreference(cookies().get(THEME_COOKIE)?.value);
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Hands an account's saved scheme to the browser when that account signs in, so
 * the choice follows the person to a new device instead of staying behind on the
 * one where it was made.
 *
 * A profile with no stored theme writes nothing: absence of a choice is not a
 * request to reset the browser to light, and whatever scheme the visitor is
 * already looking at is kept.
 */
export function restoreThemeFromAccount(accountTheme: unknown): ThemePreference | undefined {
  if (!isThemePreference(accountTheme)) return undefined;
  cookies().set(THEME_COOKIE, accountTheme, themeCookieOptions());
  return accountTheme;
}
