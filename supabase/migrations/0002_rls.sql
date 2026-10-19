-- Row Level Security for OmoLink.
-- Public visitors can read only published listings, public profiles, and
-- public categories. Producers manage their own records. Buyers access their
-- own inquiries. Sellers access inquiries for their own listings. Group
-- contributions are limited to authorized participants. Administrative
-- actions require the admin role enforced at the backend.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.producer_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_events enable row level security;
alter table public.collective_opportunities enable row level security;
alter table public.group_contributions enable row level security;
alter table public.transport_plans enable row level security;
alter table public.reviews enable row level security;
alter table public.listing_reports enable row level security;
alter table public.verification_reviews enable row level security;

-- Helper functions.
--
-- These run SECURITY DEFINER on purpose. A policy expression that reads
-- public.profiles would otherwise have RLS applied to it again, which Postgres
-- reports as "infinite recursion detected in policy for relation". Running as
-- the function owner (the migration role, not the anon key) keeps the lookup to
-- a single pass. They return values derived from auth.uid() only, so they widen
-- no access: they still describe the caller.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles where user_id = auth.uid()),
    false
  )
$$;

-- PROFILES ----------------------------------------------------------------
create policy "Public profiles are readable"
  on public.profiles for select
  using (true);

create policy "Producers manage their own profile"
  on public.profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can update verification status"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- CATEGORIES --------------------------------------------------------------
create policy "Categories are readable by everyone"
  on public.categories for select using (true);
create policy "Admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- GROUPS / MEMBERS --------------------------------------------------------
create policy "Groups are readable" on public.producer_groups for select using (true);
create policy "Coordinator or admin manages group" on public.producer_groups for all
  using (coordinator_profile_id = public.current_profile_id() or public.is_admin())
  with check (coordinator_profile_id = public.current_profile_id() or public.is_admin());

create policy "Members readable" on public.group_members for select using (true);
create policy "Members joined by admin/coordinator" on public.group_members for all
  using (public.is_admin() or exists (
    select 1 from public.producer_groups g
    where g.id = group_id and g.coordinator_profile_id = public.current_profile_id()
  ))
  with check (public.is_admin() or exists (
    select 1 from public.producer_groups g
    where g.id = group_id and g.coordinator_profile_id = public.current_profile_id()
  ));

-- LISTINGS ----------------------------------------------------------------
create policy "Published listings readable by everyone"
  on public.listings for select
  using (published = true or producer_id = public.current_profile_id());

create policy "Producer creates their own listing"
  on public.listings for insert
  with check (producer_id = public.current_profile_id());

create policy "Producer updates their own listing"
  on public.listings for update
  using (producer_id = public.current_profile_id())
  with check (producer_id = public.current_profile_id());

create policy "Producer deletes their own listing"
  on public.listings for delete
  using (producer_id = public.current_profile_id());

create policy "Admins can suspend any listing"
  on public.listings for update
  using (public.is_admin())
  with check (public.is_admin());

-- IMAGES ------------------------------------------------------------------
create policy "Images of readable listings are readable"
  on public.listing_images for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.published = true or l.producer_id = public.current_profile_id())
  ));

create policy "Producer manages images on own listings"
  on public.listing_images for all
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.producer_id = public.current_profile_id()
  ))
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.producer_id = public.current_profile_id()
  ));

-- INQUIRIES ---------------------------------------------------------------
create policy "Buyer reads own inquiries"
  on public.inquiries for select
  using (buyer_profile_id = public.current_profile_id());

create policy "Seller reads inquiries on their listings"
  on public.inquiries for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.producer_id = public.current_profile_id()
  ));

create policy "Anyone can create an inquiry on a published listing"
  on public.inquiries for insert
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.published = true
  ));

create policy "Seller updates inquiry status on their listings"
  on public.inquiries for update
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.producer_id = public.current_profile_id()
  ))
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.producer_id = public.current_profile_id()
  ));

create policy "Events readable for inquiry participants"
  on public.inquiry_events for select
  using (exists (
    select 1 from public.inquiries i
    join public.listings l on l.id = i.listing_id
    where i.id = inquiry_id
      and (i.buyer_profile_id = public.current_profile_id()
        or l.producer_id = public.current_profile_id()
        or public.is_admin())
  ));

create policy "System/seller appends events"
  on public.inquiry_events for insert
  with check (exists (
    select 1 from public.inquiries i
    join public.listings l on l.id = i.listing_id
    where i.id = inquiry_id
      and (i.buyer_profile_id = public.current_profile_id()
        or l.producer_id = public.current_profile_id()
        or public.is_admin())
  ));

-- COLLECTIVE OPPORTUNITIES ------------------------------------------------
create policy "Collective opportunities readable"
  on public.collective_opportunities for select using (true);

create policy "Coordinator or admin creates opportunity"
  on public.collective_opportunities for insert
  with check (coordinator_profile_id = public.current_profile_id() or public.is_admin());

create policy "Coordinator or admin updates opportunity"
  on public.collective_opportunities for update
  using (coordinator_profile_id = public.current_profile_id() or public.is_admin())
  with check (coordinator_profile_id = public.current_profile_id() or public.is_admin());

-- CONTRIBUTIONS -----------------------------------------------------------
create policy "Contributions on readable opportunities are readable"
  on public.group_contributions for select
  using (exists (
    select 1 from public.collective_opportunities o
    where o.id = opportunity_id
  ));

create policy "Producer creates own contribution"
  on public.group_contributions for insert
  with check (
    producer_profile_id = public.current_profile_id()
    and quantity > 0
  );

create policy "Producer or coordinator updates own contribution"
  on public.group_contributions for update
  using (
    producer_profile_id = public.current_profile_id()
    or exists (
      select 1 from public.collective_opportunities o
      where o.id = opportunity_id
        and (o.coordinator_profile_id = public.current_profile_id() or public.is_admin())
    )
  )
  with check (
    producer_profile_id = public.current_profile_id()
    or exists (
      select 1 from public.collective_opportunities o
      where o.id = opportunity_id
        and (o.coordinator_profile_id = public.current_profile_id() or public.is_admin())
    )
  );

-- TRANSPORT PLANS ---------------------------------------------------------
create policy "Transport plans readable"
  on public.transport_plans for select using (true);
create policy "Coordinator or admin manages transport plans"
  on public.transport_plans for all
  using (exists (
    select 1 from public.collective_opportunities o
    where o.id = opportunity_id and (o.coordinator_profile_id = public.current_profile_id() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.collective_opportunities o
    where o.id = opportunity_id and (o.coordinator_profile_id = public.current_profile_id() or public.is_admin())
  ));

-- REVIEWS -----------------------------------------------------------------
create policy "Reviews are readable"
  on public.reviews for select using (true);
create policy "Buyer creates review only after completed inquiry"
  on public.reviews for insert
  with check (exists (
    select 1 from public.inquiries i
    where i.id = inquiry_id and i.status = 'completed'
  ));

-- REPORTS -----------------------------------------------------------------
create policy "Anyone can submit a report"
  on public.listing_reports for insert
  with check (true);
create policy "Admins read reports"
  on public.listing_reports for select
  using (public.is_admin());
create policy "Admins update reports"
  on public.listing_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- VERIFICATION REVIEWS ----------------------------------------------------
create policy "Admins read verification reviews"
  on public.verification_reviews for select using (public.is_admin());
create policy "Admins write verification reviews"
  on public.verification_reviews for insert with check (public.is_admin());
