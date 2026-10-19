-- OmoNetTab 0005: the guards the pre-push review of 0001-0004 asked for.
--
-- This file joins the sequence on top of 0001_init.sql, 0002_rls.sql,
-- 0003_admin_accounts_reviews.sql and 0004_inquiry_status_guard.sql. None of
-- those four has been pushed to a project yet — `supabase db push --dry-run`
-- against mvnaqzacecnyebwsmpho listed all four as pending — so 0005 is part of
-- the rollout plan rather than a patch to a live schema.
--
-- Every statement narrows something 0001-0004 left open, except one: the
-- inquiry_events insert policy gains the guest case, because without it the
-- public inquiry form cannot work (see section 3).
--
-- NOT TESTED. Like the rest of the sequence, nothing here has executed. A dry
-- run proves the connection and the order, never the behaviour. Before anyone
-- sets DATA_MODE=supabase against data that matters, exercise each section with
-- a throwaway non-administrator account.

-- =========================================================================
-- 1. Privileged columns on listings
-- =========================================================================
--
-- 0002's "Producer updates their own listing" checks only producer_id, and
-- listingToRow writes verification, featured and archived with every edit. The
-- application never sends the first two (src/app/api/listings/[id]/route.ts
-- builds its patch from title, price, quantity, availability, images, published
-- and archived), so this is not a bug a user can reach — it is the gap between
-- what the form offers and what a hand-made request with a producer's own key
-- can do. Verification badges and the homepage feature are the platform's to
-- grant; published and archived stay with the producer, who legitimately lists
-- and unlists their own work.

create or replace function public.listing_privileges_are_granted()
returns trigger language plpgsql as $$
declare
  inherited_verification public.verification_status;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A new listing inherits the verification of the account that owns it, which
    -- is exactly what src/app/api/listings/route.ts sends. Anything else — a
    -- producer inventing 'verified', or claiming a homepage feature — is refused.
    select p.verification into inherited_verification
      from public.profiles p
     where p.id = new.producer_id;
    if coalesce(inherited_verification, 'unverified') is distinct from new.verification then
      raise exception 'A listing inherits its verification from its producer account, which only an administrator can change'
        using errcode = '42501';
    end if;
    if new.featured then
      raise exception 'Only an administrator may feature a listing on the homepage'
        using errcode = '42501';
    end if;
  else
    if new.verification is distinct from old.verification then
      raise exception 'Only an administrator may change a listing’s verification'
        using errcode = '42501';
    end if;
    if new.featured is distinct from old.featured then
      raise exception 'Only an administrator may change the homepage feature'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger listings_privileged_columns
  before insert or update on public.listings
  for each row execute function public.listing_privileges_are_granted();

-- =========================================================================
-- 2. The platform-administrator label is not self-service either
-- =========================================================================
--
-- roleForNewAccount() and SELF_SERVICE_ACCOUNT_KINDS already keep a visitor from
-- choosing platform_admin, and 0003's profiles_admin_kind_check makes the label
-- and the role travel together. What was still open: the owner of a profile row
-- could rewrite account_kind on their own row, so /admin/users would show a
-- seller as "Platform administrator". Same trigger, one more protected column;
-- the label may change only downwards for an administrator, never upwards.

create or replace function public.protected_columns_changed()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role
     or new.verification is distinct from old.verification
     or new.status is distinct from old.status
     or (new.account_kind = 'platform_admin'
         and old.account_kind is distinct from 'platform_admin') then
    -- is_admin() reads auth.uid() against the stored row, so the person who
    -- created the row cannot use it to promote themselves.
    if not public.is_admin() then
      raise exception 'Only an administrator may change role, verification, account status, or the platform-administrator label'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- The insert guard gains the same rule, so a hand-made signup cannot arrive
-- already wearing the administrator label.
create or replace function public.guard_admin_insert()
returns trigger language plpgsql as $$
begin
  if new.role in ('admin', 'coordinator') and not public.is_admin() then
    raise exception 'Administrator and coordinator accounts are assigned by an existing administrator'
      using errcode = '42501';
  end if;
  if new.account_kind = 'platform_admin' and not public.is_admin() then
    raise exception 'The platform-administrator account kind is assigned by an existing administrator'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- =========================================================================
-- 3. Inquiry events: who may say what, and the guest inquiry that 0002 blocked
-- =========================================================================
--
-- Two changes, one file.
--
-- a) 0002's "System/seller appends events" policy requires the caller to be the
--    buyer, the seller or an administrator. For an inquiry submitted by a
--    visitor, buyer_profile_id is null and there is no signed-in profile, so
--    none of the three can match — and createInquiry() then writes the event
--    that says the inquiry was submitted (src/lib/supabase/repository.ts). The
--    row would be created and the request would fail. /api/inquiries accepts a
--    guest, so this was a blocker for the public inquiry form in Supabase mode,
--    not a cosmetic one. The replacement admits exactly one event for exactly
--    that case: one 'created' event, marked 'buyer', on an inquiry nobody owns
--    yet, for a listing that is published and still 'new'.
--
-- b) Nothing constrained the actor column: any participant could append an
--    event labelled 'system'. The trigger below ties each actor to the person
--    who can honestly attest to it. The route already derives the side from
--    stored data rather than the request (src/app/api/inquiries/[id]/route.ts);
--    now the database does too.

drop policy if exists "System/seller appends events" on public.inquiry_events;

