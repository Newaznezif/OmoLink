-- OmoNetTab 0007: remember each account's own colour scheme.
--
-- NOT APPLIED to any live database. It is written for review, and the application
-- runs without it: the browser cookie carries the scheme, and an account write that
-- the missing column refuses is reported as "saved on this browser only" instead of
-- being hidden. Apply it with `supabase db push` (or by pasting this file into the
-- SQL Editor) only after you have read it. Review 0006 first if that one is also
-- still pending.
--
-- Why a column and not only a cookie:
--
--   A cookie belongs to the browser. Signing in on a phone, a work computer or
--   after clearing site data would silently drop the choice back to light. The
--   scheme is a small piece of the account's own settings, like
--   preferred_language, so it is stored beside it and handed back to the browser
--   at sign-in.
--
-- Why a check constraint:
--
--   The value decides a class name written on <html> by a server render. The
--   application already refuses anything but 'light' and 'dark' before it reads
--   the stored row (isThemePreference in src/lib/theme.ts), but Row Level Security
--   and this constraint are what hold when a request is made by hand with the anon
--   key rather than through the app. Hiding a button is not a security boundary.
--
-- Nullable on purpose: a profile that never chose a scheme has no stored value,
-- and "never asked" is a different fact from "asked for light". The application
-- shows such an account its browser's choice rather than rewriting the row.

alter table public.profiles
  add column if not exists theme text;

-- Backfill is intentionally absent: existing rows stay NULL, which the app reads
-- as "this account has not chosen".

alter table public.profiles
  drop constraint if exists profiles_theme_check;
alter table public.profiles
  add constraint profiles_theme_check
  check (theme is null or theme in ('light', 'dark'));

-- The two writers are the account's own PATCH /api/profile path and the theme
-- server action, both of which update the profile row of the signed-in user. The
-- existing "Producers manage their own profile" policy from 0002 covers the column:
-- the scheme is not a privileged field (role, status, account_kind and verification
-- stay guarded by 0003's trigger), so no policy change is needed here and none is
-- made.
--
-- Worth stating plainly rather than discovering later: 0002 also gives profiles a
-- open SELECT policy, so this column is readable by any signed-in account, exactly
-- as preferred_language already is. A colour choice carries no personal information
-- and the alternative — a per-column read restriction — would need the public
-- producer pages to stop reading profiles at all. If that ever changes, this column
-- should be reviewed with it.

comment on column public.profiles.theme is
  'Account colour scheme: light, dark, or NULL when the account never chose. Read at sign-in and written to the omonettab_theme cookie; the class on <html> comes from that cookie on every later server render.';
