import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * These tests read the migration files; they do not execute them. Nothing here
 * proves that a policy behaves as intended in Postgres — only a live project
 * does that. What this can prove is the class of mistake that breaks a push or
 * silently leaves a table wide open: a table created without RLS, a table with
 * RLS and no policies at all, a policy name created twice on the same table
 * (Postgres aborts), or an unauthenticated `using (true)` write policy surviving
 * the sequence.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

type Policy = { table: string; name: string; clause: string };

/** Strips `-- comments`, then collapses whitespace so regexes can span lines. */
function flatten(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadSequence() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((file) => ({ file, sql: flatten(readFileSync(join(MIGRATIONS_DIR, file), 'utf8')) }));
}

const sequence = loadSequence();

function tablesCreated(sql: string): string[] {
  return [...sql.matchAll(/create table (?:if not exists )?public\.([a-z_]+)/g)].map((m) => m[1]!);
}

function tablesRlsEnabled(sql: string): string[] {
  return [...sql.matchAll(/alter table public\.([a-z_]+) enable row level security/g)].map((m) => m[1]!);
}

/**
 * Walks the sequence in filename order, applying `drop policy` before
 * `create policy`, so what is asserted is the state a finished push leaves
 * behind rather than anything a single file says.
 */
function livePolicies(): Map<string, Policy> {
  const live = new Map<string, Policy>();
  const problems: string[] = [];

  for (const { file, sql } of sequence) {
    for (const m of sql.matchAll(/drop policy if exists "([^"]+)" on public\.([a-z_]+)/g)) {
      live.delete(`${m[2]}::${m[1]}`);
    }
    for (const m of sql.matchAll(/create policy "([^"]+)" on public\.([a-z_]+)(.*?);/g)) {
      const key = `${m[2]}::${m[1]}`;
      if (live.has(key)) problems.push(`${file}: policy "${m[1]}" is created twice on ${m[2]}`);
      live.set(key, { table: m[2]!, name: m[1]!, clause: m[3]! });
    }
  }

  assert.deepEqual(problems, [], 'the migration sequence must not create one policy name twice on a table');
  return live;
}

const policies = livePolicies();

test('the sequence is the seven reviewed files, in order', () => {
  assert.deepEqual(
    sequence.map((s) => s.file),
    [
      '0001_init.sql',
      '0002_rls.sql',
      '0003_admin_accounts_reviews.sql',
      '0004_inquiry_status_guard.sql',
      '0005_privilege_guards.sql',
      '0006_payments.sql',
      '0007_profile_theme.sql'
    ]
  );
});

test('every table the sequence creates is protected by RLS and has a policy', () => {
  const created = new Set(sequence.flatMap((s) => tablesCreated(s.sql)));
  const enabled = new Set(sequence.flatMap((s) => tablesRlsEnabled(s.sql)));

  // auth.users belongs to Supabase and is never created here. 0006 adds
  // payments and payment_events on top of the original seventeen.
  assert.ok(created.size >= 19, `expected at least the 19 application tables, found ${created.size}`);

  for (const table of created) {
    assert.ok(enabled.has(table), `public.${table} is created but never enabled for row level security`);
    const count = [...policies.keys()].filter((k) => k.startsWith(`${table}::`)).length;
    assert.ok(count > 0, `public.${table} has row level security enabled but no policy survives the sequence`);
  }
});

test('no table holding personal or privileged data stays readable with using (true)', () => {
  const privateTables = [
    'profiles',
    'group_members',
    'inquiries',
    'inquiry_events',
    'payments',
    'payment_events',
    'listing_reports',
    'reviews',
    'group_contributions',
    'audit_logs',
    'contact_messages'
  ];
  for (const [key, policy] of policies) {
    const [, table] = key.split('::');
    if (!privateTables.includes(table!)) continue;
    assert.equal(
      /using \(true\)/.test(policy.clause),
      false,
      `policy "${policy.name}" leaves public.${table} readable by any key`
    );
  }
});

test('no policy grants the whole table to anyone for every command', () => {
  for (const [key, policy] of policies) {
    const isFullAccess = /for all/.test(policy.clause) && /using \(true\)/.test(policy.clause);
    assert.equal(isFullAccess, false, `policy "${key}" is for all with using (true)`);
  }
});

