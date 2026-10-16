import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseConfig } from './config';

/**
 * Server-side Supabase client bound to the visitor's auth cookies.
 *
 * It uses the anon key only, so every query is evaluated under Row Level
 * Security as the signed-in user (or as `anon`). There is no service-role path
 * in this codebase by design.
 */
export function supabaseServer(): SupabaseClient {
  const { url, anonKey } = requireSupabaseConfig();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookies().getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          cookies().set(name, value, options);
        }
      }
    }
  });
}

/**
 * Client for operations that must not depend on a cookie jar — currently only
 * the anonymous read path used by server components during static generation.
 * Auth state is disabled so it cannot attempt to write cookies at render time.
 */
export function supabaseAnonServer(): SupabaseClient {
  const { url, anonKey } = requireSupabaseConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
