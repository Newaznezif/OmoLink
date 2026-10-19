'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { LANGUAGE_COOKIE, LANGUAGE_COOKIE_MAX_AGE, isLanguageCode } from './language';

/**
 * Stores the display preference in a cookie so the next server render picks it
 * up, then revalidates the layout so the current page re-renders in the new
 * language without a full reload. A forged value is rejected here rather than
 * trusted downstream.
 */
export async function saveLanguagePreference(input: { language: unknown }): Promise<{ ok: boolean }> {
  if (!isLanguageCode(input.language)) return { ok: false };

  cookies().set(LANGUAGE_COOKIE, input.language, {
    // The current value is handed to the dropdown by the server render, so no
    // script needs to read the cookie back.
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: LANGUAGE_COOKIE_MAX_AGE
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}
