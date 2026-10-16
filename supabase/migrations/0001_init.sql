-- OmoLink initial schema
-- Supabase PostgreSQL — target version: postgres 15
--
-- Money model: every amount is stored as an INTEGER number of minor units
-- (cents), 1 ETB = 100 cents. This is decimal-safe (no floating point anywhere)
-- and matches the application layer exactly, so no rounding happens at the
-- boundary. PostgREST returns these as JSON numbers, never as numeric strings
-- that would need parsing.
--
-- This migration has not been applied to any project yet; it is edited in place
-- rather than superseded by a follow-up ALTER migration.

create extension if not exists "pgcrypto";

create type producer_type as enum (
  'artisan', 'farmer', 'producer_group', 'cooperative',
  'guide', 'tourism_operator', 'household', 'other'
);

create type listing_kind as enum ('product', 'service');
create type unit_of_sale as enum ('item', 'kg', 'bundle', 'liter', 'person', 'group', 'package', 'day', 'service');
create type availability_status as enum ('available', 'limited', 'made_to_order', 'seasonal', 'unavailable');
create type verification_status as enum ('unverified', 'pending_review', 'verified');
create type inquiry_status as enum ('new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled');
create type inquiry_actor as enum ('buyer', 'seller', 'system');
create type contribution_status as enum ('pending', 'confirmed', 'withdrawn');
create type opportunity_status as enum ('open', 'closing_soon', 'closed', 'fulfilled', 'cancelled');
create type report_status as enum ('open', 'reviewing', 'resolved', 'rejected');
create type verification_decision as enum ('approved', 'rejected', 'needs_more_info');
create type user_role as enum ('buyer', 'producer', 'coordinator', 'admin');

-- Users are Supabase auth users. public.profiles mirrors auth.users for RLS and
-- stores producer-facing data. Demo-mode profiles never enter this table.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 200),
  producer_type producer_type not null default 'other',
  community text not null,
  operating_area text not null,
  preferred_language text not null default 'en',
  contact_method jsonb not null default '{"kind":"in_app"}'::jsonb,
  short_bio text not null check (char_length(short_bio) >= 0),
  categories text[] not null default '{}',
  image_url text,
  consent_to_publish boolean not null default false,
  verification verification_status not null default 'unverified',
  verification_note text,
  role user_role not null default 'producer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (community);
create index on public.profiles (verification);

create table public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  kind listing_kind not null default 'product',
  description text
);

create table public.producer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  community text not null,
  description text,
  coordinator_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.producer_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind listing_kind not null,
  title text not null check (char_length(title) between 4 and 200),
  description text not null check (char_length(description) between 20 and 4000),
  category_id text not null references public.categories (id) on delete restrict,
  producer_id uuid not null references public.profiles (id) on delete cascade,
  community text not null,
  -- Explicit unit price in integer cents. Never includes a hidden fee.
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  unit unit_of_sale not null default 'item',
  available_quantity integer not null default 0 check (available_quantity >= 0),
  min_order_quantity integer not null default 1 check (min_order_quantity >= 1),
  availability availability_status not null default 'available',
  pickup_options text[] not null default '{}',
  delivery_available boolean not null default false,
  tourism_meta jsonb,
  published boolean not null default false,
  verification verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.listings (category_id);
create index on public.listings (producer_id);
create index on public.listings (community);
create index on public.listings (published, availability);
create index on public.listings using gin (to_tsvector('simple', title || ' ' || description));

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  caption text,
  src text not null,
  alt text not null,
  consent_recorded boolean not null default false,
  is_sample boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.listing_images (listing_id);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_name text not null,
  buyer_contact text not null,
  quantity integer not null check (quantity >= 1),
  unit unit_of_sale not null,
  -- Snapshot of the price at the time of inquiry, in integer cents,
  -- so a later price change cannot silently alter an agreed estimate.
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  estimated_subtotal_cents bigint not null check (estimated_subtotal_cents >= 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  preference text not null check (preference in ('pickup','delivery','booking','unsure')),
  preferred_date date,
  message text,
  status inquiry_status not null default 'new',
  idempotency_key text unique,
  buyer_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.inquiries (listing_id);
create index on public.inquiries (buyer_profile_id);
create index on public.inquiries (status);

create table public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  at timestamptz not null default now(),
  actor inquiry_actor not null,
  kind text not null check (kind in ('created','status_changed','message')),
  detail text not null
);
create index on public.inquiry_events (inquiry_id, at);

create table public.collective_opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category_id text not null references public.categories (id) on delete restrict,
  unit unit_of_sale not null,
  organizing_group_id uuid references public.producer_groups (id) on delete set null,
  coordinator_profile_id uuid not null references public.profiles (id) on delete restrict,
  target_quantity integer not null check (target_quantity > 0),
  indicative_group_price_cents bigint check (indicative_group_price_cents is null or indicative_group_price_cents >= 0),
  buyer_offered_price_cents bigint check (buyer_offered_price_cents is null or buyer_offered_price_cents >= 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  pickup_plan text not null,
  transport_plan text,
  order_deadline date,
  status opportunity_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.collective_opportunities (organizing_group_id);
create index on public.collective_opportunities (status);

create table public.group_contributions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.collective_opportunities (id) on delete cascade,
  producer_profile_id uuid not null references public.profiles (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status contribution_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Prevent duplicate contributions from a producer per opportunity while
  -- still allowing historical withdrawn rows for audit.
  unique (opportunity_id, producer_profile_id) deferrable initially deferred
);
create index on public.group_contributions (opportunity_id);

create table public.transport_plans (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.collective_opportunities (id) on delete cascade,
  total_cost_cents bigint not null check (total_cost_cents >= 0),
  total_quantity integer not null check (total_quantity > 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  quote_confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  producer_profile_id uuid not null references public.profiles (id) on delete cascade,
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  author_name text not null,
  created_at timestamptz not null default now(),
  unique (inquiry_id, author_name)
);

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reason text not null,
  reporter_name text not null,
  reporter_contact text not null,
  status report_status not null default 'open',
  admin_note text,
  created_at timestamptz not null default now()
);
create index on public.listing_reports (status);

create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_profile_id uuid not null references public.profiles (id) on delete restrict,
  decision verification_decision not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index on public.verification_reviews (profile_id);

-- Trigger to maintain updated_at.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings for each row execute function public.set_updated_at();
create trigger inquiries_updated_at before update on public.inquiries for each row execute function public.set_updated_at();
create trigger opportunities_updated_at before update on public.collective_opportunities for each row execute function public.set_updated_at();
create trigger contributions_updated_at before update on public.group_contributions for each row execute function public.set_updated_at();
