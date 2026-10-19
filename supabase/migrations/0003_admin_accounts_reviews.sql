-- OmoLink: administration, accounts, reviews, and the RLS fixes that go with them.
--
-- Applied on top of 0001_init.sql and 0002_rls.sql. Not yet applied to any
-- project (see README "Supabase rollout"), so this file is reviewed as part of
-- the pending rollout rather than claimed as live.
--
-- Two things here are security fixes, not features:
--   1. 0002 gave users a "for all" policy on their own profile row, which let a
--      user UPDATE role = 'admin'. The privileged_columns() trigger below makes
--      role, verification and status unwritable by anyone except an existing
--      administrator, whatever the policy says.
--   2. 0002 let anyone insert a review on any completed inquiry. The policy now
--      requires that the reviewer owns the inquiry.

-- =========================================================================
-- 1. Columns
-- =========================================================================

alter table public.profiles
  add column if not exists account_kind text not null default 'individual_buyer',
  add column if not exists status text not null default 'active',
  add column if not exists organization_name text;

alter table public.profiles
  add constraint profiles_account_kind_check
  check (account_kind in ('tourist','individual_buyer','business_buyer','producer','group_or_cooperative','platform_admin'));

alter table public.profiles
  add constraint profiles_status_check check (status in ('active','suspended'));

alter table public.profiles
  add constraint profiles_admin_kind_check
  check (role <> 'admin' or account_kind = 'platform_admin');

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

alter table public.listings
  add column if not exists featured boolean not null default false,
  add column if not exists archived boolean not null default false;

create index if not exists listings_featured_idx on public.listings (featured) where published = true and archived = false;

alter table public.categories
  add column if not exists icon text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists active boolean not null default true;

create index if not exists categories_sort_idx on public.categories (sort_order);

alter table public.reviews
  add column if not exists status text not null default 'published',
  add column if not exists moderation_note text,
  add column if not exists author_profile_id uuid references public.profiles (id) on delete set null;

alter table public.reviews
  add constraint reviews_status_check check (status in ('published','hidden'));

alter table public.reviews add constraint reviews_rating_range check (rating between 1 and 5);

-- =========================================================================
-- 2. New tables
-- =========================================================================

-- One row of admin-editable content and appearance. A single document rather
-- than a key/value table: the shape is known, validated by the application, and
-- read on every public page.
create table if not exists public.site_settings (
  id text primary key default 'site' check (id = 'site'),
  settings jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid references public.profiles (id) on delete set null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  actor_name text not null,
  action text not null check (action in (
    'role_changed','account_suspended','account_reactivated','verification_decision',
    'listing_moderated','listing_featured','category_changed','site_settings_changed',
    'report_resolved','review_moderated','record_archived'
  )),
  record_type text not null check (record_type in ('profile','listing','category','settings','report','review','opportunity')),
  record_id text not null,
  -- A human-readable summary only. Passwords, tokens and keys must never be
  -- written here; the application composes these strings from names and ids.
  summary text not null
);
create index if not exists audit_logs_at_idx on public.audit_logs (at desc);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  subject text not null default 'General enquiry',
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new','handled')),
  created_at timestamptz not null default now()
);

insert into public.site_settings (id, settings)
values ('site', '{
  "siteName": "OmoLink",
  "tagline": "A community marketplace for South Omo producers, guides and buyers.",
  "heroTitle": "Sell directly. Price transparently. Deliver together.",
  "heroDescription": "OmoLink connects producers, artisan groups, and local guides in the South Omo area with visitors, shops, hotels and institutions.",
  "announcementBar": {"enabled": false, "text": ""},
  "featuredProductIds": [],
  "featuredServiceIds": [],
  "featuredProducerIds": [],
  "homepageSections": [],
  "contactEmail": "",
  "contactPhone": "",
  "addressNote": "",
  "socialLinks": [],
  "footerNote": "",
  "accentColor": "#b2542a"
}'::jsonb)
on conflict (id) do nothing;

-- =========================================================================
-- 3. Privileged-column protection
-- =========================================================================

create or replace function public.protected_columns_changed()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role
     or new.verification is distinct from old.verification
     or new.status is distinct from old.status then
    -- is_admin() reads auth.uid() against the stored row, so the person who
    -- created the row cannot use it to promote themselves.
    if not public.is_admin() then
      raise exception 'Only an administrator may change role, verification, or account status'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_privileged_columns
  before update on public.profiles
  for each row execute function public.protected_columns_changed();

-- An admin cannot be created by an INSERT from an unprivileged caller either.
-- The first administrator is provisioned by SQL, documented in the README; from
-- then on, role changes go through an existing administrator. A 'coordinator'
-- role carries the power to open collective opportunities for a group, so it is
-- protected the same way: signing up never grants it.
create or replace function public.guard_admin_insert()
returns trigger language plpgsql as $$
begin
  if new.role in ('admin', 'coordinator') and not public.is_admin() then
    raise exception 'Administrator and coordinator accounts are assigned by an existing administrator'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_insert
  before insert on public.profiles
  for each row execute function public.guard_admin_insert();

-- A suspended account cannot keep writing. Checked on update because the row
-- that is being suspended has to stay writable by its owner.
create or replace function public.guard_suspended_writer()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.profiles p
    where p.id = public.current_profile_id() and p.status = 'suspended'
  ) then
    raise exception 'Suspended accounts cannot write' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger listings_suspended_writer before insert or update on public.listings
  for each row execute function public.guard_suspended_writer();
