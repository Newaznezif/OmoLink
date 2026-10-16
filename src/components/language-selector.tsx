'use client';

import { useEffect, useState } from 'react';
import type { LanguageCode } from '@/lib/types';

const options: { code: LanguageCode; label: string; disabled: boolean; note?: string }[] = [
  { code: 'en', label: 'English', disabled: false },
  { code: 'am', label: 'አማርኛ (Amharic)', disabled: true, note: 'Partial — awaiting review by competent speakers.' },
  { code: 'hamer', label: 'Hamer', disabled: true, note: 'No verified translation yet.' },
  { code: 'dag', label: 'Dasenech', disabled: true, note: 'No verified translation yet.' },
  { code: 'tsamai', label: 'Tsamai', disabled: true, note: 'No verified translation yet.' }
];

export function LanguageSelector() {
  const [value, setValue] = useState<LanguageCode>('en');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && window.localStorage.getItem('omolink_lang')) as LanguageCode | null;
    if (stored) setValue(stored);
    document.documentElement.lang = stored ?? 'en';
  }, []);

  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700">
      <span className="sr-only">Interface language</span>
      <span aria-hidden>🌐</span>
      <select
        value={value}
        onChange={(e) => {
          const code = e.target.value as LanguageCode;
          setValue(code);
          window.localStorage.setItem('omolink_lang', code);
          document.documentElement.lang = code;
        }}
        className="border border-ink-100 rounded-lg px-2 py-1.5 bg-white min-h-9 text-sm"
      >
        {options.map((o) => (
          <option key={o.code} value={o.code} disabled={o.disabled} title={o.note}>
            {o.label}
            {o.disabled ? ' — not available' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
