-- OmoNetTab 0008: the optional mobile app lock.
--
-- NOT APPLIED to any live database. It is written for review, and the application
-- reads it only when it is present: in demo mode the lock is not offered at all,
-- and in Supabase mode an account whose settings row is missing is treated as
-- "lock never configured". Apply it by pasting this whole file into the Supabase
-- SQL Editor (or with `supabase db push`) only after you have read it. 0006 and
-- 0007 may also still be pending; apply them first if they are.
--
-- What this feature is, stated exactly:
--
--   An owner can require a step-up before OmoNetTab shows their own account area on
--   this device. The step-up is either a device-bound WebAuthn credential — which
--   the platform completes with a fingerprint, a face scan, or the device passcode,
--   at the platform's choosing — or a separate lock password verified by the server.
--
-- What this feature is NOT, because saying so here is cheaper than discovering it:
--
--   It is not a second database. Row Level Security is unchanged: whoever presents a
--   valid Supabase access token is, to Postgres, that account, and can read and write
--   exactly the rows 0002 already lets that account touch. So a lock does not hide
--   data from someone who has extracted the bearer token and is talking to the REST
--   endpoint by hand. What it does protect is the *application*: the authority for
--   "this session is locked" is an HMAC-signed cookie the browser cannot read
--   (httpOnly) and cannot mint (the secret never leaves the server), and the
--   credential check behind it is verified server-side, not in JavaScript.
--
--   That separation is why no column here says "locked". Lock state for a live
--   session lives in the signed envelope, not in a row, precisely because a row is
--   writable by the account's own token and a signed envelope is not. A device
--   holder who edits `enabled` with a hand-made PATCH gains nothing: the next
--   account-area request still has to present an envelope the server signed.

-- Settings, one row per account ------------------------------------------------

create table if not exists public.app_lock_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- False is the default and the honest state: nothing is enforced until the owner
  -- turns it on, and turning it off is always possible from inside the account.
  enabled boolean not null default false,

  -- Which step-up this account accepts.
  --   webauthn  : a device credential only (recovery is signing out and back in)
  --   password  : the lock password only
  --   either    : both, so a lost or changed enrollment never becomes a dead end
  method text not null default 'either'
    check (method in ('webauthn', 'password', 'either')),

  -- Behaviour choices. `lock_on_background` asks the app to re-lock when the tab or
  -- installed window is hidden; `idle_minutes` is 0 for "never by idle" and
  -- otherwise how long an unlocked stretch may last before the app asks again;
  -- `grant_minutes` is the server-side lifetime of an unlock, which is what actually
  -- bounds exposure when the page never runs any script (app killed, JS off).
  lock_on_background boolean not null default true,
  idle_minutes smallint not null default 0
    check (idle_minutes between 0 and 720),
  grant_minutes smallint not null default 15
    check (grant_minutes between 1 and 720),

  -- scrypt digest, formatted scrypt$N$r$p$salt$hash. The application derives it in
  -- Node with crypto.scrypt and a per-account random salt; the plaintext password is
  -- never stored anywhere, never logged, and never sent to the browser.
  --
  -- Readable by the account's own token (RLS below), so a stolen live session can be
  -- taken offline for a cracking attempt. That is the same session that already reads
  -- every row in this table, so the bar being raised here is password strength, and
  -- the parameters (N=16384, r=8, p=1, 64-byte digest) are chosen to make offline
  -- guessing expensive rather than impossible.
  password_hash text
    check (
      password_hash is null
      or password_hash ~ '^scrypt[$][0-9]+[$][0-9]+[$][0-9]+[$][0-9a-f]{64}[$][0-9a-f]{128}$'
    ),
  password_set_at timestamptz,

  -- Failed-attempt backoff, enforced by the application on its own unlock endpoint.
  -- Not trigger-guarded, and that is deliberate: a legitimate successful unlock has to
  -- be able to reset the counter, and Postgres cannot tell that write apart from the
  -- account holder's own hand-made one. So these columns slow down guessing through
  -- the app; they are not a boundary against a determined holder of this device and
  -- this token, and no user-facing copy should claim otherwise.
  failed_attempts smallint not null default 0
    check (failed_attempts between 0 and 1000),
  locked_until timestamptz,

  created_at timestamptz not null default now(),

  -- A timestamp, and nothing more in the database. In the application it is the
  -- *policy instant*: `resolveLockForActor()` compares a session's signed unlock window
  -- against it, so a window minted before this row was last written stops being trusted
  -- once the row says the policy moved. Two consequences for whoever writes SQL here.
  --  1. Any `update` of this row — including one that changes nothing else — invalidates
  --     every device's open window at its next re-check. That is intended for the routes
  --     that stamp a policy change deliberately (`touchLockPolicy()`, called by "Lock
  --     now" and by revoking a credential), and it is why the attempt counter does *not*
  --     move this column: a typo on a password screen must not log out the account
  --     holder's other phones.
  --  2. `failed_attempts` and `locked_until` are therefore written with an update that
  --     leaves `updated_at` alone. A future trigger that refreshes it on every write
  --     would turn each failed password into a fleet-wide relock.
  updated_at timestamptz not null default now()
);

