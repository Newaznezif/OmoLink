-- OmoNetTab 0006: payment attempts, kept as a separate record per attempt.
--
-- This file joins the sequence on top of 0001_init.sql, 0002_rls.sql,
-- 0003_admin_accounts_reviews.sql, 0004_inquiry_status_guard.sql and
-- 0005_privilege_guards.sql. None of those five has been pushed to a project
-- yet — `supabase db push --dry-run` against mvnaqzacecnyebwsmpho listed all
-- four earlier files as pending before 0005 was written — so 0006 belongs to
-- the same pending rollout and is not a patch to a live schema.
--
-- NOT TESTED. Nothing here has executed. Read it as a review document, exactly
-- like the rest of the sequence: a dry run proves the connection and the order,
-- never the behaviour. Exercise each section with a throwaway non-administrator
-- account before anyone sets DATA_MODE=supabase against data that matters.
--
-- Why a new table instead of columns on inquiries
-- -----------------------------------------------
-- 0004 deliberately froze an inquiry's money terms: the record is the evidence
-- of what was asked for and quoted, so a changed price has to be a new inquiry.
-- A payment is different: one inquiry can legitimately carry several attempts
-- (a card refused, an abandoned checkout, a retry), and each attempt needs its
-- own reference, its own provider answer and its own timestamp history. Putting
-- that on the inquiry would either overwrite evidence or need an array column.
-- So `payments` is one row per attempt, append-only, and the inquiry is
-- untouched. No second inquiry or catalogue system: a payment only ever points
-- at an existing inquiry.
--
-- The one trust gap this file cannot close, and what it does instead
-- -----------------------------------------------------------------
-- This application has no service-role path by design (see
-- src/lib/supabase/server.ts and the note in .env.example). Every write goes
-- through the public key under Row Level Security, as the signed-in buyer. That
-- is fine for "may this buyer see their own record", but a payment confirmation
-- is a claim about the outside world — the provider says money arrived — and
-- Postgres cannot tell our server's verified write from a hand-made request
-- carrying that same buyer's key. RLS therefore cannot be the thing that makes a
-- `confirmed` row honest.
--
-- Rather than silently reversing the no-service-role decision, or pretending the
-- gap is not there, this schema refuses every transition into a status the
-- caller cannot attest to: only the owning buyer's own cancellation is
-- writable, and only an administrator may refund. Confirming, failing or
-- expiring a payment is refused with an error that says so. The application
-- surfaces that as PaymentConfigurationError with the same explanation, and no
-- receipt is ever produced from an unverifiable write. Closing the gap is a
-- deliberate, separately reviewed follow-up: either a server-only credential
-- with a narrowed policy for the confirmation write, or a SECURITY DEFINER RPC
-- that verifies the provider's own signature inside Postgres. Until one of those
-- exists and has been tested against a real provider, live payments are not
-- operational and are not described as operational anywhere in this repository.

-- =========================================================================
-- 1. Vocabulary
-- =========================================================================
--
-- The names mirror src/lib/types.ts exactly, so a row and a Payment object
-- cannot drift into two different state models. `demo_simulated` is part of the
-- enum so one vocabulary serves both modes; section 2 refuses it in a live
-- database, because a simulated record in production data is a lie waiting to
-- be reported as revenue.

create type public.payment_provider as enum ('demo_simulated', 'chapa');

create type public.payment_status as enum (
  'pending', 'confirmed', 'failed', 'cancelled', 'expired', 'refunded'
);

create type public.payment_event_actor as enum ('buyer', 'seller', 'provider', 'system');

create type public.payment_event_kind as enum (
  'created', 'checkout_ready', 'verified', 'failed', 'cancelled',
  'expired', 'refunded', 'webhook'
);

