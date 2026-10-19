import { SUPPORTED_LANGUAGES, type LanguageCode } from './types';

/**
 * The interface language is a *display* preference, not account data. It lives in
 * a cookie so server components can read it while rendering, which is what makes
 * choosing a language actually change the page instead of only changing the
 * dropdown. It is not a secret and carries no personal information.
 */
export const LANGUAGE_COOKIE = 'omonettab_lang';
/** Preference survives a year of visits; the app never expires it out from under the user. */
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** The cookie is attacker-controllable, so anything unknown falls back to English. */
export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function safeLanguageCode(value: unknown): LanguageCode {
  return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

export type LanguageOption = {
  code: LanguageCode;
  /** Name in English, for the gap list in the README and for screen-reader context. */
  english: string;
  /** Name written in that language, shown in the dropdown. */
  native: string;
  /**
   * Value for `document.documentElement.lang`. The three languages without a
   * verified code have no dictionary at all, so their pages are rendered in
   * English and must be announced as English — a guessed BCP 47 tag would be a
   * lie to assistive technology.
   */
  documentLang: string;
  /** None of the offered languages is right-to-left; Amharic (Ge'ez script) is LTR. */
  rtl: boolean;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', english: 'English', native: 'English', documentLang: 'en', rtl: false },
  { code: 'am', english: 'Amharic', native: 'አማርኛ', documentLang: 'am', rtl: false },
  { code: 'zh-Hans', english: 'Chinese (Simplified)', native: '简体中文', documentLang: 'zh-Hans', rtl: false },
  { code: 'it', english: 'Italian', native: 'Italiano', documentLang: 'it', rtl: false },
  { code: 'hamer', english: 'Hamer', native: 'Hamer', documentLang: 'en', rtl: false },
  { code: 'dag', english: 'Dasenech', native: 'Dasenech', documentLang: 'en', rtl: false },
  { code: 'tsamai', english: 'Tsamai', native: 'Tsamai', documentLang: 'en', rtl: false }
];

const BY_CODE = new Map<LanguageCode, LanguageOption>(LANGUAGE_OPTIONS.map((o) => [o.code, o]));

export function languageOption(code: LanguageCode): LanguageOption {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LANGUAGE)!;
}

export function documentLangFor(code: LanguageCode): string {
  return languageOption(code).documentLang;
}
