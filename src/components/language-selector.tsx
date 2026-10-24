'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLanguagePreference } from '@/lib/language-actions';
import { LANGUAGE_OPTIONS } from '@/lib/language';
import { coverageFor, languageStatus, languageSuffixKey, t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

const STATUS_NOTE_KEY: Record<ReturnType<typeof languageStatus>, TranslationKey> = {
  complete: 'language.note.complete',
  partial: 'language.note.partial',
  not_available: 'language.note.none'
};

/**
 * Choosing a language writes a cookie and re-renders the server components, so
 * the page itself changes instead of only the dropdown. The value comes from the
 * server render, which is what keeps the control and the page in agreement after
 * a navigation or a reload.
 */
export function LanguageSelector({ value }: { value: LanguageCode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (

    /* A native select sizes itself to its longest option, which is wider than a
       320px header row, so it is capped and truncated rather than allowed to
       push the row sideways. The full wording stays in the option list. */
    <label className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs font-semibold text-ink-700">
      <span className="sr-only">{t(value, 'common.interfaceLanguage')}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const language = event.target.value as LanguageCode;
          startTransition(async () => {
            const result = await saveLanguagePreference({ language });
            if (!result.ok) return;
            router.refresh();
          });
        }}
        className="min-w-0 max-w-full truncate border border-ink-100 rounded-lg px-2 py-2 bg-white min-h-11 text-sm disabled:opacity-60"
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const status = languageStatus(option.code);
          const suffix = t(value, languageSuffixKey(option.code));
          const reviewed = coverageFor(option.code).reviewPending ? t(value, 'language.note.unreviewedWording') : '';
          const note = `${option.english}: ${t(value, STATUS_NOTE_KEY[status])}${reviewed}`;
          return (
            <option key={option.code} value={option.code} title={note}>
              {option.native}
              {suffix}
            </option>
          );
        })}
      </select>
    </label>
  );
}