-- =========================================================================
-- 2. The table
-- =========================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  -- Our merchant_reference. It is the value a provider echoes back, the number
  -- printed on a receipt, and the only key a callback is allowed to use to find
  -- a row — never an id supplied by the browser.
  reference text not null unique,
  -- restrict, not cascade: a row that records money is not allowed to vanish
  -- because someone deleted the inquiry or archived the listing. 0005 already
  -- says archive is the moderation path, and the application refuses to delete
  -- a listing that carries inquiries, so in practice nothing reaches this.
  inquiry_id uuid not null references public.inquiries (id) on delete restrict,
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_profile_id uuid not null references public.profiles (id) on delete restrict,
  seller_profile_id uuid not null references public.profiles (id) on delete restrict,
  provider public.payment_provider not null,
  -- The provider's own reference. Unique where present, so two of our rows can
  -- never claim to be the same transaction, and a double notification lands on
  -- one record. Postgres treats nulls as distinct, so unsettled attempts are
  -- not affected.
  provider_reference text unique,
  -- Integer cents, the same convention as every other money column here. The
  -- value is copied from the inquiry by the trigger below; no caller supplies it.
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  fee_cents bigint check (fee_cents >= 0),
  payment_method text,
  status public.payment_status not null default 'pending',
  -- A stored address, not a redirect target: the workflow never treats "the
  -- provider sent us back to the site" as evidence of anything.
  checkout_url text,
  checkout_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  closed_at timestamptz,
  failure_reason text,
  -- Demo rows live in the in-memory store, never here; see section 2's note on
  -- demo_simulated. Keeping the column means the two repositories return
  -- objects of the same shape and a screen has one field to check before it
  -- prints "simulated payment".
  is_demo boolean not null default false
);

create index on public.payments (inquiry_id);
create index on public.payments (buyer_profile_id);
create index on public.payments (seller_profile_id);
create index on public.payments (status);
-- Reports group by day; without this the admin report scans the whole ledger.
create index on public.payments (created_at desc);
-- Partial unique indexes are the duplicate-charge guard. They hold under
-- concurrent requests, which a read-then-insert check in application code does
-- not: two webhooks, or a buyer double-clicking, cannot produce two confirmed
-- rows for one inquiry, and cannot produce two open attempts either. A buyer who
-- wants to retry cancels the open attempt first — cancellation is theirs to do.
create unique index payments_one_confirmed_per_inquiry
  on public.payments (inquiry_id)
  where status = 'confirmed';
create unique index payments_one_open_attempt_per_inquiry
  on public.payments (inquiry_id)
  where status = 'pending';

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  at timestamptz not null default now(),
  actor public.payment_event_actor not null,
  kind public.payment_event_kind not null,
  detail text not null,
  -- The provider's event id, unique across the table. This is webhook
  -- idempotency enforced by the database rather than by remembering to check:
  -- a replayed notification cannot insert a second line, so a report that
  -- counts events cannot double-count one payment.
  provider_event_id text unique
);
create index on public.payment_events (payment_id, at);

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- =========================================================================
-- 3. An attempt takes its terms from the inquiry, not from the caller
-- =========================================================================
--
-- The amount, the currency and both parties are copied from the stored inquiry
-- and its listing. That makes the two attacks the prompt names impossible
-- instead of merely refused: an amount cannot be tampered with, because the
-- value in the request is discarded; another buyer's inquiry cannot be paid,
-- because the row's owner is read from the inquiry rather than asserted, and
-- section 5 then requires that owner to be the caller.
--
-- SECURITY DEFINER so the lookups are not filtered by the caller's own read
-- policies — the same reasoning 0005 section 3 gives for inquiry events. The
-- reads are only ever used to refuse a dishonest row, never to return a value
-- to the caller, so no data becomes readable that was not readable before.

create or replace function public.payment_attempt_takes_its_terms()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  i public.inquiries;
  l public.listings;
begin
  if new.provider = 'demo_simulated' or new.is_demo then
    raise exception 'A live payment record is never simulated; the simulator only exists in demo mode'
      using errcode = '42501';
  end if;

  -- Only an open attempt may be created. A status that reports an outcome is a
  -- claim about the provider, and section 4 guards it.
  if new.status <> 'pending' then
    raise exception 'A payment attempt is created as pending; its outcome is recorded by verification'
      using errcode = '42501';
  end if;

  -- Explicit transactional reads: a trigger must not rely on the snapshot being
  -- unchanged while it runs.
  select * into i from public.inquiries where id = new.inquiry_id for share;
  if not found then
    raise exception 'A payment must belong to an inquiry that exists'
      using errcode = '23503';
  end if;

  -- The producer has to have answered, so the amount is an agreed quote and not
  -- a guess. Mirrors PAYABLE_INQUIRY_STATUSES in src/lib/payments.ts: 'new' is
  -- not payable, and a closed inquiry is not payable either.
  if i.status not in ('accepted', 'awaiting_confirmation', 'fulfillment_arranged') then
    raise exception 'A payment can only be opened once the producer has answered the inquiry'
      using errcode = '42501';
  end if;

  select * into l from public.listings where id = i.listing_id;
  if not found then
    raise exception 'The inquiry refers to a listing that no longer exists'
      using errcode = '23503';
  end if;

  -- An inquiry submitted by a visitor has no owner, so nothing in it is payable
  -- through an account; the NOT NULL columns below would refuse the row anyway,
  -- and this gives the reason.
  if i.buyer_profile_id is null then
    raise exception 'A guest inquiry is followed up with the producer, not paid through the platform'
      using errcode = '42501';
  end if;

  new.listing_id := i.listing_id;
  new.buyer_profile_id := i.buyer_profile_id;
  new.seller_profile_id := l.producer_id;
  new.currency := i.currency;
  new.amount_cents := i.estimated_subtotal_cents;

  -- A real catalogue item whose producer never set a price has no amount to
  -- pay. The check constraint on the column would catch it too, with a worse
  -- message.
  if new.amount_cents is null or new.amount_cents <= 0 then
    raise exception 'No price was documented for this inquiry, so there is nothing to pay'
      using errcode = '42501';
  end if;

  -- Nothing a caller can set on a fresh row may carry an outcome either.
  new.confirmed_at := null;
  new.closed_at := null;
  new.failure_reason := null;
  new.fee_cents := null;
  new.payment_method := null;

  return new;
