import 'server-only';
/**
 * Reading and writing the lock's durable state.
 *
 * Both tables in migration 0008 are owner-only under Row Level Security, so every
 * call here runs on the signed-in account's own client and can only ever touch that
 * account's rows — a request that names another user id is refused by Postgres, not
 * by this file. The client is a parameter for the same reason the rest of the
 * repository layer takes one: the query shapes can be tested without a database.
 *
 * Demo mode has no such tables and no real session to gate, so `appLockAvailable()`
 * says so and the interface does not offer the feature at all. That is a capability
 * statement, not a hidden button.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemoMode } from '../store';
import { supabaseServer } from '../supabase/server';
import { appLockConfigured } from './envelope';
import {
  DEFAULT_LOCK_SETTINGS,
  clampGrantMinutes,
  clampIdleMinutes,
  clampLabel,
  hasWayBackIn,
  readLockMethod,
  type AppLockSettings,
  type LockMethod
} from './state';

const SETTINGS_TABLE = 'app_lock_settings';
const CREDENTIALS_TABLE = 'webauthn_credentials';

/**
 * Postgres states that name the lock's own objects are missing: no table, or a column
 * the migration is supposed to have added. They are the two the application can answer
 * honestly by saying "this deployment never applied 0008", and they are the only ones
 * allowed to read as *no lock* rather than as a failure.
 */
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', 'PGRST205']);

/**
 * A store read that failed, with the code that says *why*. The code is the whole point:
 * a missing table and a database that timed out are different facts, and treating the
 * second as the first is how a lock quietly stops being enforced.
 */
export class LockStoreError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'LockStoreError';
    this.code = code;
  }

  get schemaMissing(): boolean {
    return typeof this.code === 'string' && MISSING_SCHEMA_CODES.has(this.code);
  }
}

export type LockSettingsRead =
  /** The row, or the defaults when the account has never configured a lock. */
  | { status: 'ok'; settings: AppLockSettings }
  /** Migration 0008 has not been applied here. There is no lock to enforce. */
  | { status: 'absent' }
  /** The read failed for a reason that says nothing about the account's settings. */
  | { status: 'error'; message: string };