create trigger inquiries_suspended_writer before insert or update on public.inquiries
  for each row execute function public.guard_suspended_writer();
create trigger contributions_suspended_writer before insert or update on public.group_contributions
  for each row execute function public.guard_suspended_writer();

-- A contact detail is only ever stored when the owner recorded consent. Without
-- this, a consent=false phone number would stay readable in the raw table even
-- though the interface hides it.
create or replace function public.require_contact_consent()
returns trigger language plpgsql as $$
begin
  if new.contact_method is not null
     and new.contact_method ->> 'kind' in ('phone', 'email')
     and (new.contact_method ->> 'consent') is distinct from 'true' then
    new.contact_method := '{"kind":"in_app"}'::jsonb;
  end if;
  return new;
end;
$$;

create trigger profiles_contact_consent
  before insert or update on public.profiles
  for each row execute function public.require_contact_consent();

-- =========================================================================
-- 4. RLS changes
-- =========================================================================

alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_messages enable row level security;

-- Profiles: 0002 gave every visitor read access to every profile row and gave
-- the owner a blanket "for all" policy. Replace both. A buyer's profile is
-- private data, so only selling accounts are public; the owner and an
-- administrator can always see their own row.
drop policy if exists "Producers manage their own profile" on public.profiles;
drop policy if exists "Public profiles are readable" on public.profiles;

create policy "Selling profiles public, own profile always, admins all"
  on public.profiles for select
  using (role in ('producer', 'coordinator') or user_id = auth.uid() or public.is_admin());

create policy "Owner inserts own profile" on public.profiles for insert
  with check (user_id = auth.uid());

create policy "Owner updates own profile" on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Listings: an archived listing leaves the public marketplace.
drop policy if exists "Published listings readable by everyone" on public.listings;
create policy "Published listings readable by everyone" on public.listings for select
  using (
    (published = true and archived = false)
    or producer_id = public.current_profile_id()
    or public.is_admin()
  );

drop policy if exists "Images of readable listings are readable" on public.listing_images;
create policy "Images of readable listings are readable" on public.listing_images for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and ((l.published = true and l.archived = false)
        or l.producer_id = public.current_profile_id()
        or public.is_admin())
  ));

-- Categories: deactivate rather than delete when still referenced.
create policy "Category delete blocked while referenced" on public.categories for delete
  using (public.is_admin() and not exists (
    select 1 from public.listings l where l.category_id = categories.id
  ) and not exists (
    select 1 from public.collective_opportunities o where o.category_id = categories.id
  ));

-- Inquiries: the buyer may update their own inquiry (cancellation), and only for
-- the fields the workflow allows; status rules are enforced by the application.
create policy "Buyer updates own inquiry" on public.inquiries for update
  using (buyer_profile_id = public.current_profile_id())
  with check (buyer_profile_id = public.current_profile_id());

-- Reviews: only the buyer on a completed inquiry, about their own listing.
drop policy if exists "Reviews are readable" on public.reviews;
drop policy if exists "Buyer creates review only after completed inquiry" on public.reviews;
create policy "Buyer creates own review after completed inquiry" on public.reviews for insert
  with check (
    author_profile_id = public.current_profile_id()
    and exists (
      select 1 from public.inquiries i
      where i.id = inquiry_id
        and i.status = 'completed'
        and i.buyer_profile_id = public.current_profile_id()
        and i.listing_id = reviews.listing_id
    )
  );

create policy "Published reviews readable" on public.reviews for select
  using (status = 'published' or public.is_admin());

create policy "Admins moderate reviews" on public.reviews for update
  using (public.is_admin())
  with check (public.is_admin());

-- Reports: admins moderate. A reporter may submit but cannot read the report
-- back — there is no reporter-scoped select policy here, and the application
-- never shows a visitor their own submission. 0005 leaves this as it is.
drop policy if exists "Admins read reports" on public.listing_reports;
create policy "Admins read reports" on public.listing_reports for select
  using (public.is_admin());

create policy "Admins moderate reports" on public.listing_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Site settings: public read, admin write.
create policy "Site settings readable" on public.site_settings for select using (true);
create policy "Admins write site settings" on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- Audit logs: admin-only to read. Anyone may append an entry about their own
-- action, and an administrator may append any entry.
create policy "Admins read audit logs" on public.audit_logs for select using (public.is_admin());
create policy "Append own audit entries" on public.audit_logs for insert with check (
  public.is_admin() or actor_profile_id = public.current_profile_id()
);

-- Contact messages: anyone may send; only admins may read or triage.
create policy "Anyone sends a message" on public.contact_messages for insert with check (true);
create policy "Admins read messages" on public.contact_messages for select using (public.is_admin());
create policy "Admins triage messages" on public.contact_messages for update
  using (public.is_admin()) with check (public.is_admin());

-- Contributions: allow the contributor to withdraw their own row by deleting it
-- from the active set (status update) — already covered — plus admin visibility.
drop policy if exists "Contributions on readable opportunities are readable" on public.group_contributions;
create policy "Contributions readable to participants and admins" on public.group_contributions for select
  using (
    public.is_admin()
    or producer_profile_id = public.current_profile_id()
    or exists (
      select 1 from public.collective_opportunities o
      where o.id = opportunity_id
        and (o.coordinator_profile_id = public.current_profile_id() or public.is_admin())
    )
  );