test('the guarded columns are guarded by triggers, not only by policies', () => {
  const all = sequence.map((s) => s.sql).join(' ');
  const required = [
    // role, verification, status and the platform_administrator label on profiles
    'create trigger profiles_privileged_columns',
    // a signup cannot arrive already holding admin or coordinator
    'create trigger profiles_guard_admin_insert',
    // verification and featured on listings
    'create trigger listings_privileged_columns',
    // an inquiry keeps the terms it was submitted with
    'create trigger inquiries_terms_frozen',
    // an event can only be written by the side it names
    'create trigger inquiry_events_actor_honest',
    // suspended accounts cannot write
    'create trigger listings_suspended_writer',
    // a payment attempt takes its money terms from the stored inquiry
    'create trigger payments_terms_from_inquiry',
    // and keeps them, and cannot be moved into an outcome it cannot attest to
    'create trigger payments_terms_frozen'
  ];
  for (const statement of required) {
    assert.ok(all.includes(statement), `missing ${statement}`);
  }
});

test('the helpers that read profiles are SECURITY DEFINER with a pinned search_path', () => {
  const all = sequence.map((s) => s.sql).join(' ');
  // Without SECURITY DEFINER these self-reference and Postgres aborts with an
  // infinite-recursion policy error; without the pinned search_path they would
  // be search_path injectable.
  for (const fn of ['public.current_profile_id()', 'public.is_admin()']) {
    const name = fn.split('(')[0]!.replace('public.', '');
    assert.match(
      all,
      new RegExp(`create or replace function public\\.${name}\\b[^;]*?security definer set search_path = public`),
      `${fn} must be SECURITY DEFINER with a pinned search_path`
    );
  }
});

/**
 * Postgres reserves these words outright, so they cannot be used as an
 * identifier unless quoted. A function parameter named one of them is a parse
 * error at CREATE FUNCTION — and neither reading the file nor `db push --dry-run`
 * finds it, because a dry run only lists the pending versions and never sends
 * the SQL through the parser. This is the check that `0002_rls.sql`'s
 * `in_group(group uuid)` needed before it was applied to a real project.
 */
const PG_RESERVED_WORDS = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric', 'authorization',
  'binary', 'both', 'case', 'cast', 'check', 'collate', 'collation', 'column', 'concurrently',
  'constraint', 'create', 'cross', 'current_catalog', 'current_date', 'current_role',
  'current_schema', 'current_time', 'current_timestamp', 'current_user', 'default', 'deferrable',
  'desc', 'distinct', 'do', 'else', 'end', 'except', 'false', 'fetch', 'filter', 'for', 'foreign',
  'from', 'full', 'grant', 'group', 'having', 'ilike', 'in', 'initially', 'inner', 'intersect',
  'into', 'is', 'isnull', 'join', 'leading', 'left', 'like', 'limit', 'localtime', 'localtimestamp',
  'natural', 'not', 'notnull', 'null', 'offset', 'on', 'only', 'or', 'order', 'outer', 'over',
  'partition', 'placing', 'references', 'returning', 'right', 'select', 'session_user', 'some',
  'symmetric', 'table', 'tablesample', 'then', 'to', 'trailing', 'true', 'union', 'unique', 'user',
  'using', 'variadic', 'verbose', 'when', 'where', 'window', 'with'
]);

function functionDeclarations(sql: string): { name: string; params: string }[] {
  return [...sql.matchAll(/create (?:or replace )?function public\.([a-z_]+)\s*\(([^)]*)\)/g)].map((m) => ({
    name: m[1]!,
    params: m[2]!
  }));
}

function parameterNames(fn: { name: string; params: string }): string[] {
  return fn.params
    .split(',')
    .map((arg) => arg.trim())
    .filter(Boolean)
    // Drop the argument mode, then keep the leading bare word: a quoted
    // identifier ("group") is legal and is not collected here.
    .map((arg) => arg.replace(/\b(in|out|inout|variadic)\b/gi, ' ').trim())
    .map((arg) => (arg.match(/^([a-z_][a-z0-9_]*)\b/) ?? [])[1])
    .filter((word): word is string => Boolean(word));
}

