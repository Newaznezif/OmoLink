import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDataMode, readSupabaseConfig, requireSupabaseConfig } from '../src/lib/supabase/config';

const URL_ENV = 'https://abcd1234.supabase.co';

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
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined
    },
    () => {
      assert.equal(readSupabaseConfig(), null);
      assert.throws(() => requireSupabaseConfig(), /Refusing to run against demo data/);
    }
  );
});

test('half-configured Supabase is rejected, with either key name', () => {
  const neitherKey = {
    NEXT_PUBLIC_SUPABASE_URL: URL_ENV,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined
  };
  withEnv(neitherKey, () => assert.throws(() => readSupabaseConfig(), /half-configured/));
  withEnv({ ...neitherKey, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' , NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' }, () =>
    assert.throws(() => readSupabaseConfig(), /half-configured/)
  );
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
    },
    () => assert.throws(() => readSupabaseConfig(), /half-configured/)
  );
});

test('a non-Supabase URL is rejected before any request is made', () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://evil.example.com',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined
    },
    () => assert.throws(() => readSupabaseConfig(), /does not look like a Supabase project URL/)
  );
});

test('the older anon key still works', () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: URL_ENV,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined
    },
    () => assert.deepEqual(requireSupabaseConfig(), { url: URL_ENV, publicKey: 'anon-key' })
  );
});

test('the publishable key is accepted on its own', () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: URL_ENV,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
    },
    () => assert.deepEqual(readSupabaseConfig(), { url: URL_ENV, publicKey: 'publishable-key' })
  );
});

test('when both key names are set, the publishable one wins', () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: URL_ENV,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
    },
    () => assert.equal(readSupabaseConfig()?.publicKey, 'publishable-key')
  );
});