end;
$$;

create trigger payments_terms_from_inquiry
  before insert on public.payments
  for each row execute function public.payment_attempt_takes_its_terms();

-- =========================================================================
-- 4. Frozen terms, and the transitions nobody may claim for themselves
-- =========================================================================
--
-- Same shape as 0004: the record keeps the terms it was created with, and each
-- party may write only what they can honestly attest to.
--
-- What the caller can write: the checkout address and its window (the provider
-- gave them to us), and a cancellation of their own open attempt.
-- What nobody writes through this table: confirmed, failed, expired, and a
-- refund by anyone other than an administrator. See the header for why the
-- refusal is the honest default rather than a placeholder.

create or replace function public.payment_terms_are_frozen()
returns trigger language plpgsql as $$
begin
  if new.reference is distinct from old.reference
     or new.inquiry_id is distinct from old.inquiry_id
     or new.listing_id is distinct from old.listing_id
     or new.buyer_profile_id is distinct from old.buyer_profile_id
     or new.seller_profile_id is distinct from old.seller_profile_id
     or new.provider is distinct from old.provider
     or new.amount_cents is distinct from old.amount_cents
     or new.currency is distinct from old.currency
     or new.is_demo is distinct from old.is_demo
     or new.created_at is distinct from old.created_at then
    raise exception 'A payment keeps the terms it was opened with; only its outcome and checkout details change'
      using errcode = '42501';
  end if;

  -- Outcome fields belong to the transition, never to a caller editing a row.
  if new.fee_cents is distinct from old.fee_cents
     or new.payment_method is distinct from old.payment_method
     or new.confirmed_at is distinct from old.confirmed_at
     or new.failure_reason is distinct from old.failure_reason then
    raise exception 'Fees, method, confirmation time and failure reason are set when an outcome is recorded, not edited afterwards'
      using errcode = '42501';
  end if;

  -- Our own reference stays with the attempt; a provider reference may appear
  -- while the attempt is still open, which is the checkout response arriving.
  if new.provider_reference is distinct from old.provider_reference
     and old.status <> 'pending' then
    raise exception 'A finished payment attempt does not change which transaction it refers to'
      using errcode = '42501';
  end if;

  -- Terminal for the attempt; a retry is a new row, which is what
  -- paymentEligibility() calls the 'retry' case.
  if old.status in ('failed', 'cancelled', 'expired', 'refunded')
     and new.status is distinct from old.status then
    raise exception 'A closed payment attempt cannot be reopened — open a new attempt instead'
      using errcode = '42501';
  end if;

  if old.status = 'confirmed' then
    if new.status = 'refunded' then
      if not public.is_admin() then
        raise exception 'Only an administrator records a refund'
          using errcode = '42501';
      end if;
      if new.closed_at is null then
        new.closed_at := now();
      end if;
      return new;
    end if;
    if new.status is distinct from old.status then
      raise exception 'A confirmed payment cannot move to any other status but refunded'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if new.status = 'cancelled' then
    -- The buyer abandons their own attempt; an administrator can too. Nobody
    -- else has a claim about it, and the policy in section 5 already limits the
    -- update to those two.
    if not public.is_admin()
       and new.buyer_profile_id is distinct from public.current_profile_id() then
      raise exception 'Only the buyer cancels their own payment attempt'
        using errcode = '42501';
    end if;
    if new.closed_at is null then
      new.closed_at := now();
    end if;
    return new;
  end if;

  if new.status = 'pending' then
    raise exception 'A payment attempt does not move back to pending'
      using errcode = '42501';
  end if;

  raise exception 'An outcome of % cannot be written by a client session — it has to come from a verified provider answer, which this deployment does not yet have a credential to record', new.status
    using errcode = '42501';
