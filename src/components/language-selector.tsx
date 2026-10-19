'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLanguagePreference } from '@/lib/language-actions';
import { LANGUAGE_OPTIONS } from '@/lib/language';
import { coverageFor, languageStatus, languageSuffixKey, t } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

const STATUS_NOTE: Record<ReturnType<typeof languageStatus>, string> = {
  complete: 'translation covers every interface string',
  partial: 'only part of the interface is translated',
  not_available: 'no translation yet'
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
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700">
      <span className="sr-only">{t(value, 'common.interfaceLanguage')}</span>
      <span aria-hidden>🌐</span>
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
        className="border border-ink-100 rounded-lg px-2 py-1.5 bg-white min-h-9 text-sm disabled:opacity-60"
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const status = languageStatus(option.code);
          const suffix = t(value, languageSuffixKey(option.code));
          const reviewed = coverageFor(option.code).reviewPending ? ', wording not yet reviewed by a speaker' : '';
          const note = `${option.english}: ${STATUS_NOTE[status]}${reviewed}`;
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
