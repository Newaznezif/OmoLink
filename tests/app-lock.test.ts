import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allowServerOnly } from './server-only-allow';
import { stubSupabase } from './stub-supabase';
import {
  DEFAULT_LOCK_SETTINGS,
  ENVELOPE_MAX_AGE_SECONDS,
  ENVELOPE_TRUST_SECONDS,
  FREE_ATTEMPTS,
  GRANT_MINUTES_MAX,
  GRANT_MINUTES_MIN,
  IDLE_MINUTES_MAX,
  LOCK_LABEL_MAX,
  LOCK_PASSWORD_MAX,
  LOCK_PASSWORD_MIN,
  MAX_POLICY_PROPAGATION_SECONDS,
  POLICY_CLOCK_SKEW_MS,
  clampGrantMinutes,
  clampIdleMinutes,
  clampLabel,
  coolDown,
  decideLock,
  envelopeNeedsRecheck,
  grantSurvivesRecheck,
  hasWayBackIn,
  nextFailureState,
  readLockMethod,
  requiredLockPasswordProof,
  usableDoors,
  type AppLockSettings,
  type Envelope
} from '../src/lib/app-lock/state';
import {
  appLockConfigured,
  appLockSecret,
  envelopeCookieOptions,
  lockForRequest,
  mintEnvelope,
  readEnvelope,
  tokenBase64Url,
  tokenMatches,
  unlockDeadline
} from '../src/lib/app-lock/envelope';
import { webauthnIdentity } from '../src/lib/app-lock/rp';

/**
 * Tests for the optional app lock.
 *
 * What they can prove, and what they cannot, in one place: these cover the rules the
 * application decides on — the signed envelope, the unlock window, the backoff, the
 * password digest, the store's reading of a row, and the migration's constraints
 * against the code that writes them. Nothing here runs WebAuthn on a real authenticator
 * or Postgres on a real project, so no test asserts that a fingerprint was recognised
 * or that a Row Level Security policy held. A passing suite is not evidence about a
 * phone; the README records what still needs one.
 */

const SECRET = 'a'.repeat(48);
const MINUTE = 60_000;

function settingsWith(overrides: Partial<AppLockSettings>): AppLockSettings {
  return { ...DEFAULT_LOCK_SETTINGS, ...overrides };
}

/** An envelope with the shape every test shares, so each one states only what it varies. */
function envelopeOf(overrides: Partial<Envelope> = {}): Envelope {
  return { userId: 'user-1', required: true, unlockedUntil: null, issuedAt: 1_700_000_000_000, stepUp: false, ...overrides };
}

// ---------- the signed envelope ----------

test('an envelope round-trips to exactly what was minted', async () => {
  const envelope = envelopeOf({ unlockedUntil: 1_700_000_000_000, stepUp: true });
  const value = await mintEnvelope(envelope, SECRET);
  assert.equal(value.split('.').length, 3);
  assert.deepEqual(await readEnvelope(value, SECRET, envelope.issuedAt), envelope);
});

test('the step-up provenance travels inside the signature, not beside it', async () => {
  const issuedAt = 1_700_000_000_000;
  const proven = await mintEnvelope(envelopeOf({ issuedAt, unlockedUntil: issuedAt + 15 * MINUTE, stepUp: true }), SECRET);
  assert.equal((await readEnvelope(proven, SECRET, issuedAt))?.stepUp, true);

  // A session that only signed in cannot promote itself: the field lives in the signed
  // payload, so rewriting it breaks the envelope rather than granting a step-up.
  const unsigned = await mintEnvelope(envelopeOf({ issuedAt, unlockedUntil: issuedAt + 15 * MINUTE }), SECRET);
  const [, , signature] = unsigned.split('.');
  const upgraded = tokenBase64Url.encode(new TextEncoder().encode(JSON.stringify({ u: 'user-1', r: 1, x: issuedAt + 15 * MINUTE, i: issuedAt, s: 1 })));
  assert.equal((await readEnvelope(unsigned, SECRET, issuedAt))?.stepUp, false, 'a mint without a step-up records none');
  assert.equal(await readEnvelope(`v1.${upgraded}.${signature}`, SECRET, issuedAt), undefined, 'a forged payload is not a step-up');
});

test('one changed byte in the payload or the signature voids the envelope', async () => {
  const issuedAt = 1_700_000_000_000;
  const value = await mintEnvelope(envelopeOf({ issuedAt, unlockedUntil: issuedAt + 15 * MINUTE }), SECRET);
  const [, payload, signature] = value.split('.');
  const flip = (text: string) => (text[0] === 'A' ? `B${text.slice(1)}` : `A${text.slice(1)}`);

  assert.equal(await readEnvelope(`v1.${flip(payload!)}.${signature}`, SECRET, issuedAt), undefined);
  assert.equal(await readEnvelope(`v1.${payload}.${flip(signature!)}`, SECRET, issuedAt), undefined);
  assert.equal(await readEnvelope(`v1.${payload}.${signature}`, `${'b'.repeat(48)}`, issuedAt), undefined);
});

test('an envelope that is not a signed envelope is refused, not trusted', async () => {
  const now = Date.now();
  const junk = [
    undefined,
    '',
    'v1',
    'v1..',
    'v2.aaa.bbb',
    'locked',
    'off',
    'null',
    'v1.@@@@.@@@@',
    // a well-shaped token whose payload is not the object this feature mints
    `v1.${tokenBase64Url.encode(new TextEncoder().encode('{"admin":true}'))}.${'A'.repeat(43)}`
  ];
  for (const value of junk) {
    assert.equal(await readEnvelope(value, SECRET, now), undefined, `${String(value)} should not be readable`);
  }
});

test('an envelope dated outside its own life is refused', async () => {
  const now = Date.now();
  const future = await mintEnvelope(envelopeOf({ issuedAt: now + 5 * MINUTE }), SECRET);
  assert.equal(await readEnvelope(future, SECRET, now), undefined, 'a future issue date is not trusted');

  const ancient = await mintEnvelope(envelopeOf({ issuedAt: now - (ENVELOPE_MAX_AGE_SECONDS + 60) * 1000 }), SECRET);
  assert.equal(await readEnvelope(ancient, SECRET, now), undefined, 'a 30-day-old envelope is not trusted');

  const justInside = await mintEnvelope(envelopeOf({ required: false, issuedAt: now - (ENVELOPE_MAX_AGE_SECONDS - 60) * 1000 }), SECRET);
  assert.equal((await readEnvelope(justInside, SECRET, now))?.required, false);
});

