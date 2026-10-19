'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveThemePreference } from '@/lib/theme-actions';
import { THEME_OPTIONS, themeHtmlClass } from '@/lib/theme';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode, ThemePreference } from '@/lib/types';

/**
 * Which sentence to show depends on where the choice actually ended up, and the
 * three cases say different things to the user, so they are not collapsed into a
 * single "saved" message.
 */
const NOTICE_KEY: Record<'account' | 'device' | 'account_failed', TranslationKey> = {
  account: 'settings.themeSaved',
  device: 'settings.themeSavedDevice',
  account_failed: 'settings.themeSavedAccountFailed'
};

function applyToDocument(theme: ThemePreference) {
  const root = document.documentElement;
  root.classList.remove(themeHtmlClass('light'), themeHtmlClass('dark'));
  root.classList.add(themeHtmlClass(theme));
}

/**
 * The colour scheme control.
 *
 * Two things make it more than a button that changes its own icon: the class on
 * `<html>` is repainted the moment the choice is clicked, and the same choice is
 * written to a cookie so the *next server render* — including a page the browser
 * has never opened — arrives already painted in it. The server render is what
 * makes the choice survive a reload, a sign-out, or a fresh tab.
 */
export function ThemeControl({
  lang,
  value,
  className = 'flex flex-wrap items-center gap-2'
}: {
  lang: LanguageCode;
  value: ThemePreference;
  className?: string;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemePreference>(value);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: ThemePreference) {
    if (pending || next === theme) return;
    applyToDocument(next);
    setTheme(next);
    setNotice(null);
    startTransition(async () => {
      const result = await saveThemePreference({ theme: next });
      if (!result.ok || !result.savedTo) {
        // Nothing was stored, so put the page back the way the server has it.
        applyToDocument(value);
        setTheme(value);
        setNotice(t(lang, 'settings.themeFailed'));
        return;
      }
      setNotice(t(lang, NOTICE_KEY[result.savedTo]));
      // Pulls the new class from the server render so a reload and this view
      // cannot disagree about what the saved choice is.
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <div role="group" aria-label={t(lang, 'settings.theme')} className={className}>
        {THEME_OPTIONS.map((option) => {
          const selected = option.value === theme;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              aria-pressed={selected}
              disabled={pending}
              className={`min-h-9 rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                selected
                  ? 'accent-bg border-transparent'
                  : 'border-ink-100 bg-white text-ink-700 hover:bg-clay-50'
              }`}
            >
              <span aria-hidden>{option.value === 'dark' ? '◐' : '◉'}</span> {t(lang, option.labelKey)}
            </button>
          );
        })}
      </div>
      {notice ? (
        <p role="status" aria-live="polite" className="text-xs text-ink-500">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
