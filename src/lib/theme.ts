import { SUPPORTED_THEMES, type ThemePreference } from './types';

/**
 * The colour scheme, in the same shape as the interface language: a *display*
 * preference kept in a cookie, so a server render can paint the page in it before
 * the browser runs any script. That is what makes the choice change the colours
 * rather than only the button, and why it survives a reload, a sign-out or a
 * visit to a page the browser has never opened.
 *
 * It is not account data and carries no personal information, so it is not
 * http-only in the way a session cookie is — but it is still not trusted: every
 * read goes through `safeThemePreference`, because the value is
 * attacker-editable and it decides a class name written into the document.
 */
export const THEME_COOKIE = 'omonettab_theme';
/** As long as the language preference: a choice is not expired out from under the user. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_THEME: ThemePreference = 'light';

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (SUPPORTED_THEMES as readonly string[]).includes(value);
}

export function safeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME;
}

/**
 * The cookie attributes, in one place: the value decides a class name written on
 * `<html>` by a server render, so it is only ever read back through
 * `safeThemePreference`, and it is not a place to put anything personal.
 */
export function themeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE
  };
}

/**
 * The class written on `<html>`. Both values are written explicitly so the
 * stylesheet never has to guess what "no theme" means, and so a saved light
 * choice beats a dark system setting instead of silently following the device.
 */
export function themeHtmlClass(theme: ThemePreference): string {
  return theme === 'dark' ? 'theme-dark' : 'theme-light';
}

export type ThemeOption = {
  value: ThemePreference;
  /** Dictionary key for the control's label. */
  labelKey: 'settings.themeLight' | 'settings.themeDark';
};

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' }
];

/**
 * The theme a signed-in account's own record asks for, or the one already chosen
 * on this device. An account preference wins: signing in on a second browser
 * should bring the saved choice along with it.
 */
export function resolveTheme(input: { accountTheme: unknown; deviceTheme: unknown }): ThemePreference {
  if (isThemePreference(input.accountTheme)) return input.accountTheme;
  return safeThemePreference(input.deviceTheme);
}