test('decideLock says what an envelope means, and nothing more', () => {
  const now = 1_700_000_000_000;
  assert.equal(decideLock(undefined, now), 'unknown');
  assert.equal(decideLock(envelopeOf({ required: false, unlockedUntil: now + MINUTE, issuedAt: now }), now), 'off');
  assert.equal(decideLock(envelopeOf({ unlockedUntil: now + MINUTE, issuedAt: now }), now), 'unlocked');
  assert.equal(decideLock(envelopeOf({ unlockedUntil: now - 1, issuedAt: now }), now), 'locked');
  assert.equal(decideLock(envelopeOf({ unlockedUntil: now, issuedAt: now }), now), 'locked', 'the deadline itself is not inside the window');
  assert.equal(decideLock(envelopeOf({ issuedAt: now }), now), 'locked');
});

test('an envelope minted for one account cannot carry another', async () => {
  const now = Date.now();
  const value = await mintEnvelope(envelopeOf({ issuedAt: now, unlockedUntil: now + 15 * MINUTE }), SECRET);

  // Signing out and signing in as somebody else leaves the old cookie behind until the
  // sign-out handler clears it; either way the next request must not inherit it.
  const switched = await lockForRequest({ cookieValue: value, secret: SECRET, now, expectedUserId: 'user-2' });
  assert.equal(switched.verdict, 'unknown');
  assert.equal(switched.userId, undefined);

  const own = await lockForRequest({ cookieValue: value, secret: SECRET, now, expectedUserId: 'user-1' });
  assert.equal(own.verdict, 'unlocked');
  assert.equal(own.userId, 'user-1');
});

test('the window closing is a verdict, not a forgotten requirement', async () => {
  const now = Date.now();
  const value = await mintEnvelope(envelopeOf({ issuedAt: now, unlockedUntil: now + MINUTE }), SECRET);
  assert.equal((await lockForRequest({ cookieValue: value, secret: SECRET, now: now + 2 * MINUTE })).verdict, 'locked');
});

test('without a secret there is no envelope to mint or to trust', async () => {
  const now = Date.now();
  const value = await mintEnvelope(envelopeOf({ issuedAt: now, unlockedUntil: now + MINUTE }), SECRET);
  const before = process.env.APP_LOCK_SECRET;
  try {
    delete process.env.APP_LOCK_SECRET;
    assert.equal(appLockSecret(), undefined);
    assert.equal(appLockConfigured(), false);
    assert.equal((await lockForRequest({ cookieValue: value, secret: undefined, now })).verdict, 'unknown');
  } finally {
    if (before === undefined) delete process.env.APP_LOCK_SECRET;
    else process.env.APP_LOCK_SECRET = before;
  }
});

test('a short secret is not treated as a secret', () => {
  const before = process.env.APP_LOCK_SECRET;
  try {
    for (const weak of ['', '   ', 'x'.repeat(31), 'x'.repeat(600)]) {
      process.env.APP_LOCK_SECRET = weak;
      if (weak === 'x'.repeat(600)) assert.equal(appLockConfigured(), true, 'a long secret is fine');
      else assert.equal(appLockSecret(), undefined, `${weak.length} characters should not be accepted`);
    }
  } finally {
    if (before === undefined) delete process.env.APP_LOCK_SECRET;
    else process.env.APP_LOCK_SECRET = before;
  }
});

test('the envelope cookie is unreadable by scripts and not sent cross-site', () => {
  const options = envelopeCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
  assert.equal(options.maxAge, ENVELOPE_MAX_AGE_SECONDS);

  // NODE_ENV is typed read-only, and only this assertion needs to see both values.
  const env = process.env as Record<string, string | undefined>;
  const before = env.NODE_ENV;
  try {
    env.NODE_ENV = 'production';
    assert.equal(envelopeCookieOptions().secure, true);
    env.NODE_ENV = 'development';
    assert.equal(envelopeCookieOptions().secure, false);
  } finally {
    if (before === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = before;
  }
});

test('the shared token helpers sign and compare, and refuse junk', async () => {
  const signature = await signWith(SECRET, 'message');
  assert.equal(await tokenMatches(SECRET, 'message', signature), true);
  assert.equal(await tokenMatches(SECRET, 'message!', signature), false);
  assert.equal(await tokenMatches(`${'b'.repeat(48)}`, 'message', signature), false);
  // A signature that is not base64url never reaches the comparison at all.
  assert.equal(await tokenMatches(SECRET, 'message', 'not base64 url!!'), false);
  assert.equal(await tokenMatches(SECRET, 'message', ''), false);

  const bytes = new Uint8Array([0, 1, 128, 255]);
  assert.deepEqual(tokenBase64Url.decode(tokenBase64Url.encode(bytes)), bytes);
  assert.equal(tokenBase64Url.encode(new Uint8Array()), '');
  assert.equal(tokenBase64Url.decode('a b'), undefined);
  assert.equal(tokenBase64Url.decode('%2f'), undefined);
});

async function signWith(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return tokenBase64Url.encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))));
}

// ---------- timings ----------

test('the unlock window comes from the account, with a floor for nonsense', () => {
  const now = 1_700_000_000_000;
  assert.equal(unlockDeadline(15, now), now + 15 * MINUTE);
  assert.equal(unlockDeadline(1, now), now + MINUTE);
  assert.equal(unlockDeadline(0, now), now + 15 * MINUTE);
  assert.equal(unlockDeadline(-4, now), now + 15 * MINUTE);
  assert.equal(unlockDeadline(Number.NaN, now), now + 15 * MINUTE);
});

test('a cool-down is only running while the deadline is in the future', () => {
  const now = Date.parse('2026-10-24T10:00:00.000Z');
  assert.deepEqual(coolDown(null, now), { running: false, retryAfterSeconds: 0 });
  assert.deepEqual(coolDown(new Date(now - 1).toISOString(), now), { running: false, retryAfterSeconds: 0 });
  assert.deepEqual(coolDown('not a date', now), { running: false, retryAfterSeconds: 0 });
  assert.deepEqual(coolDown(new Date(now + 90_001).toISOString(), now), { running: true, retryAfterSeconds: 91 });
});

