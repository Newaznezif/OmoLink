import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_OPTIONS,
  isThemePreference,
  resolveTheme,
  safeThemePreference,
  themeCookieOptions,
  themeHtmlClass
} from '../src/lib/theme';
import { SUPPORTED_THEMES } from '../src/lib/types';
import { mapProfile, profileToRow } from '../src/lib/supabase/mappers';
import type { ProfileRow } from '../src/lib/supabase/rows';
import { en, type TranslationKey } from '../src/lib/i18n/en';
import { zhHans } from '../src/lib/i18n/zh-Hans';
import { it } from '../src/lib/i18n/it';
import type { Profile } from '../src/lib/types';

/**
 * The value that ends up as a class name on `<html>` comes from a cookie, and a
 * cookie is edited by whoever holds the browser. So the first job of these tests is
 * that an unknown value cannot become markup: it becomes the default instead.
 */
test('only the two supported schemes are accepted', () => {
  assert.deepEqual(SUPPORTED_THEMES, ['light', 'dark']);
  assert.equal(isThemePreference('dark'), true);
  assert.equal(isThemePreference('light'), true);
  assert.equal(isThemePreference('green'), false);
  assert.equal(isThemePreference(''), false);
  assert.equal(isThemePreference(undefined), false);
  assert.equal(isThemePreference(null), false);
  assert.equal(isThemePreference(0), false);
});

test('a forged cookie value becomes the default, never a class name', () => {
  for (const forged of ['theme-dark', '"><script>alert(1)</script>', 'light dark', 'DARK', ' dark', '\n', 'toString', '__proto__']) {
    assert.equal(safeThemePreference(forged), DEFAULT_THEME, `${forged} should not be accepted`);
  }
  assert.equal(safeThemePreference('dark'), 'dark');
});

test('both schemes are written explicitly, so no page is unstyled by default', () => {
  assert.equal(themeHtmlClass('light'), 'theme-light');
  assert.equal(themeHtmlClass('dark'), 'theme-dark');
  // Only ever one class, and only ever one of the two known names.
  const produced = new Set(SUPPORTED_THEMES.map(themeHtmlClass));
  assert.deepEqual([...produced].sort(), ['theme-dark', 'theme-light']);
  for (const name of produced) {
    assert.match(name, /^theme-(light|dark)$/);
    assert.doesNotMatch(name, /[\s<>"']/);
  }
});

test('the account choice beats the browser choice', () => {
  assert.equal(resolveTheme({ accountTheme: 'dark', deviceTheme: 'light' }), 'dark');
  assert.equal(resolveTheme({ accountTheme: 'light', deviceTheme: 'dark' }), 'light');
  // An account that never chose keeps this browser's answer — it is not a reset.
  assert.equal(resolveTheme({ accountTheme: undefined, deviceTheme: 'dark' }), 'dark');
  assert.equal(resolveTheme({ accountTheme: 'sideways', deviceTheme: 'dark' }), 'dark');
  assert.equal(resolveTheme({ accountTheme: undefined, deviceTheme: 'sideways' }), DEFAULT_THEME);
});

test('the preference cookie is scoped to the whole site and lasts a year', () => {
  const options = themeCookieOptions();
  assert.equal(THEME_COOKIE, 'omonettab_theme');
  assert.equal(options.path, '/');
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.httpOnly, true);
  assert.equal(options.maxAge, THEME_COOKIE_MAX_AGE);
  assert.equal(THEME_COOKIE_MAX_AGE, 60 * 60 * 24 * 365);
});

test('the control offers exactly the two schemes, each with a label that exists', () => {
  assert.deepEqual(
    THEME_OPTIONS.map((o) => o.value),
    ['light', 'dark']
  );
  for (const option of THEME_OPTIONS) {
    assert.ok(option.labelKey in en, `${option.labelKey} is missing from the English contract`);
    assert.ok(option.labelKey in zhHans, `${option.labelKey} is missing from zh-Hans`);
    assert.ok(option.labelKey in it, `${option.labelKey} is missing from Italian`);
    for (const key of ['settings.theme', 'settings.themeIntro', 'settings.themeSaved', 'settings.themeFailed'] as TranslationKey[]) {
      assert.ok(key in en, `${key} is missing from the English contract`);
    }
    // The three save outcomes say different things, so they must not be one string.
    assert.notEqual(en['settings.themeSaved'], en['settings.themeSavedDevice']);
    assert.notEqual(en['settings.themeSavedDevice'], en['settings.themeSavedAccountFailed']);
    assert.notEqual(en['settings.themeSaved'], en['settings.themeSavedAccountFailed']);
  }
});

const baseRow: ProfileRow = {
  id: 'prof-1',
  user_id: 'user-1',
  display_name: 'Danesh Woven Goods',
  producer_type: 'artisan',
  account_kind: 'producer',
  status: 'active',
  organization_name: null,
  community: 'Jinka',
  operating_area: 'South Omo Zone',
  preferred_language: 'en',
  contact_method: { kind: 'in_app' },
  short_bio: 'Woven baskets and textiles.',
  categories: [],
  image_url: null,
  consent_to_publish: true,
  verification: 'pending_review',
  verification_note: null,
  role: 'producer',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z'
};

test('a row without the theme column reads as no saved choice', () => {
  const profile = mapProfile(baseRow);
  assert.equal(profile.theme, undefined);
});

test('a stored value that is not a scheme is not trusted', () => {
  assert.equal(mapProfile({ ...baseRow, theme: 'midnight' }).theme, undefined);
  assert.equal(mapProfile({ ...baseRow, theme: null }).theme, undefined);
  assert.equal(mapProfile({ ...baseRow, theme: 'dark' }).theme, 'dark');
});

test('the theme is written only when the account actually chose one', () => {
  const profile = mapProfile(baseRow);
  assert.equal('theme' in profileToRow(profile), false, 'a database without migration 0007 must still accept this write');

  const chosen: Profile = { ...profile, theme: 'dark' };
  assert.equal(profileToRow(chosen).theme, 'dark');
  // Round trip: what is written is what comes back.
  assert.equal(mapProfile({ ...baseRow, theme: 'dark' }).theme, chosen.theme);
});