-- Participants append events, guests append their own creation
--   Qualified as inquiry_events.* because the subquery below joins other tables;
--   an unqualified actor/kind would bind to whichever of them carries that column
--   name first, silently changing what the policy allows.
create policy "Participants append events, guests append their own creation"
  on public.inquiry_events for insert
  with check (exists (
    select 1 from public.inquiries i
    join public.listings l on l.id = i.listing_id
    where i.id = inquiry_id
      and (i.buyer_profile_id = public.current_profile_id()
        or l.producer_id = public.current_profile_id()
        or public.is_admin()
        or (public.current_profile_id() is null
            and i.buyer_profile_id is null
            and i.status = 'new'
            and l.published = true
            and inquiry_events.actor = 'buyer'
            and inquiry_events.kind = 'created'))
  ));

-- SECURITY DEFINER so the lookups below are not filtered by the caller's own
-- read policies: a guest legitimately cannot read the inquiry they just created,
-- but must still be able to record its creation. The reads are used only to
-- refuse a dishonest event, never to return a value to the caller.
create or replace function public.inquiry_event_actor_is_honest()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  i public.inquiries;
  l public.listings;
begin
  select * into i from public.inquiries where id = new.inquiry_id;
  if not found then
    raise exception 'An event must belong to an inquiry that exists'
      using errcode = '23503';
  end if;
  select * into l from public.listings where id = i.listing_id;

  if new.actor = 'system' and not public.is_admin() then
    raise exception 'Only an administrator records an event as the system'
      using errcode = '42501';
  end if;

  if new.actor = 'buyer' and not public.is_admin() then
    if i.buyer_profile_id is null then
      if new.kind <> 'created' then
        raise exception 'A guest inquiry carries only the event that recorded it'
          using errcode = '42501';
      end if;
      if exists (
        select 1 from public.inquiry_events e
        where e.inquiry_id = new.inquiry_id and e.kind = 'created'
      ) then
        raise exception 'A guest inquiry already carries the event that recorded it'
          using errcode = '42501';
      end if;
    elsif i.buyer_profile_id is distinct from public.current_profile_id() then
      raise exception 'Only the buyer records a buyer event on their own inquiry'
        using errcode = '42501';
    end if;
  end if;

  if new.actor = 'seller' and not public.is_admin()
     and l.producer_id is distinct from public.current_profile_id() then
    raise exception 'Only the seller of the listing records a seller event'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger inquiry_events_actor_honest
  before insert on public.inquiry_events
  for each row execute function public.inquiry_event_actor_is_honest();

-- =========================================================================
-- 4. The audit log records administrator decisions
-- =========================================================================
--
-- 0003's "Append own audit entries" let any signed-in account insert an
-- unlimited number of rows with any action, record_type and summary text, while
-- being unable to read them back. The application writes audit entries for
-- exactly two kinds of non-administrator action — archiving or deleting one of
-- their own listings, and setting the status or contribution of an opportunity
-- they coordinate — all of them the 'record_archived' action. Narrowing the
-- policy to those keeps that behaviour and closes the rest.
--
-- The residual difference from demo mode is volume: in both modes a signed-in
-- account can still produce an unbounded number of 'record_archived' rows.
-- Neither mode rate-limits anything.

drop policy if exists "Append own audit entries" on public.audit_logs;

create policy "Admins append any entry, others only their own archive"
  on public.audit_logs for insert
  with check (
    public.is_admin()
    or (
      actor_profile_id = public.current_profile_id()
      and action = 'record_archived'
      and record_type in ('listing', 'opportunity')
    )
  );

-- =========================================================================
-- 5. Group membership is not a public directory
-- =========================================================================
--
-- 0002 opened group_members with using (true). 0003 narrowed which profiles are
-- public but left the membership rows themselves fully readable, so a buyer's
-- profile id appeared in the membership table even though their profile row is
-- private. The replacement keeps what the public pages need: fetchGroups() and
-- membershipsFor() read membership for producer and coordinator accounts, whose
-- profiles are public already. A buyer's membership is visible to the buyer and
-- to an administrator only.

drop policy if exists "Members readable" on public.group_members;

create policy "Members readable while their profile is public, plus self and admins"
  on public.group_members for select
  using (
    public.is_admin()
    or profile_id = public.current_profile_id()
    or exists (
      select 1 from public.profiles p
      where p.id = group_members.profile_id
        and p.role in ('producer', 'coordinator')
    )
  );

-- =========================================================================
-- 6. Administrator listing deletion, the same in both modes
-- =========================================================================
--
-- requireListingWriter() lets an administrator delete another producer's
-- listing, and demo mode honours it; the only DELETE policy in 0002 was
-- producer-scoped, so the identical action would have been refused by RLS. The
-- application still refuses any delete that carries inquiries
-- (src/lib/supabase/repository.ts), and the images go with the row.
--
-- Preferably nobody uses it: 0001 cascades inquiries on listing delete for the
-- rows the app has already refused to delete, so the guard that matters is the
-- application's, and archive remains the moderation path.

create policy "Admins delete any listing"
  on public.listings for delete
  using (public.is_admin());

-- =========================================================================
-- 7. Left public on purpose, with the reason
-- =========================================================================
--
-- Three reads that look loose but are load-bearing, checked against the callers:
--
--   collective_opportunities  using (true)  — /collective and the public order
--       page list them; that is the product.
--   transport_plans           using (true)  — src/app/collective-orders/[id]/page.tsx
--       calls getTransportPlan() while rendering a public page, so contributors
--       and the buyers deciding whether to join can see the shared cost.
--   site_settings             using (true)  — the homepage, contact page and
--       footer read it for every visitor. Consequence to keep in mind: the
--       contact email and phone an administrator stores there are public by
--       design, not hidden behind the interface.
--
-- If any of those three should become private, the page that reads it has to
-- change first; narrowing the policy alone would only produce an empty section.