test('the first failures are free, then the wait doubles up to a quarter of an hour', () => {
  const now = 1_700_000_000_000;
  for (let attempts = 0; attempts < FREE_ATTEMPTS - 1; attempts += 1) {
    assert.equal(nextFailureState(attempts, now).lockedUntil, null, `failure ${attempts + 1} should not wait`);
  }

  const waits: number[] = [];
  let state = { failedAttempts: FREE_ATTEMPTS - 1, lockedUntil: null as string | null };
  for (let step = 0; step < 12; step += 1) {
    state = nextFailureState(state.failedAttempts, now);
    waits.push(Math.round((Date.parse(state.lockedUntil!) - now) / 1000));
  }
  assert.deepEqual(waits.slice(0, 5), [15, 30, 60, 120, 240]);
  assert.deepEqual(waits.at(-1), 900, 'the backoff is capped, not unbounded');
  assert.ok(waits.every((wait, index) => index === 0 || wait >= waits[index - 1]!), 'the wait never shrinks');
});

test('minutes and methods from a request body are clamped, never obeyed', () => {
  assert.equal(clampGrantMinutes(30), 30);
  assert.equal(clampGrantMinutes('30'), 30);
  assert.equal(clampGrantMinutes(3.7), 4);
  assert.equal(clampGrantMinutes(0), GRANT_MINUTES_MIN);
  assert.equal(clampGrantMinutes(-99), GRANT_MINUTES_MIN);
  assert.equal(clampGrantMinutes(100_000), GRANT_MINUTES_MAX);
  assert.equal(clampGrantMinutes('later'), DEFAULT_LOCK_SETTINGS.grantMinutes);
  assert.equal(clampGrantMinutes(undefined), DEFAULT_LOCK_SETTINGS.grantMinutes);

  assert.equal(clampIdleMinutes(0), 0);
  assert.equal(clampIdleMinutes(-5), 0);
  assert.equal(clampIdleMinutes(100_000), IDLE_MINUTES_MAX);
  assert.equal(clampIdleMinutes({}), DEFAULT_LOCK_SETTINGS.idleMinutes);

  assert.equal(readLockMethod('webauthn'), 'webauthn');
  assert.equal(readLockMethod('password'), 'password');
  assert.equal(readLockMethod('either'), 'either');
  assert.equal(readLockMethod('face'), undefined);
  assert.equal(readLockMethod(''), undefined);
  assert.equal(readLockMethod(undefined), undefined);

  assert.equal(clampLabel('  This phone  '), 'This phone');
  assert.equal(clampLabel(''), 'This device', 'an empty label would break the column constraint');
  assert.equal(clampLabel(undefined), 'This device');
  assert.equal(clampLabel('x'.repeat(500)).length, LOCK_LABEL_MAX);
});

// ---------- which doors exist ----------

test('a method with nothing behind it is not a way back in', () => {
  assert.equal(hasWayBackIn({ method: 'password', hasPassword: true, credentialCount: 0 }), true);
  assert.equal(hasWayBackIn({ method: 'password', hasPassword: false, credentialCount: 9 }), false);
  assert.equal(hasWayBackIn({ method: 'webauthn', hasPassword: true, credentialCount: 0 }), false);
  assert.equal(hasWayBackIn({ method: 'webauthn', hasPassword: false, credentialCount: 1 }), true);
  assert.equal(hasWayBackIn({ method: 'either', hasPassword: false, credentialCount: 0 }), false);
  assert.equal(hasWayBackIn({ method: 'either', hasPassword: true, credentialCount: 0 }), true);
  assert.equal(hasWayBackIn({ method: 'either', hasPassword: false, credentialCount: 1 }), true);
});

test('the unlock screen offers exactly the doors this account can use', () => {
  assert.deepEqual(usableDoors(settingsWith({ enabled: true, method: 'either' })), { webauthn: false, password: false });
  assert.deepEqual(usableDoors(settingsWith({ enabled: true, method: 'either', hasPassword: true })), { webauthn: false, password: true });
  assert.deepEqual(usableDoors(settingsWith({ enabled: true, method: 'either', credentialCount: 2 })), { webauthn: true, password: false });
  assert.deepEqual(
    usableDoors(settingsWith({ enabled: true, method: 'either', hasPassword: true, credentialCount: 2 })),
    { webauthn: true, password: true }
  );
  // A method that excludes a door does not offer it, even when the account has it.
  assert.deepEqual(usableDoors(settingsWith({ enabled: true, method: 'password', hasPassword: true, credentialCount: 2 })), { webauthn: false, password: true });
  assert.deepEqual(usableDoors(settingsWith({ enabled: true, method: 'webauthn', hasPassword: true, credentialCount: 2 })), { webauthn: true, password: false });
});

test('an account with no doors is the case the unlock screen has to explain', () => {
  const stranded = settingsWith({ enabled: true, method: 'either', hasPassword: false, credentialCount: 0 });
  assert.equal(hasWayBackIn(stranded), false);
  const doors = usableDoors(stranded);
  assert.equal(doors.webauthn || doors.password, false);
});

// ---------- the lock password ----------

allowServerOnly();

test('a lock password is kept as a digest the migration accepts, and verifies', async () => {
  const { hashLockPassword, verifyLockPassword } = await import('../src/lib/app-lock/password');
  const sql = migrationSql();
  const pattern = /password_hash ~ '(\^[^']+)'/.exec(sql)?.[1];
  assert.ok(pattern, 'the migration must declare the shape of a stored digest');

  const digest = await hashLockPassword('long-enough-passphrase');
  assert.match(digest, new RegExp(pattern), 'the digest the code writes must pass the column check');

  assert.equal(await verifyLockPassword(digest, 'long-enough-passphrase'), true);
  assert.equal(await verifyLockPassword(digest, 'Long-Enough-Passphrase'), false);
  assert.equal(await verifyLockPassword(digest, ''), false);
  assert.equal(await verifyLockPassword(digest, 'long-enough-passphras'), false);
});

test('two accounts with the same password do not share a digest', async () => {
  const { hashLockPassword } = await import('../src/lib/app-lock/password');
  const a = await hashLockPassword('same-password');
  const b = await hashLockPassword('same-password');
  assert.notEqual(a, b, 'without a per-account salt one leaked table proves every password');
});