-- Device credentials -----------------------------------------------------------

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- rawId of the credential, base64url, unique so one credential cannot be enrolled
  -- under two accounts.
  credential_id text not null unique,
  -- COSE public key, base64url, as the attestation verification returned it.
  public_key text not null,
  counter bigint not null default 0,

  -- The authenticator's own answer, kept in the spec's words rather than shorter ones
  -- invented here: 'singleDevice' never leaves the phone, 'multiDevice' can sync.
  credential_device_type text check (credential_device_type in ('singleDevice', 'multiDevice')),
  credential_backed_up boolean,
  transports text[],
  aaguid text,

  -- The owner's own label for the row ("This phone"), so a second enrollment is
  -- recognisable. Free text on purpose and never used for anything but display.
  label text not null default 'This device' check (char_length(label) between 1 and 60),

  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists webauthn_credentials_user_id_idx
  on public.webauthn_credentials (user_id);

-- Row Level Security ------------------------------------------------------------
--
-- Owner-only, in both directions, and deliberately with no administrator policy:
-- an administrator can suspend an account but cannot read someone's lock password
-- hash, list their enrolled devices, or switch their lock off. Recovery from a lost
-- credential is the account's own Supabase password (sign out, sign in) and, if that
-- is gone, the existing email reset flow — never a back door in this table.

alter table public.app_lock_settings enable row level security;
alter table public.webauthn_credentials enable row level security;

create policy "Owners read their own app lock settings"
  on public.app_lock_settings for select
  using (user_id = auth.uid());

-- Insert and update are merged into one `for all` policy per table, the same shape
-- 0002 uses for profiles. A separate insert policy would also have to allow the
-- first row to be created by the account itself, which is exactly what `for all`
-- with these two expressions already does.
create policy "Owners manage their own app lock settings"
  on public.app_lock_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Owners read their own device credentials"
  on public.webauthn_credentials for select
  using (user_id = auth.uid());

create policy "Owners manage their own device credentials"
  on public.webauthn_credentials for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A lock you cannot get out of is a defect, not a feature -----------------------
--
-- The application checks this at save time too, but the check belongs here as well:
-- hiding a button is not a security boundary, and a hand-made request with the
-- public key should not be able to create an enabled lock with no way back in.
--
-- A trigger is used rather than a table constraint because the answer needs the
-- other table: method 'webauthn' is only safe when at least one credential exists.
create or replace function public.app_lock_requires_a_way_back_in()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  credential_count integer;
begin
  -- Turning the lock off never needs proof of a way back in: that is the recovery
  -- path itself, and it is reachable from inside an unlocked session.
  if not new.enabled then
    return new;
  end if;

  if new.method = 'password' then
    if new.password_hash is null then
      raise exception 'app lock method "password" needs a lock password set first'
        using hint = 'Set the password, or choose method ''webauthn''.';
    end if;
    return new;
  end if;

  if new.method = 'webauthn' then
    select count(*) into credential_count
      from public.webauthn_credentials
      where user_id = new.user_id;
    if credential_count = 0 then
      raise exception 'app lock method "webauthn" needs an enrolled device'
        using hint = 'Enroll this device first, or choose method ''password''.';
    end if;
    return new;
  end if;

  -- 'either': one working door is enough, so an account that enrolled a device and
  -- never set a password is not refused, and neither is the reverse.
  if new.password_hash is not null then
    return new;
  end if;
  select count(*) into credential_count
    from public.webauthn_credentials
    where user_id = new.user_id;
  if credential_count = 0 then
    raise exception 'app lock method "either" needs a lock password or an enrolled device'
      using hint = 'Set a password, or enroll this device, before turning the lock on.';
  end if;

  return new;
end $$;

create trigger app_lock_requires_a_way_back_in
  before insert or update of enabled, method, password_hash
  on public.app_lock_settings
  for each row execute function public.app_lock_requires_a_way_back_in();

comment on table public.app_lock_settings is
  'Per-account app lock: which step-up is required, when to re-lock, the scrypt lock-password digest, and the failed-attempt backoff. Owner-only RLS. Lock state for a live session is NOT stored here; it is an HMAC-signed httpOnly cookie the account token cannot mint.';

comment on table public.webauthn_credentials is
  'Device-bound WebAuthn credentials for the app lock. Stores the credential id and COSE public key only; verification happens server-side in the route handler, never in JavaScript.';

comment on column public.app_lock_settings.grant_minutes is
  'Server-side lifetime of one unlock. Bounds exposure when no script runs at all, so it is the number that actually matters; idle_minutes and lock_on_background only make the app ask sooner.';

comment on column public.app_lock_settings.failed_attempts is
  'Guessing backoff for the application unlock endpoint. Slows down the real path; it is not a boundary against a hand-written request from the account''s own token.';