export type LockCredential = {
  id: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

/** The feature is only real when there is a database behind it and a secret to sign with. */
export function appLockAvailable(): boolean {
  return !isDemoMode() && appLockConfigured();
}

export function lockClient(): SupabaseClient {
  return supabaseServer();
}

function fail(error: { message?: string; code?: string } | null | undefined): void {
  if (error) throw new LockStoreError(error.message ?? 'lock store read failed', error.code);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * The account's settings, or the defaults when no row exists yet. "Never configured"
 * and "configured off" both read as off, which is the only safe way to treat a
 * missing row — and the row is created on first write, not on first read.
 */
export async function readLockSettings(client: SupabaseClient, userId: string): Promise<AppLockSettings> {
  const [settingsResult, credentialsResult] = await Promise.all([
    client.from(SETTINGS_TABLE).select('*').eq('user_id', userId).maybeSingle(),
    client.from(CREDENTIALS_TABLE).select('id').eq('user_id', userId)
  ]);
  fail(settingsResult.error);
  fail(credentialsResult.error);

  const row = (settingsResult.data ?? null) as Record<string, unknown> | null;
  const credentials = (credentialsResult.data ?? []) as { id: string }[];

  if (!row) {
    return { ...DEFAULT_LOCK_SETTINGS, credentialCount: credentials.length };
  }

  return {
    enabled: row.enabled === true,
    method: readLockMethod(row.method) ?? DEFAULT_LOCK_SETTINGS.method,
    lockOnBackground: row.lock_on_background !== false,
    idleMinutes: clampIdleMinutes(row.idle_minutes),
    grantMinutes: clampGrantMinutes(row.grant_minutes),
    hasPassword: typeof row.password_hash === 'string' && row.password_hash.length > 0,
    credentialCount: credentials.length,
    failedAttempts: Math.max(0, numberOr(row.failed_attempts, 0)),
    lockedUntil: typeof row.locked_until === 'string' ? row.locked_until : null,
    policyChangedAt: typeof row.updated_at === 'string' ? row.updated_at : null
  };
}

/**
 * The same read, classified instead of thrown, because the caller has three different
 * answers to give and only one of them is "no lock".
 *
 * `absent` is the honest one for a deployment that never applied migration 0008: there
 * is no table, so there is no lock to enforce, and the account area stays reachable.
 * `error` is every other failure — a timeout, a refused connection, a query that came
 * back malformed — and it says nothing at all about what the account configured, so no
 * caller may read it as permission. The interface reports it as "could not check", and
 * the gate reports it as closed.
 */
export async function readLockSettingsResult(client: SupabaseClient, userId: string): Promise<LockSettingsRead> {
  try {
    return { status: 'ok', settings: await readLockSettings(client, userId) };
  } catch (err) {
    if (err instanceof LockStoreError && err.schemaMissing) return { status: 'absent' };
    const message = err instanceof Error ? err.message : 'lock store read failed';
    return { status: 'error', message };
  }
}

export type SettingsPatch = {
  enabled?: boolean;
  method?: LockMethod;
  lockOnBackground?: boolean;
  idleMinutes?: number;
  grantMinutes?: number;
};

/**
 * Creates the row on first write. `password_hash` is never part of a patch, so a
 * settings save cannot accidentally blank the password, and cannot smuggle a digest
 * in: only `storeLockPassword` writes that column.
 */
export async function writeLockSettings(client: SupabaseClient, userId: string, patch: SettingsPatch): Promise<AppLockSettings> {
  const current = await readLockSettings(client, userId);
  const next: AppLockSettings = {
    ...current,
    ...patch,
    method: patch.method ?? current.method,
    idleMinutes: patch.idleMinutes !== undefined ? clampIdleMinutes(patch.idleMinutes) : current.idleMinutes,
    grantMinutes: patch.grantMinutes !== undefined ? clampGrantMinutes(patch.grantMinutes) : current.grantMinutes
  };

  const row = {
    user_id: userId,
    enabled: next.enabled,
    method: next.method,
    lock_on_background: next.lockOnBackground,
    idle_minutes: next.idleMinutes,
    grant_minutes: next.grantMinutes,
    updated_at: new Date().toISOString()
  };

  const { error } = await client.from(SETTINGS_TABLE).upsert(row, { onConflict: 'user_id' });
  fail(error);
  return next;
}

/**
 * The account's settings row, created when there is none.
 *
 * This is the priming write for the paths that update one column of a row that may not
 * exist yet (the attempt counter, the password digest). It deliberately does *not* move
 * `updated_at` on a row that is already there: that column is the policy instant other
 * devices compare their unlock against, and an attempt counter is not a policy change.
 */
async function ensureSettingsRow(client: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await client.from(SETTINGS_TABLE).select('user_id').eq('user_id', userId).maybeSingle();
  fail(error);
  if (data) return;
  const { error: created } = await client.from(SETTINGS_TABLE).upsert(
    {
      user_id: userId,
      enabled: DEFAULT_LOCK_SETTINGS.enabled,
      method: DEFAULT_LOCK_SETTINGS.method,
      lock_on_background: DEFAULT_LOCK_SETTINGS.lockOnBackground,
      idle_minutes: DEFAULT_LOCK_SETTINGS.idleMinutes,
      grant_minutes: DEFAULT_LOCK_SETTINGS.grantMinutes,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
  fail(created);
}

/**
 * The stored digest, for the one place that has to compare against it. It is kept out
 * of `AppLockSettings` on purpose: the settings object is handed to the interface, and
 * a hash has no business being rendered anywhere.
 */
export async function storedPasswordHash(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await client.from(SETTINGS_TABLE).select('password_hash').eq('user_id', userId).maybeSingle();
  fail(error);
  const hash = (data as { password_hash?: unknown } | null)?.password_hash;
  return typeof hash === 'string' && hash ? hash : null;
}

export async function storeLockPassword(client: SupabaseClient, userId: string, hash: string): Promise<void> {
  await ensureSettingsRow(client, userId);
  const { error } = await client
    .from(SETTINGS_TABLE)
    .update({ password_hash: hash, password_set_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  fail(error);
}

export async function clearLockPassword(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client
    .from(SETTINGS_TABLE)
    .update({ password_hash: null, password_set_at: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  fail(error);
}

/**
 * "Lock it now", as the account-wide action the button claims to be.
 *
 * Nothing about the settings changes, so this moves only the policy instant. Every other
 * device is then asked to step up again the next time its envelope's trust window
 * expires, which is `MAX_POLICY_PROPAGATION_SECONDS` at the latest. Writing this rather
 * than only rewriting one browser's cookie is what keeps the button from being a curtain.
 */
export async function touchLockPolicy(client: SupabaseClient, userId: string): Promise<void> {
  await ensureSettingsRow(client, userId);
  const { error } = await client.from(SETTINGS_TABLE).update({ updated_at: new Date().toISOString() }).eq('user_id', userId);
  fail(error);
}

/**
 * Records one failure, or a success. The returned pair is what the unlock endpoint
 * reports back, so the browser never decides how long a cool-down lasts.
 *
 * `updated_at` is not touched: these columns are the backoff, not the policy, and a
 * wrong password typed on one phone must not end the unlock window on another.
 */
export async function recordAttempts(client: SupabaseClient, userId: string, value: { failedAttempts: number; lockedUntil: string | null }): Promise<void> {
  await ensureSettingsRow(client, userId);
  const { error } = await client
    .from(SETTINGS_TABLE)
    .update({ failed_attempts: value.failedAttempts, locked_until: value.lockedUntil })
    .eq('user_id', userId);
  fail(error);
}

export async function listCredentials(client: SupabaseClient, userId: string): Promise<LockCredential[]> {
  const { data, error } = await client
    .from(CREDENTIALS_TABLE)
    .select('id, credential_id, public_key, counter, transports, label, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  fail(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ''),
    credentialId: String(row.credential_id ?? ''),
    publicKey: String(row.public_key ?? ''),
    counter: numberOr(row.counter, 0),
    transports: Array.isArray(row.transports) ? (row.transports as unknown[]).map(String) : [],
    label: clampLabel(row.label),
    createdAt: String(row.created_at ?? ''),
    lastUsedAt: typeof row.last_used_at === 'string' ? row.last_used_at : null
  }));
}

export async function addCredential(
  client: SupabaseClient,
  userId: string,
  credential: { credentialId: string; publicKey: string; counter: number; transports: string[]; label: string; deviceType: string | null; backedUp: boolean | null; aaguid: string | null }
): Promise<void> {
  const { error } = await client.from(CREDENTIALS_TABLE).insert({
    user_id: userId,
    credential_id: credential.credentialId,
    public_key: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports,
    label: clampLabel(credential.label),
    credential_device_type: credential.deviceType,
    credential_backed_up: credential.backedUp,
    aaguid: credential.aaguid
  });
  fail(error);
}

/**
 * Stores the new signature counter after a verified assertion. A counter that has not
 * moved is not a reason to refuse — it is what `credentialBackedUp` multi-device
 * credentials legitimately do — so the value is taken as reported.
 */
export async function markCredentialUsed(client: SupabaseClient, userId: string, credentialId: string, counter: number): Promise<void> {
  const { error } = await client
    .from(CREDENTIALS_TABLE)
    .update({ counter, last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('credential_id', credentialId);
  fail(error);
}

export async function removeCredential(client: SupabaseClient, userId: string, credentialRowId: string): Promise<void> {
  const { error } = await client.from(CREDENTIALS_TABLE).delete().eq('user_id', userId).eq('id', credentialRowId);
  fail(error);
}

/**
 * Turning a lock on needs a way back in, checked here as well as by the migration's
 * trigger: a friendly error beats one that arrives as a database exception.
 */
export async function methodHasWayBackIn(client: SupabaseClient, userId: string, method: LockMethod): Promise<boolean> {
  const settings = await readLockSettings(client, userId);
  return hasWayBackIn({ method, hasPassword: settings.hasPassword, credentialCount: settings.credentialCount });
}