test('a stored value that is not a digest verifies false instead of crashing', async () => {
  const { parseLockPassword, verifyLockPassword } = await import('../src/lib/app-lock/password');
  const junk = [null, undefined, '', 'hunter2', 'scrypt', 'bcrypt$1$2$3$4$5', 'scrypt$0$8$1$aabb$cc', 'scrypt$16384$8$1$zz$cc', 'scrypt$16384$8$1$aabb$c', 'scrypt$16384$8$1$aabb$gg'];
  for (const stored of junk) {
    assert.equal(parseLockPassword(stored), undefined, `${String(stored)} should not parse`);
    assert.equal(await verifyLockPassword(stored as string | null, 'hunter2'), false);
  }
});

test('a digest whose parameters this process will not pay for is a refusal, not a crash', async () => {
  const { parseLockPassword, verifyLockPassword } = await import('../src/lib/app-lock/password');
  // Right shape, so it parses, but N asks for more memory than MAXMEM allows. Before
  // this was handled the owner met a 500 at the unlock screen instead of a wrong answer.
  const unaffordable = `scrypt$1073741824$8$1${'$' + 'ab'.repeat(32)}${'$' + 'cd'.repeat(64)}`;
  assert.ok(parseLockPassword(unaffordable), 'the value must parse for the derivation to be attempted');
  assert.equal(await verifyLockPassword(unaffordable, 'hunter2'), false);
});

test('length rules are the two that matter', async () => {
  const { passwordIssue } = await import('../src/lib/app-lock/password');
  assert.equal(passwordIssue('x'.repeat(LOCK_PASSWORD_MIN)), null);
  assert.equal(passwordIssue('x'.repeat(LOCK_PASSWORD_MAX)), null);
  assert.equal(passwordIssue('x'.repeat(LOCK_PASSWORD_MIN - 1)), 'too_short');
  assert.equal(passwordIssue('x'.repeat(LOCK_PASSWORD_MAX + 1)), 'too_long');
  assert.equal(passwordIssue(''), 'blank');
  assert.equal(passwordIssue('    '), 'blank');
  assert.equal(passwordIssue(undefined), 'blank');
  assert.equal(passwordIssue({ toString: () => 'x'.repeat(20) }), 'blank', 'a non-string is never a password');
});

// ---------- how fast a change reaches another device ----------

test('a presented envelope is trusted for the window, and for exactly the window', () => {
  const issuedAt = 1_700_000_000_000;
  const envelope = envelopeOf({ issuedAt, unlockedUntil: issuedAt + 60 * MINUTE });
  assert.equal(envelopeNeedsRecheck(envelope, issuedAt), false, 'a fresh envelope costs no query');
  assert.equal(envelopeNeedsRecheck(envelope, issuedAt + ENVELOPE_TRUST_SECONDS * 1000 - 1), false);
  assert.equal(envelopeNeedsRecheck(envelope, issuedAt + ENVELOPE_TRUST_SECONDS * 1000), true, 'at the boundary the account is re-read');
  assert.equal(envelopeNeedsRecheck(envelope, issuedAt + 10 * MINUTE), true, 'and the grant outliving the trust window is not a licence to skip it');
  assert.equal(envelopeNeedsRecheck(undefined, issuedAt), true, 'no envelope is the clearest case of a re-check');
});

test('an open window ends when the account’s policy moved after it was signed', () => {
  const issuedAt = 1_700_000_000_000;
  const insideWindow = envelopeOf({ issuedAt, unlockedUntil: issuedAt + 15 * MINUTE });
  const later = (seconds: number) => new Date(issuedAt + seconds * 1000).toISOString();

  // Nothing to compare against: an account whose row has never moved keeps its window.
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: null, now: issuedAt }), true);

  // The two changes that must bite: the lock switched on elsewhere, and "lock it now".
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: later(5), now: issuedAt }), true, 'a change inside the clock allowance is the same instant');
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: later(POLICY_CLOCK_SKEW_MS / 1000 + 5), now: issuedAt }), false);
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: later(3600), now: issuedAt }), false);

  // A change recorded before this envelope was signed is not news to it.
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: later(-120), now: issuedAt }), true);

  // Its own deadline still comes first, and a window that never opened survives nothing.
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: null, now: issuedAt + 16 * MINUTE }), false);
  assert.equal(grantSurvivesRecheck({ envelope: envelopeOf({ issuedAt }), policyChangedAt: null, now: issuedAt }), false);

  // A stamp this server cannot read is not a licence to keep the window open forever:
  // it is treated as "no policy recorded", and the next re-check compares again.
  assert.equal(grantSurvivesRecheck({ envelope: insideWindow, policyChangedAt: 'not a date', now: issuedAt }), true);
});

test('the documented bound is the trust window plus the clock allowance', () => {
  assert.equal(MAX_POLICY_PROPAGATION_SECONDS, ENVELOPE_TRUST_SECONDS + POLICY_CLOCK_SKEW_MS / 1000);
  assert.equal(MAX_POLICY_PROPAGATION_SECONDS, 90, 'if this changes, the README and the Settings copy must change with it');
});

test('the backoff moves the counter, and never the policy instant', async () => {
  const { recordAttempts, touchLockPolicy, writeLockSettings } = await import('../src/lib/app-lock/store');

  const attempts = stubSupabase({ app_lock_settings: [{ user_id: 'user-1', enabled: true }], webauthn_credentials: [] });
  await recordAttempts(attempts.client, 'user-1', { failedAttempts: 1, lockedUntil: null });
  const written = attempts.writes.at(-1)!.payload as Record<string, unknown>;
  assert.equal(written.failed_attempts, 1);
  assert.equal('updated_at' in written, false, 'a typo on one phone must not sign the owner out of every other device');

  const policy = stubSupabase({ app_lock_settings: [{ user_id: 'user-1', enabled: true }], webauthn_credentials: [] });
  await touchLockPolicy(policy.client, 'user-1');
  assert.ok(typeof (policy.writes.at(-1)!.payload as Record<string, unknown>).updated_at === 'string', '"lock it now" has to be visible to other devices');

  const saved = stubSupabase({ app_lock_settings: [{ user_id: 'user-1', enabled: true }], webauthn_credentials: [] });
  await writeLockSettings(saved.client, 'user-1', { grantMinutes: 5 });
  assert.ok(typeof (saved.writes.at(-1)!.payload as Record<string, unknown>).updated_at === 'string', 'a settings change is a policy change');
});

