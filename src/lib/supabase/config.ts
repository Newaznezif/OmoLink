/**
 * Supabase runtime configuration.
 *
 * Rules enforced here:
 *  - DATA_MODE=supabase without real credentials is a hard failure. It never
 *    falls back to demo data, because silently showing demo records while the
 *    UI claims a live database would be dishonest.
 *  - The public key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or its older name
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY) is the only key the application ever uses. It
 *    is public by design and safe only because Row Level Security gates the data.
 *  - SUPABASE_SERVICE_ROLE_KEY is deliberately not read anywhere in this
 *    codebase. A service-role key bypasses RLS, and a single accidental import
 *    would leak it to the browser.
 *  - These checks run when the Supabase client is built, which is per request, not
 *    when the process starts: a misconfigured deployment boots cleanly and then
 *    fails on the first page that reads data.
 */

export type DataMode = 'demo' | 'supabase';

export type SupabaseConfig = {
  url: string;
  /**
   * The public, RLS-subject key. Supabase renamed the "anon" key to
   * "publishable" for newer projects, and a project holds one name or the other,
   * so both are accepted and carried here under one accurate field.
   */
  publicKey: string;
};

export function getDataMode(): DataMode {
  const mode = process.env.DATA_MODE ?? 'demo';
  if (mode === 'demo' || mode === 'supabase') return mode;
  throw new Error(`Invalid DATA_MODE "${mode}". Use "demo" or "supabase".`);
}

/** The newer publishable key name wins when a deployment sets both. */
function readPublicKey(): string {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (publishable) return publishable;
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = readPublicKey();
  if (!url && !publicKey) return null;
  if (!url || !publicKey) {
    throw new Error(
      'Supabase is half-configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        '(or the older NEXT_PUBLIC_SUPABASE_ANON_KEY) must both be set.'
    );
  }
  if (!/^https:\/\/.+\.supabase\.(co|in|net)/.test(url)) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL: ${url}`);
  }
  return { url, publicKey };
}

/** True only when the app is meant to run against a real database and the credentials are present. */
export function isSupabaseMode(): boolean {
  return getDataMode() === 'supabase';
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error(
      'DATA_MODE=supabase is set but no Supabase credentials are configured. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local, ' +
        'or set DATA_MODE=demo. Refusing to run against demo data while claiming a live database.'
    );
  }
  return config;
}