test('no function declares a parameter named with a reserved word', () => {
  for (const { file, sql } of sequence) {
    for (const fn of functionDeclarations(sql)) {
      for (const param of parameterNames(fn)) {
        assert.equal(
          PG_RESERVED_WORDS.has(param),
          false,
          `${file}: public.${fn.name}(${fn.params}) uses the reserved word "${param}" as a parameter name — Postgres refuses to parse it`
        );
      }
    }
  }
});

test('the sequence declares exactly the functions the policies and triggers need', () => {
  const declared = new Set(sequence.flatMap(({ sql }) => functionDeclarations(sql).map((fn) => fn.name)));
  assert.deepEqual([...declared].sort(), [
    'current_profile_id',
    'guard_admin_insert',
    'guard_suspended_writer',
    'inquiry_event_actor_is_honest',
    'inquiry_terms_are_frozen',
    'is_admin',
    'listing_privileges_are_granted',
    'payment_attempt_takes_its_terms',
    'payment_terms_are_frozen',
    'protected_columns_changed',
    'require_contact_consent',
    'set_updated_at'
  ]);
});

test('0005 replaces the permissive policies it names instead of adding near-duplicates', () => {
  const dropped = new Set(
    [...sequence.find((s) => s.file === '0005_privilege_guards.sql')!.sql.matchAll(/drop policy if exists "([^"]+)" on public\.([a-z_]+)/g)].map(
      (m) => `${m[2]}::${m[1]}`
    )
  );
  for (const key of [
    'inquiry_events::System/seller appends events',
    'audit_logs::Append own audit entries',
    'group_members::Members readable'
  ]) {
    assert.ok(dropped.has(key), `0005 must drop the policy it replaces: ${key}`);
    assert.equal(policies.has(key), false, `${key} must not survive the sequence`);
  }
});

test('the guest inquiry path is the only access 0005 adds', () => {
  const guard = sequence.find((s) => s.file === '0005_privilege_guards.sql')!.sql;
  assert.ok(
    policies.get('inquiry_events::Participants append events, guests append their own creation')?.clause.includes(
      'public.current_profile_id() is null'
    ),
    'a visitor with no profile must still be able to record the inquiry they submitted'
  );
  assert.ok(guard.includes("and inquiry_events.kind = 'created'"), 'the guest allowance is bounded to the created event');
  assert.ok(guard.includes("and i.status = 'new'"), 'the guest allowance is bounded to an inquiry nobody owns yet');
});

test('0006 keeps a payment attempt owned, pending, and priced by the inquiry', () => {
  const insert = policies.get('payments::Buyer opens an attempt on their own inquiry');
  assert.ok(insert, 'the buyer needs an insert policy that is scoped to their own inquiry');
  assert.ok(insert!.clause.includes('buyer_profile_id = public.current_profile_id()'), 'a buyer may only open an attempt on their own inquiry');
  assert.ok(insert!.clause.includes("status = 'pending'"), 'a fresh row may not arrive already claiming an outcome');

  const guard = sequence.find((s) => s.file === '0006_payments.sql')!.sql;
  assert.ok(guard.includes('new.amount_cents := i.estimated_subtotal_cents'), 'the amount is copied from the stored inquiry');
  assert.ok(guard.includes("raise exception 'An outcome of %"), 'a client session is refused the provider-owned outcomes');

  // Money records are evidence: 0006 gives neither table a DELETE policy, so a
  // mistaken confirmation is answered by a refund that leaves both records.
  for (const table of ['payments', 'payment_events']) {
    const deletable = [...policies.values()].filter((p) => p.table === table && /for delete/.test(p.clause));
    assert.deepEqual(deletable, [], `public.${table} must not gain a delete policy in this sequence`);
  }

  // The duplicate-charge guard is a constraint, not an application check, so it
  // holds under two simultaneous requests.
  assert.ok(guard.includes('create unique index payments_one_confirmed_per_inquiry'), 'one confirmed payment per inquiry');
  assert.ok(guard.includes('create unique index payments_one_open_attempt_per_inquiry'), 'one open attempt per inquiry');
  assert.ok(guard.includes("provider_event_id text unique"), 'a replayed webhook cannot insert a second event line');
});

test('the categories seed only inserts, so a re-run cannot duplicate a slug', () => {
  const seed = flatten(readFileSync(join(process.cwd(), 'supabase', 'seed.sql'), 'utf8'));
  assert.match(seed, /on conflict/i, 'seed.sql must be idempotent');
});