test('the policy instant a session is compared against is the row’s own updated_at', async () => {
  const { readLockSettings } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({
    app_lock_settings: [{ user_id: 'user-1', enabled: true, updated_at: '2026-10-25T09:00:00.000Z' }],
    webauthn_credentials: []
  });
  assert.equal((await readLockSettings(stub.client, 'user-1')).policyChangedAt, '2026-10-25T09:00:00.000Z');

  const fresh = stubSupabase({ app_lock_settings: [], webauthn_credentials: [] });
  assert.equal((await readLockSettings(fresh.client, 'user-1')).policyChangedAt, null, 'an account with no row has no policy to age');
});

// ---------- what a password change has to be proved against ----------

test('replacing or removing a lock password needs the current one, or a step-up', () => {
  const noStepUp = { stepUp: false };
  const withStepUp = { stepUp: true };

  // The first password has nothing to prove against; there is no secret to steal yet.
  assert.equal(requiredLockPasswordProof({ wantsPassword: true, wantsClear: false, hasPassword: false, ...noStepUp }), 'none');

  // A session that merely signed in is not a step-up, and cannot take the password over.
  assert.equal(requiredLockPasswordProof({ wantsPassword: true, wantsClear: false, hasPassword: true, ...noStepUp }), 'password');
  assert.equal(requiredLockPasswordProof({ wantsPassword: false, wantsClear: true, hasPassword: true, ...noStepUp }), 'password');

  // The device check the unlock screen offers is the other acceptable proof, which is the
  // path for an owner holding their enrolled phone and not remembering the password.
  assert.equal(requiredLockPasswordProof({ wantsPassword: true, wantsClear: false, hasPassword: true, ...withStepUp }), 'step-up');
  assert.equal(requiredLockPasswordProof({ wantsPassword: false, wantsClear: true, hasPassword: true, ...withStepUp }), 'step-up');

  // Removing a password that is not there, and setting one where none exists, need nothing.
  assert.equal(requiredLockPasswordProof({ wantsPassword: false, wantsClear: true, hasPassword: false, ...noStepUp }), 'none');
  assert.equal(requiredLockPasswordProof({ wantsPassword: false, wantsClear: false, hasPassword: true, ...noStepUp }), 'none');
});

// ---------- which domain a device check is bound to ----------

test('in production the rp id comes from the environment and never from the request', () => {
  const env = process.env as Record<string, string | undefined>;
  const before = { nodeEnv: env.NODE_ENV, rp: env.APP_LOCK_RP_ID, origins: env.APP_LOCK_ALLOWED_ORIGINS };
  try {
    env.NODE_ENV = 'production';
    delete env.APP_LOCK_RP_ID;
    delete env.APP_LOCK_ALLOWED_ORIGINS;

    // The header a client, a proxy or an attacker chooses is not a configuration source.
    assert.equal(webauthnIdentity('evil.example'), undefined, 'an unconfigured production rp id is a refusal, not a guess');
    assert.equal(webauthnIdentity('omo-net-tab.vercel.app'), undefined, 'not even when the host looks like the right one');
    assert.equal(webauthnIdentity(null), undefined);

    env.APP_LOCK_RP_ID = 'omo-net-tab.vercel.app';
    const identity = webauthnIdentity('evil.example');
    assert.equal(identity?.rpId, 'omo-net-tab.vercel.app', 'the configured value wins over any header');
    assert.deepEqual(identity?.expectedOrigins, ['https://omo-net-tab.vercel.app']);

    // A value that is not a bare host is not a nearly-right one; it is a mistake to refuse.
    for (const unusable of ['https://omo-net-tab.vercel.app', 'omo-net-tab.vercel.app:8443', '10.0.0.5', 'omo net tab', 'localhost']) {
      env.APP_LOCK_RP_ID = unusable;
      if (unusable === 'omo-net-tab.vercel.app:8443') {
        // A port is stripped, and what remains is a domain the ceremony can be bound to.
        assert.equal(webauthnIdentity('evil.example')?.rpId, 'omo-net-tab.vercel.app');
        continue;
      }
      assert.equal(webauthnIdentity('omo-net-tab.vercel.app'), undefined, `"${unusable}" is not an rp id`);
    }

    // Explicit origins are honoured exactly, without wildcards.
    env.APP_LOCK_RP_ID = 'omo-net-tab.vercel.app';
    env.APP_LOCK_ALLOWED_ORIGINS = 'https://omo-net-tab.vercel.app, https://app.omo-net-tab.vercel.app';
    assert.deepEqual(webauthnIdentity('evil.example')?.expectedOrigins, ['https://omo-net-tab.vercel.app', 'https://app.omo-net-tab.vercel.app']);
  } finally {
    env.NODE_ENV = before.nodeEnv;
    if (before.rp === undefined) delete env.APP_LOCK_RP_ID;
    else env.APP_LOCK_RP_ID = before.rp;
    if (before.origins === undefined) delete env.APP_LOCK_ALLOWED_ORIGINS;
    else env.APP_LOCK_ALLOWED_ORIGINS = before.origins;
  }
});

test('outside production a request host may answer, but only a plain host', () => {
  const env = process.env as Record<string, string | undefined>;
  const before = { nodeEnv: env.NODE_ENV, rp: env.APP_LOCK_RP_ID };
  try {
    env.NODE_ENV = 'development';
    delete env.APP_LOCK_RP_ID;
    assert.equal(webauthnIdentity('localhost:3000')?.rpId, 'localhost');
    assert.equal(webauthnIdentity('preview.example.vercel.app')?.rpId, 'preview.example.vercel.app');
    assert.equal(webauthnIdentity('127.0.0.1:3000'), undefined, 'an address is not a domain');
    assert.equal(webauthnIdentity('evil.example/omo'), undefined, 'a path is not a domain either');

    env.APP_LOCK_RP_ID = 'omo-net-tab.vercel.app';
    assert.equal(webauthnIdentity('localhost:3000')?.rpId, 'omo-net-tab.vercel.app');
  } finally {
    env.NODE_ENV = before.nodeEnv;
    if (before.rp === undefined) delete env.APP_LOCK_RP_ID;
    else env.APP_LOCK_RP_ID = before.rp;
  }
});

// ---------- the store, against a stub client ----------

test('settings that do not exist yet read as off, never as configured', async () => {
  const { readLockSettings } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({ app_lock_settings: [], webauthn_credentials: [] });
  assert.deepEqual(await readLockSettings(stub.client, 'user-1'), DEFAULT_LOCK_SETTINGS);
});