end;
$$;

create trigger payments_terms_frozen
  before update on public.payments
  for each row execute function public.payment_terms_are_frozen();

-- =========================================================================
-- 5. Row Level Security
-- =========================================================================

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

-- A payment is private between the buyer, the seller of that item and the
-- platform. There is no public payment: nothing on a public page reads this
-- table, so no read policy is open to anon.
create policy "Buyer reads own payments"
  on public.payments for select
  using (buyer_profile_id = public.current_profile_id());

create policy "Seller reads payments on their listings"
  on public.payments for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and l.producer_id = public.current_profile_id()
  ));

create policy "Admins read every payment"
  on public.payments for select
  using (public.is_admin());

-- The buyer creates an open attempt on their own inquiry; the trigger has
-- already rewritten the row to match the inquiry, and WITH CHECK runs on that
-- final row, so this is the second half of "cannot pay another buyer's inquiry".
create policy "Buyer opens an attempt on their own inquiry"
  on public.payments for insert
  with check (
    buyer_profile_id = public.current_profile_id()
    and status = 'pending'
    and is_demo = false
  );

-- Deliberately no FOR UPDATE policy for an administrator's ordinary read-and-
-- correct, and no DELETE policy at all: a payment row is evidence. The two
-- updates a client may make are below, each narrowed the way 0004 narrowed the
-- inquiry policy — the trigger does the detailed work, the policy keeps the
-- reachable set small.
create policy "Buyer cancels or adds checkout details on their own open attempt"
  on public.payments for update
  using (buyer_profile_id = public.current_profile_id() and status = 'pending')
  with check (
    buyer_profile_id = public.current_profile_id()
    and status in ('pending', 'cancelled')
  );

create policy "Admin records a refund on a confirmed payment"
  on public.payments for update
  using (public.is_admin() and status = 'confirmed')
  with check (public.is_admin() and status in ('confirmed', 'refunded'));

-- Events are readable by exactly the parties to the payment, mirroring the
-- inquiry events policy in 0002.
create policy "Events readable for payment participants"
  on public.payment_events for select
  using (exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.buyer_profile_id = public.current_profile_id()
        or p.seller_profile_id = public.current_profile_id()
        or public.is_admin())
  ));

-- An event is appended by the person whose action it records. The buyer's own
-- session produces three kinds: the attempt being opened, the checkout address
-- arriving, and the attempt being cancelled — the second is labelled 'provider'
-- because the address came from the provider even though this server stored it,
-- which is the same honesty rule 0005 section 3 applies to inquiry events. An
-- administrator appends the rest, because an administrator is the only client
-- role whose outcome write the trigger accepts (a refund).
create policy "Participants append the events they can attest to"
  on public.payment_events for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      where p.id = payment_events.payment_id
        and p.buyer_profile_id = public.current_profile_id()
        and (
          (payment_events.actor = 'buyer' and payment_events.kind in ('created', 'cancelled'))
          or (payment_events.actor = 'provider' and payment_events.kind = 'checkout_ready')
        )
    )
  );

-- No client may rewrite or remove an event: the two tables above simply have no
-- UPDATE or DELETE policy for payment_events, and no DELETE policy for payments.
-- The consequence to keep in mind is that a mistaken confirmation cannot be
-- deleted out of history; it is answered by a refund, which leaves both records.

-- =========================================================================
-- 6. The audit log gains the payment action
-- =========================================================================
--
-- 0003 put an enum-style CHECK on both columns, so a payment entry would be
-- refused by the constraint rather than by a policy. Dropping and re-adding the
-- constraint keeps the existing rows — none, in a database where this is the
-- sixth file to run — and states the whole list, the way 0003 did.

alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'role_changed','account_suspended','account_reactivated','verification_decision',
  'listing_moderated','listing_featured','category_changed','site_settings_changed',
  'report_resolved','review_moderated','record_archived','payment_recorded'
));

alter table public.audit_logs drop constraint if exists audit_logs_record_type_check;
alter table public.audit_logs add constraint audit_logs_record_type_check check (record_type in (
  'profile','listing','category','settings','report','review','opportunity','payment'
));

-- 0005 already lets an administrator append any entry and limits everyone else
-- to their own 'record_archived' rows, so a payment audit entry — which is
-- written for a confirmation or a refund, the two things an administrator's own
-- session can produce here — needs no new policy. And a card number, a CVV or a
-- provider secret must never enter these strings, which is the note 0003 already
-- carries on the summary column: the application composes them from references,
-- statuses and amounts only.
