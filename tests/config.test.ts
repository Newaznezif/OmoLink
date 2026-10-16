import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDataMode, readSupabaseConfig, requireSupabaseConfig } from '../src/lib/supabase/config';

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const keys = Object.keys(values);
  const before = keys.map((k) => process.env[k]);
  keys.forEach((k) => {
    const v = values[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
  try {
    run();
  } finally {
    keys.forEach((k, i) => {
      if (before[i] === undefined) delete process.env[k];
      else process.env[k] = before[i];
    });
  }
}

test('DATA_MODE defaults to demo and rejects unknown values', () => {
  withEnv({ DATA_MODE: undefined }, () => assert.equal(getDataMode(), 'demo'));
  withEnv({ DATA_MODE: 'supabase' }, () => assert.equal(getDataMode(), 'supabase'));
  withEnv({ DATA_MODE: 'postgres' }, () => assert.throws(() => getDataMode(), /Invalid DATA_MODE/));
});

test('missing credentials produce an actionable error instead of demo fallback', () => {
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined }, () => {
    assert.equal(readSupabaseConfig(), null);
    assert.throws(() => requireSupabaseConfig(), /Refusing to run against demo data/);
  });
});

test('half-configured Supabase is rejected', () => {
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abcd1234.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }, () => {
    assert.throws(() => readSupabaseConfig(), /half-configured/);
  });
});

test('a non-Supabase URL is rejected before any request is made', () => {
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://evil.example.com', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key' }, () => {
    assert.throws(() => readSupabaseConfig(), /does not look like a Supabase project URL/);
  });
});

test('complete credentials are accepted', () => {
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abcd1234.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' }, () => {
    assert.deepEqual(requireSupabaseConfig(), { url: 'https://abcd1234.supabase.co', anonKey: 'anon-key' });
  });
});