test('a row written by hand is clamped and defaulted, not trusted', async () => {
  const { readLockSettings } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({
    app_lock_settings: [
      {
        user_id: 'user-1',
        enabled: 'yes',
        method: 'face',
        lock_on_background: null,
        idle_minutes: -3,
        grant_minutes: 99_999,
        password_hash: '',
        failed_attempts: -5,
        locked_until: 42
      }
    ],
    webauthn_credentials: [
      { user_id: 'user-1', id: 'c1' },
      { user_id: 'user-1', id: 'c2' }
    ]
  });
  const settings = await readLockSettings(stub.client, 'user-1');
  assert.equal(settings.enabled, false);
  assert.equal(settings.method, 'either');
  assert.equal(settings.lockOnBackground, true);
  assert.equal(settings.idleMinutes, 0);
  assert.equal(settings.grantMinutes, GRANT_MINUTES_MAX);
  assert.equal(settings.hasPassword, false, 'an empty hash is not a password');
  assert.equal(settings.failedAttempts, 0);
  assert.equal(settings.lockedUntil, null);
  assert.equal(settings.credentialCount, 2);
});

test('a settings save never writes the password column', async () => {
  const { writeLockSettings } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({ app_lock_settings: [], webauthn_credentials: [] });
  await writeLockSettings(stub.client, 'user-1', { enabled: true, method: 'password', grantMinutes: 5 });

  const saved = stub.writes.find((write) => write.table === 'app_lock_settings' && write.method === 'upsert');
  assert.ok(saved, 'expected one upsert of the settings row');
  const row = saved!.payload as Record<string, unknown>;
  assert.equal(row.user_id, 'user-1');
  assert.equal(row.enabled, true);
  assert.equal(row.method, 'password');
  assert.equal(row.grant_minutes, 5);
  assert.equal('password_hash' in row, false, 'a settings save blanking or smuggling a digest would be a lockout');
});

test('only the password helper writes the digest, and only for this account', async () => {
  const { storeLockPassword, clearLockPassword, storedPasswordHash } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({
    app_lock_settings: [{ user_id: 'user-1', enabled: false, method: 'either', password_hash: null }],
    webauthn_credentials: []
  });

  await storeLockPassword(stub.client, 'user-1', 'scrypt$16384$8$1$aabb$cc');
  const update = stub.writes.filter((write) => write.method === 'update').at(-1);
  assert.equal((update!.payload as Record<string, unknown>).password_hash, 'scrypt$16384$8$1$aabb$cc');
  assert.deepEqual(
    stub.steps.filter((step) => step.method === 'eq').map((step) => step.args as [string, unknown]).at(-1),
    ['user_id', 'user-1'],
    'a write that does not name the account could reach another row'
  );

  assert.equal(await storedPasswordHash(stub.client, 'user-1'), null, 'the stub row has no digest');

  await clearLockPassword(stub.client, 'user-1');
  assert.equal((stub.writes.filter((write) => write.method === 'update').at(-1)!.payload as Record<string, unknown>).password_hash, null);
});

test('a failure count is written by the server, and a success resets it', async () => {
  const { recordAttempts } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({ app_lock_settings: [{ user_id: 'user-1' }], webauthn_credentials: [] });
  await recordAttempts(stub.client, 'user-1', { failedAttempts: 6, lockedUntil: '2026-10-24T10:00:15.000Z' });
  const payload = stub.writes.at(-1)!.payload as Record<string, unknown>;
  assert.equal(payload.failed_attempts, 6);
  assert.equal(payload.locked_until, '2026-10-24T10:00:15.000Z');

  await recordAttempts(stub.client, 'user-1', { failedAttempts: 0, lockedUntil: null });
  assert.equal((stub.writes.at(-1)!.payload as Record<string, unknown>).locked_until, null);
});

/** Builds a client whose every read answers with the given Supabase-shaped error. */
function clientErroringWith(error: { message: string; code?: string }) {
  const stub = stubSupabase({});
  stub.client.from = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error }),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error })
      })
    })
  });
  return stub;
}

test('a missing table is reported as absent, and nothing else is', async () => {
  const { readLockSettingsResult } = await import('../src/lib/app-lock/store');

  const working = stubSupabase({ app_lock_settings: [], webauthn_credentials: [] });
  const ok = await readLockSettingsResult(working.client, 'user-1');
  assert.equal(ok.status, 'ok');
  assert.equal(ok.status === 'ok' && ok.settings.enabled, false, 'an account with no row is an account with no lock');

  for (const code of ['42P01', '42703', 'PGRST205']) {
    const missing = clientErroringWith({ message: `relation "app_lock_settings" does not exist`, code });
    assert.equal((await readLockSettingsResult(missing.client, 'user-1')).status, 'absent', `${code} is migration 0008 not applied`);
  }
});

test('a database that merely failed says so, and is never read as no lock', async () => {
  const { readLockSettings, readLockSettingsResult } = await import('../src/lib/app-lock/store');

  // These are the failures an operator causes: a connection that timed out, a policy that
  // refused, a pool that ran out. None of them is a statement about the account.
  for (const failure of [
    { message: 'timeout of 5000ms exceeded' },
    { message: 'permission denied for table app_lock_settings' },
    { message: 'remaining connection slots are reserved', code: '53300' },
    { message: 'could not serialize access due to concurrent update', code: '40001' }
  ]) {
    const broken = clientErroringWith(failure);
    const read = await readLockSettingsResult(broken.client, 'user-1');
    assert.equal(read.status, 'error', `${failure.message} must be reported as a failure`);
    assert.ok(read.status === 'error' && read.message.length > 0, 'and with something to log');
    await assert.rejects(() => readLockSettings(broken.client, 'user-1'));
  }

  // The throw keeps the code, which is what lets the shared HTTP answer pick 409 or 503.
  const { LockStoreError } = await import('../src/lib/app-lock/store');
  const missing = clientErroringWith({ message: 'relation "webauthn_credentials" does not exist', code: '42P01' });
  await assert.rejects(
    async () => {
      try {
        await readLockSettings(missing.client, 'user-1');
      } catch (err) {
        assert.ok(err instanceof LockStoreError);
        assert.equal(err.schemaMissing, true);
        throw err;
      }
    },
    /does not exist/
  );
});

