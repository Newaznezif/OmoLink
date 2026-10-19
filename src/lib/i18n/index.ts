import type { LanguageCode } from '../types';
import { en, type TranslationKey, type TranslationSet } from './en';
import { zhHans } from './zh-Hans';
import { it } from './it';
import { am, amReviewPending } from './am';

export type { TranslationKey, TranslationSet } from './en';

/**
 * One dictionary per offered language. `en` is the contract: Chinese (Simplified)
 * and Italian are typed as full `TranslationSet`s, so the compiler refuses a
 * missing key and "complete" is a checked fact rather than a claim. Amharic is a
 * declared draft, and Hamer, Dasenech and Tsamai are intentionally empty because
 * no verified translation exists — see the README for how to contribute one.
 */
export const translations: Record<LanguageCode, Partial<TranslationSet>> = {
  en,
  'zh-Hans': zhHans,
  it,
  am,
  hamer: {},
  dag: {},
  tsamai: {}
};

export type Vars = Record<string, string | number>;

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

/**
 * Keys are looked up in the requested language and fall back to English when the
 * dictionary has nothing for them. Callers must not present a fallback as a
 * translation; `languageStatus` and the coverage numbers are what the UI reports.
 */
export function t(lang: LanguageCode, key: TranslationKey, vars?: Vars): string {
  const value = translations[lang]?.[key] ?? translations.en[key];
  if (value === undefined) return key;
  return fill(value, vars);
}

export type Translator = (key: TranslationKey, vars?: Vars) => string;

export function makeTranslator(lang: LanguageCode): Translator {
  return (key, vars) => t(lang, key, vars);
}

export type LanguageCoverage = {
  translated: number;
  total: number;
  ratio: number;
  /** Whether the dictionary can be presented as reviewed wording. */
  reviewPending: boolean;
};

/**
 * Dictionaries that carry wording for every key but were drafted with machine
 * help. No fluent speaker has checked them, so the UI must say so: coverage is a
 * fact the compiler proves, quality is not. Amharic is deliberately incomplete
 * and is flagged in `./am.ts` as well.
 */
export const REVIEW_PENDING_LANGUAGES: LanguageCode[] = ['zh-Hans', 'it', 'am'];

export function coverageFor(lang: LanguageCode): LanguageCoverage {
  const dictionary = translations[lang];
  const total = Object.keys(en).length;
  // A deliberately empty value (e.g. the suffix for a complete language, which
  // needs no words) is a translation that says "nothing"; it is not a gap.
  const translated = Object.keys(dictionary).filter(
    (key) => typeof dictionary[key as TranslationKey] === 'string'
  ).length;
  return {
    translated: lang === 'en' ? total : translated,
    total,
    ratio: total === 0 ? 0 : lang === 'en' ? 1 : translated / total,
    reviewPending: lang !== 'en' && (translated < total || REVIEW_PENDING_LANGUAGES.includes(lang) || amReviewPending)
  };
}

export type LanguageStatus = 'complete' | 'partial' | 'not_available';

/**
 * What the interface can honestly claim about a language right now, from key
 * coverage alone. Whether the wording is *reviewed* is a separate fact, carried
 * by `coverageFor(lang).reviewPending`.
 */
export function languageStatus(lang: LanguageCode): LanguageStatus {
  const { translated, total } = coverageFor(lang);
  if (translated === 0) return 'not_available';
  if (translated === total) return 'complete';
  return 'partial';
}

/** The selector suffix for a language: coverage first, then review state. */
export function languageSuffixKey(lang: LanguageCode): TranslationKey {
  const status = languageStatus(lang);
  if (status === 'not_available') return 'language.suffix.none';
  if (status === 'partial') return 'language.suffix.draft';
  return coverageFor(lang).reviewPending ? 'language.suffix.unreviewed' : 'language.suffix.complete';
}
