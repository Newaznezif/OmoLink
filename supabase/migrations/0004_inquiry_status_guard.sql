-- OmoLink 0004: an inquiry keeps the terms it was submitted with, and each side
-- can only write the status it can honestly attest to.
--
-- Applied on top of 0001_init.sql, 0002_rls.sql and
-- 0003_admin_accounts_reviews.sql. Like 0003 it has NOT been applied to a live
-- project yet (no credentials were available), so it is reviewed as part of the
-- pending rollout rather than claimed as tested. See README "Supabase rollout".
--
-- This closes two gaps that 0003 left open. Both are security fixes, not
-- features:
--
--   1. 0003's "Buyer updates own inquiry" policy let the buyer UPDATE any column
--      of their own row, including quantity, unit_price_cents and
--      estimated_subtotal_cents. The application never sends those fields, but
--      Row Level Security is the boundary that has to hold even for a hand-made
--      request with the anon key. The prompt is explicit: totals are never
--      trusted from the browser, and hiding a button is not a security boundary.
--
--   2. The same policy allowed status = 'accepted'. Only the seller of the
--      listing may record acceptance or fulfilment; a buyer may record that
--      they received it, or that they no longer want it. The route handler
--      already refuses the rest, and now the database does too.

-- =========================================================================
-- 1. Column-level rules for every UPDATE on inquiries
-- =========================================================================

create or replace function public.inquiry_terms_are_frozen()
returns trigger language plpgsql as $$
begin
  -- The record is the evidence of what was asked for and quoted. A seller who
  -- later wants different terms asks the buyer to send a new inquiry, which
  -- leaves both versions on file.
  if new.reference is distinct from old.reference
     or new.listing_id is distinct from old.listing_id
     or new.buyer_name is distinct from old.buyer_name
     or new.buyer_contact is distinct from old.buyer_contact
     or new.buyer_profile_id is distinct from old.buyer_profile_id
     or new.quantity is distinct from old.quantity
     or new.unit is distinct from old.unit
     or new.unit_price_cents is distinct from old.unit_price_cents
     or new.estimated_subtotal_cents is distinct from old.estimated_subtotal_cents
     or new.currency is distinct from old.currency
     or new.preference is distinct from old.preference
     or new.preferred_date is distinct from old.preferred_date
     or new.message is distinct from old.message
     or new.idempotency_key is distinct from old.idempotency_key
     or new.created_at is distinct from old.created_at then
    raise exception 'An inquiry keeps the terms it was submitted with; only its status changes'
      using errcode = '42501';
  end if;

  -- Mirrors the demo repository, which refuses to move a closed arrangement.
  -- A review is tied to a completed inquiry, so reopening one would rewrite
  -- history that a review already depends on.
  if old.status in ('completed', 'cancelled')
     and new.status is distinct from old.status then
    raise exception 'A closed arrangement cannot be reopened — send a new inquiry instead'
      using errcode = '42501';
  end if;

  -- Acceptance and fulfilment belong to the seller. The listing owner and an
  -- administrator are allowed; everyone else is refused whatever the policy
  -- above let them reach.
  if new.status in ('accepted', 'awaiting_confirmation', 'fulfillment_arranged')
     and not public.is_admin()
     and not exists (
       select 1 from public.listings l
       where l.id = new.listing_id
         and l.producer_id = public.current_profile_id()
     ) then
    raise exception 'Only the seller records acceptance or fulfilment'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger inquiries_terms_frozen
  before update on public.inquiries
  for each row execute function public.inquiry_terms_are_frozen();

-- =========================================================================
-- 2. The buyer's update policy, narrowed to their own two statuses
-- =========================================================================

drop policy if exists "Buyer updates own inquiry" on public.inquiries;

create policy "Buyer records completion or cancellation of own inquiry"
  on public.inquiries for update
  using (buyer_profile_id = public.current_profile_id())
  with check (
    buyer_profile_id = public.current_profile_id()
    and status in ('completed', 'cancelled')
  );

-- Sellers keep their own policy from 0002 ("Seller updates inquiry status on
-- their listings"), which the trigger above now narrows to status-only writes.
-- An anonymous visitor has no profile id, so an inquiry created without an
-- account stays read-only for everyone except the seller and an administrator;
-- the buyer follows it up by phone or in-app message, as the listing page says.