/**
 * Runs the gate with a store this process cannot build: supabase mode, a signing secret,
 * and deliberately no Supabase credentials. That is the one database failure reproducible
 * without a network — `lockClient()` refuses before there is a query to time out — and it
 * is the case M4 is about, because a client that throws has no error code to classify.
 */
async function withUnreachableStore<T>(run: () => Promise<T>): Promise<T> {
  const env = process.env as Record<string, string | undefined>;
  const saved = {
    DATA_MODE: env.DATA_MODE,
    APP_LOCK_SECRET: env.APP_LOCK_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
  try {
    env.DATA_MODE = 'supabase';
    env.APP_LOCK_SECRET = SECRET;
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return await run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

test('a database this process cannot reach is an error, never the absent migration', async () => {
  const { readAccountLockSettings } = await import('../src/lib/app-lock/gate');
  const read = await withUnreachableStore(() => readAccountLockSettings('user-1'));
  assert.equal(read.status, 'error', 'a client that could not be built says nothing about what this account configured');
});

test('the page gate and the API verdict both close when the store cannot be reached', async () => {
  const { appLockApiVerdict, enforceAreaLock } = await import('../src/lib/app-lock/gate');
  await withUnreachableStore(async () => {
    assert.equal(await appLockApiVerdict({ userId: 'user-1' }), 'unavailable', 'the API answer is a refusal the client may retry');
    const thrown = await enforceAreaLock({ userId: 'user-1' }, '/dashboard').catch((err: unknown) => err);
    assert.ok(thrown, 'an uninspectable lock is not a reason to render a protected page');
    assert.match(String((thrown as { digest?: string }).digest ?? ''), /\/unlock/, 'and the redirect goes to the screen that can say what failed');
  });
});

test('a database that cannot be reached is answered 503, not as a failed ceremony', async () => {
  const { lockAuthResponse } = await import('../src/lib/app-lock/http');
  const t = (key: string) => key;

  const unreachable = lockAuthResponse(t, new Error('DATA_MODE=supabase is set but no Supabase credentials are configured.'));
  assert.equal(unreachable.status, 503);
  assert.equal(((await unreachable.json()) as { error?: string }).error, 'appLock.storeUnavailable');

  const halfConfigured = lockAuthResponse(t, new Error('Supabase is half-configured: the url and the key must both be set.'));
  assert.equal(halfConfigured.status, 503, 'the message is not echoed, only the status and the translated reason');

  const unrelated = lockAuthResponse(t, new Error('something else entirely'));
  assert.equal(unrelated.status, 500);
  assert.equal(((await unrelated.json()) as { error?: string }).error, 'appLock.ceremonyFailed');
});

test('credentials map to the shape the ceremony needs', async () => {
  const { listCredentials } = await import('../src/lib/app-lock/store');
  const stub = stubSupabase({
    app_lock_settings: [],
    webauthn_credentials: [
      {
        user_id: 'user-1',
        id: 'row-1',
        credential_id: 'cred-1',
        public_key: 'co2udiwj',
        counter: '12',
        transports: null,
        label: '  ',
        created_at: '2026-10-01T00:00:00.000Z',
        last_used_at: null
      },
      {
        user_id: 'user-1',
        id: 'row-2',
        credential_id: 'cred-2',
        public_key: 'AAAA',
        counter: 3,
        transports: ['internal', 42],
        label: 'This phone',
        created_at: '2026-10-02T00:00:00.000Z',
        last_used_at: '2026-10-03T00:00:00.000Z'
      }
    ]
  });
  const rows = await listCredentials(stub.client, 'user-1');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    id: 'row-1',
    credentialId: 'cred-1',
    publicKey: 'co2udiwj',
    counter: 0,
    transports: [],
    label: 'This device',
    createdAt: '2026-10-01T00:00:00.000Z',
    lastUsedAt: null
  });
  assert.deepEqual(rows[1]?.transports, ['internal', '42']);
  assert.equal(rows[1]?.lastUsedAt, '2026-10-03T00:00:00.000Z');
});

test('the way-back-in check the delete guard uses reads the account, not the request', async () => {
  const { methodHasWayBackIn } = await import('../src/lib/app-lock/store');
  const oneDevice = stubSupabase({
    app_lock_settings: [{ user_id: 'user-1', enabled: true, method: 'webauthn' }],
    webauthn_credentials: [{ user_id: 'user-1', id: 'row-1' }]
  });
  // The route re-checks this against the count that remains *after* the deletion, so
  // the value here is the one it started from: one device, and no other door.
  assert.equal(await methodHasWayBackIn(oneDevice.client, 'user-1', 'webauthn'), true);
  assert.equal(hasWayBackIn({ method: 'webauthn', hasPassword: false, credentialCount: 0 }), false);

  const noDoor = stubSupabase({
    app_lock_settings: [{ user_id: 'user-1', enabled: true, method: 'password' }],
    webauthn_credentials: [{ user_id: 'user-1', id: 'row-1' }]
  });
  assert.equal(await methodHasWayBackIn(noDoor.client, 'user-1', 'password'), false);
  assert.equal(await methodHasWayBackIn(noDoor.client, 'user-1', 'either'), true);
});

// ---------- capability: where the feature refuses to exist ----------

test('the lock reports itself unavailable in demo mode and without a secret', async () => {
  const { appLockAvailable } = await import('../src/lib/app-lock/store');
  const beforeMode = process.env.DATA_MODE;
  const beforeSecret = process.env.APP_LOCK_SECRET;
  try {
    process.env.APP_LOCK_SECRET = SECRET;
    process.env.DATA_MODE = 'demo';
    assert.equal(appLockAvailable(), false, 'demo data behind a session cookie is not an account to protect');

    process.env.DATA_MODE = 'supabase';
    assert.equal(appLockAvailable(), true);

    delete process.env.APP_LOCK_SECRET;
    assert.equal(appLockAvailable(), false, 'an unlock that cannot be signed cannot be verified either');
  } finally {
    if (beforeMode === undefined) delete process.env.DATA_MODE;
    else process.env.DATA_MODE = beforeMode;
    if (beforeSecret === undefined) delete process.env.APP_LOCK_SECRET;
    else process.env.APP_LOCK_SECRET = beforeSecret;
  }
});

test('in demo mode the page gate and the API verdict change nothing', async () => {
  const { appLockApiVerdict, enforceAreaLock } = await import('../src/lib/app-lock/gate');
  const beforeMode = process.env.DATA_MODE;
  const beforeSecret = process.env.APP_LOCK_SECRET;
  try {
    process.env.DATA_MODE = 'demo';
    process.env.APP_LOCK_SECRET = SECRET;
    assert.equal(await enforceAreaLock({ userId: 'user-1' }, '/dashboard'), undefined);
    assert.equal(await appLockApiVerdict({ userId: 'user-1' }), 'pass');
  } finally {
    if (beforeMode === undefined) delete process.env.DATA_MODE;
    else process.env.DATA_MODE = beforeMode;
    if (beforeSecret === undefined) delete process.env.APP_LOCK_SECRET;
    else process.env.APP_LOCK_SECRET = beforeSecret;
  }
});

test('a request body that is not JSON is not a request body', async () => {
  const { readJsonBody } = await import('../src/lib/app-lock/http');
  const form = new Request('http://localhost/api/app-lock/unlock', {
    method: 'POST',
    body: 'password=hunter2',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  });
  assert.deepEqual(await readJsonBody(form), {}, 'a cross-site form must not be able to spend an account unlock attempt');

  const malformed = new Request('http://localhost/api/app-lock/unlock', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await readJsonBody(malformed), {});

  const arrayBody = new Request('http://localhost/api/app-lock/unlock', { method: 'POST', body: '["hunter2"]', headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await readJsonBody(arrayBody), {});

  assert.deepEqual(await readJsonBody(await jsonRequest({ method: 'password', password: 'hunter2' })), { method: 'password', password: 'hunter2' });
});

async function jsonRequest(body: unknown): Promise<Request> {
  return new Request('http://localhost/api/app-lock/unlock', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
}

// ---------- the migration and the code that writes it ----------

function migrationSql(): string {
  return readFileSync(join(process.cwd(), 'supabase', 'migrations', '0008_app_lock.sql'), 'utf8');
}

test('every number the code can write satisfies a column check in 0008', () => {
  const sql = migrationSql();
  const bounds = (pattern: string): [number, number] => {
    const match = new RegExp(pattern).exec(sql) ?? [];
    return [Number(match[1]), Number(match[2])];
  };

  const [grantMin, grantMax] = bounds('grant_minutes between (\\d+) and (\\d+)');
  assert.equal(grantMin, GRANT_MINUTES_MIN);
  assert.equal(grantMax, GRANT_MINUTES_MAX);
  assert.ok(DEFAULT_LOCK_SETTINGS.grantMinutes >= grantMin && DEFAULT_LOCK_SETTINGS.grantMinutes <= grantMax);

  const [idleMin, idleMax] = bounds('idle_minutes between (\\d+) and (\\d+)');
  assert.equal(idleMin, 0);
  assert.equal(idleMax, IDLE_MINUTES_MAX);
  assert.ok(DEFAULT_LOCK_SETTINGS.idleMinutes >= idleMin && DEFAULT_LOCK_SETTINGS.idleMinutes <= idleMax);

  const [labelMin, labelMax] = bounds('char_length\\(label\\) between (\\d+) and (\\d+)');
  assert.ok(labelMax === LOCK_LABEL_MAX, `the code truncates at ${LOCK_LABEL_MAX}, the column allows ${labelMax}`);
  assert.ok(clampLabel('x'.repeat(900)).length <= labelMax);
  assert.ok(clampLabel('').length >= labelMin, 'an empty label would violate a between 1 and check');

  // The digest the code writes is asserted against the real pattern in the password
  // test above; here only that the method list and the code agree.
  for (const method of ['webauthn', 'password', 'either']) {
    assert.ok(sql.includes(`'${method}'`), `the method check does not allow ${method}`);
  }
});

test('the credential type the migration accepts is the one the library reports', () => {
  const sql = migrationSql();
  const allowed = /credential_device_type in \(([^)]*)\)/.exec(sql)?.[1] ?? '';
  const declared = readFileSync(join(process.cwd(), 'node_modules', '@simplewebauthn', 'server', 'esm', 'types', 'index.d.ts'), 'utf8');
  const reported = /type CredentialDeviceType = ([^;]+);/.exec(declared)?.[1];
  assert.ok(reported, 'the installed library no longer declares CredentialDeviceType; re-read this migration');

  for (const value of reported!.split('|').map((part) => part.trim().replace(/'/g, ''))) {
    assert.ok(allowed.includes(`'${value}'`), `0008 would reject ${value}, which @simplewebauthn reports for a real registration`);
  }
});

test('the migration keeps an account out of an unopenable lock, and the code does too', () => {
  const sql = migrationSql();
  assert.ok(/create trigger app_lock_requires_a_way_back_in/.test(sql));
  assert.ok(/if not new\.enabled then/.test(sql), 'turning the lock off must stay reachable as the recovery path');
  for (const method of ['password', 'webauthn']) {
    assert.ok(new RegExp(`if new\\.method = '${method}' then`).test(sql), `the trigger has no ${method} branch`);
  }
  // 'either' is the fall-through rather than a branch, but it is still refused when
  // neither door exists.
  assert.ok(sql.includes(`raise exception 'app lock method "either" needs`), 'the trigger lets an empty either-lock through');

  // The same rule as the settings endpoint, on the values it has at that moment.
  assert.equal(hasWayBackIn({ method: 'password', hasPassword: false, credentialCount: 0 }), false);
  assert.equal(hasWayBackIn({ method: 'either', hasPassword: false, credentialCount: 1 }), true);
});

test('the lock tables are owner-only, with no administrator policy', () => {
  const sql = migrationSql();
  for (const table of ['app_lock_settings', 'webauthn_credentials']) {
    assert.ok(new RegExp(`alter table public\\.${table} enable row level security`).test(sql), `${table} is not enabled for RLS`);
    const policies = [...sql.matchAll(new RegExp(`create policy "([^"]+)"\\s*on public\\.${table}([\\s\\S]*?);`, 'g'))];
    assert.ok(policies.length > 0, `${table} has RLS and no policy`);
    for (const [, name, clause] of policies) {
      assert.match(clause!, /user_id = auth\.uid\(\)/, `"${name}" on ${table} does not check the owner`);
      assert.doesNotMatch(clause!, /is_admin\(\)/, `"${name}" on ${table} would let an administrator into someone's lock`);
    }
  }
});
