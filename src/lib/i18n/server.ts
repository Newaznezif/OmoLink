import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, documentLangFor, safeLanguageCode } from '../language';
import type { LanguageCode } from '../types';
import { makeTranslator, type Translator } from './index';

export { documentLangFor };

/**
 * The language the interface is rendering in right now.
 *
 * Reading a cookie normally makes a route dynamic, which is fine: every
 * data-bearing page in this app already declares `force-dynamic`. The prerendered
 * 404 page is the exception, and there the cookie is not available — falling back
 * to English keeps it rendering instead of failing the build.
 */
export function getLanguage(): LanguageCode {
  try {
    return safeLanguageCode(cookies().get(LANGUAGE_COOKIE)?.value);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function getT(): Translator {
  return makeTranslator(getLanguage());
}
