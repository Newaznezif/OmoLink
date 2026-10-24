# OmoNetTab

**Connecting Cultures and Commerce**

OmoNetTab is a web marketplace prototype for presenting local products and services, helping potential customers discover offerings, and giving buyers and providers a place to coordinate through inquiries. It is designed for rural entrepreneurs, producers, artisans, community tourism providers, and visitors in South Omo, Ethiopia.

The project responds to challenges such as limited online discoverability, reliance on intermediaries, and difficulty comparing offering details or reaching potential customers. These are the problem areas the product is intended to address, not quantified impact claims. This repository contains no fieldwork report or independently verified research findings; validate assumptions with communities before treating them as observed facts.

> **Prototype status:** Demo mode is the out-of-the-box experience and uses illustrative sample records. No payment, SMS, or USSD transaction is performed. Supabase support is present in the code, and its schema and category seed are now applied to the linked project (section 9.3) — but no account exists there, `DATA_MODE` is still `demo`, and no policy has been verified by behaviour, so the live path is still not a verified deployment.

## The problem

Rural producers, artisans, self-help groups, and community tourism providers may have limited ways to publish offerings to people beyond their immediate networks. Potential customers may in turn lack clear information about availability, pricing units, provider details, and how to make contact. Connectivity, transport, trust, payment, and communication constraints can make these challenges harder.

These statements describe the project context and problem assumptions. The repository does not provide evidence that every challenge has been measured in South Omo or applies uniformly across communities. Local discovery, pricing practices, connectivity, logistics, and cultural protocols should be confirmed through community-led research and user testing.

## Our solution

OmoNetTab provides a digital catalogue where providers can publish product or service listings, describe terms such as price and availability, and receive inquiries. Listing categories represented in the prototype include handicrafts, textiles, honey and local foods, dairy and agricultural products, tourism experiences, guided visits, and craft demonstrations. These are supported listing types and illustrative demo categories—not confirmation that real offerings or community-approved experiences are currently available.

Cultural experiences should only be listed with informed community consent, community ownership of the description and imagery, and appropriate safeguards. OmoNetTab does not verify a cultural claim simply because a listing can be created.

## Target users

- **Rural entrepreneurs and local producers:** present goods, prices, quantities, and pickup preferences in one listing.
- **Artisans and self-help groups:** describe handmade products or coordinate contributions through the collective-opportunity workflow.
- **Community tourism providers and guides:** publish service listings with relevant details for visitors.
- **Domestic and international visitors, shops, and other buyers:** discover listings, compare their stated details, and send an inquiry.
- **Cooperatives and community organizations:** may be relevant partners for onboarding, consent, and coordination; no partnership is claimed by this repository.

The product is a prototype and these value propositions have not been established through reported outcome studies in this repository.

## Key features and implementation status

| Capability | Status | Scope and limits |
| --- | --- | --- |
| Marketplace discovery | **Implemented** | Browse product and service listings, search, filter, sort, and view listing details. Demo content is explicitly illustrative. |
| Provider profiles | **Implemented** | Public profiles and locally generated QR share codes; profile content still depends on the configured data source. |
| Provider registration and listing management | **Implemented** | Registration and seller dashboard workflows for profile and listing management, with protected server-side mutations. |
| Listing lifecycle and pictures | **Implemented** | Publish, unpublish, archive, restore, availability, and deletion only while no inquiry depends on the listing. Pictures are stored as a web address with a required alt description and a recorded consent statement; file upload needs object storage that is not configured. |
| Account help flows | **Implemented; real mail paths untested** | `/onboarding`, `/forgot-password`, `/reset-password`, `/verify-email`, and role-aware `/auth/callback`. In demo mode these pages explain that no mail service exists rather than presenting a form that could not work. |
| Buyer inquiries and arrangement status | **Implemented** | Buyers can submit inquiries; buyer and seller areas expose their records and status updates. Parties arrange payment and fulfilment themselves. |
| Buyer and seller dashboards | **Implemented** | Inquiries, order arrangements, profile/settings, and related records. These are not payment receipts or a payment ledger. |
| Collective opportunities | **Implemented** | Sample group opportunities, contributions, aggregation, and estimated shared transport costs. Estimates are not transport quotes. A visitor can pick a participating producer's product and send an inquiry for it; producers commit stock against the pool. There is no multi-seller basket. |
| Price calculator | **Implemented** | Cost, markup, and margin calculations; this is a planning aid, not price verification. |
| Founders & Team | **Implemented** | `/team` lists the five founders with the photograph, name, OmoNetTab role, supplied professional background, and LinkedIn link each member provided, plus a portfolio link for the member who supplied one. The same data drives a homepage preview card grid that links to it. Names are data, not markup, so they are never machine-translated. |
| Contact and review workflows | **Implemented** | In-app message/review records depend on the configured repository. They do not imply email delivery or external moderation. |
| Administration | **Implemented, with demo limitations** | Admin screens and role-protected actions cover site settings, homepage content, listings, categories, messages, reports, reviews, and account roles. Demo-mode changes exist only in the in-memory store; some verification/report actions are explicitly simulated. |
| Offline support | **Implemented for reading, verified in a production build** | A service worker caches the app shell and the pages you browsed while it controlled the tab; a listing revisited without a connection still renders and its inquiry form still recalculates the subtotal. Listing drafts and queued inquiries are saved on-device. It is not a background-sync queue: nothing is sent to a server later that was not already waiting on the device. |
| Authentication and persistence | **Partially implemented** | Demo accounts use the demo session flow. Supabase Auth and the Postgres repository are implemented, but migrations and policies have not been verified against a live Supabase project. |
| PWA installation | **Partially implemented** | A web manifest and service worker are included; store distribution is not provided. |
| SMS, USSD, mobile money, and payment processing | **Planned / not implemented** | No gateway, payment provider, or transaction processing is included. |
| Interface languages | **Implemented for English; other dictionaries are honestly partial** | The selector offers seven languages and the choice persists in a server-readable cookie. English is complete; Simplified Chinese and Italian cover every interface key but are unreviewed; Amharic is a partial draft; Hamer, Dasenech and Tsamai are selectable but carry no translation, and the pages say so. See [Interface languages](#interface-languages-and-translation-status). |
| Real-world verification and impact measurement | **Planned** | The prototype does not establish provider verification, field outcomes, or measured impact. |

## How it works

1. A provider registers and creates a profile, then drafts and publishes a product or service listing with its description, price unit, availability, and contact/pickup preferences.
2. A visitor or buyer browses or searches listings and reviews the provider and listing details.
3. The buyer submits an inquiry with the requested quantity and preferences. The application records an inquiry and reference; it does not charge the buyer.
4. The provider reviews the inquiry and records the next arrangement status. Buyer and provider coordinate pickup, delivery, dates, and payment outside the platform.
5. The parties can record completion or cancellation in the application. This status is not proof of a payment or an independently verified delivery.

The demo uses in-memory sample data. Persistent use requires a correctly configured Supabase project and successful verification of its schema, authentication, and access policies.

## Social impact and SDG alignment

OmoNetTab is intended to contribute to the following goals; these are project aims, not demonstrated or measured outcomes:

- **SDG 8 — Decent Work and Economic Growth:** support visibility and market-access opportunities for local entrepreneurs.
- **SDG 9 — Industry, Innovation and Infrastructure:** explore appropriate digital tools for underserved rural-market connections.
- **SDG 10 — Reduced Inequalities:** work toward reducing barriers to discovering and presenting local offerings.
- **SDG 11 — Sustainable Cities and Communities:** support responsible, community-led tourism where communities choose to participate.
- **SDG 12 — Responsible Consumption and Production:** make local offerings easier to discover and encourage accurate product information.

## Technology stack

- **Next.js 14** App Router and **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Supabase JavaScript client and SSR helpers** for the optional Supabase data and authentication paths
- **`qrcode`** for locally generated QR images
- **Node.js** runtime and **npm** package manager (`package-lock.json`)
- **`tsx`** with Node's test runner for automated tests

No deployment provider is configured in this repository. The app uses Next.js build/start scripts and can be deployed to a compatible Node/Next.js host after its environment and data services are configured.

## Architecture

```mermaid
flowchart TD
  Browser[Browser: Next.js UI, PWA cache, local drafts] --> App[Next.js App Router]
  App --> Routes[Server components and API routes]
  Routes --> Repo[Repository interface]
  Repo --> Demo[In-memory demo repository]
  Repo --> Supabase[Supabase repository using public key]
  Supabase --> Auth[Supabase Auth]
  Supabase --> Postgres[Supabase Postgres with RLS]
```

Main directories:

```text
src/
  app/                 App Router pages, layouts, and API routes
    admin/             Administration screens
    api/               Server-side application endpoints
    buyer/             Buyer account, inquiries, and arrangements
    dashboard/         Provider account and listing management
    listings/          Public listing details
    producers/         Public provider directory and profiles
  components/          Shared UI and feature components
  hooks/               Client-side hooks, including local listing drafts
  lib/                 Domain types, repositories, sessions, settings, and data access
    i18n/              Translation dictionaries, the interpreter, and catalogue copy
    supabase/          Supabase client, row mappings, and repository
supabase/
  migrations/          Database schema and row-level security migrations
  seed.sql             Category seed data
public/                Static assets: branding logo (images/branding/), the five founder photographs (images/team/), favicon.ico, icon.svg, icons/ (32/48/180/192/512 PNG cut from that logo), web manifest, service worker
tests/                 Node-based unit tests
  http/                Demo-mode HTTP verification suites (refinements, locale, catalogue, producer, buyer, admin, workflow, money)
```

## Installation and local development

Prerequisites: Node.js 18.17 or newer and npm. On Windows, use PowerShell; on macOS/Linux, use the equivalent shell commands.

```bash
git clone https://github.com/Newaznezif/OmoNetTab.git OmoNetTab
cd OmoNetTab
npm ci
```

Copy `.env.example` to `.env.local`. The defaults run the demo without external credentials. Then start the development server:

```bash
npm run dev
```

Open <http://localhost:3000>.

Available project scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run the configured Next.js ESLint check |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run the Node test suite through `tsx` |

## Environment variables and Supabase

`.env.example` is the source of truth for supported variables:

| Variable | Purpose |
| --- | --- |
| `DATA_MODE` | `demo` (default) or `supabase`. Invalid/incomplete Supabase configuration fails rather than silently falling back to demo data. |
| `NEXT_PUBLIC_SITE_URL` | Base site URL used for generated links and QR codes. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; required in Supabase mode. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public key (newer projects call it "publishable"); required in Supabase mode and subject to RLS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The same kind of key under its older name. Either variable is read, and if both are set the publishable one wins. |

Never commit `.env.local`, credentials, or private keys. The application intentionally does not use a Supabase service-role key. Do not add one to client-visible configuration.

To use Supabase, provision a project, review all migrations in `supabase/migrations/`, configure Supabase Auth and its redirect URLs, then apply the migrations and category seed using the Supabase CLI/SQL tooling appropriate to your project. The migration sequence is `0001_init.sql`, `0002_rls.sql`, `0003_admin_accounts_reviews.sql`, `0004_inquiry_status_guard.sql`, `0005_privilege_guards.sql`. `supabase/seed.sql` contains the category seed data — the eight rows the listing form and `/collective` offer as choices — and it must be applied **after** the migrations, because `listings.category_id` and `collective_opportunities.category_id` reference `categories(id)`. Note that `supabase db push` applies migrations only and never runs `seed.sql`; the seed is a separate step (the dashboard SQL editor, or `supabase db query --linked -f supabase/seed.sql`). It is written to be re-runnable (`on conflict (id) do nothing`) and touches no table but `categories`. Back up and review a database before applying schema changes.

Set `DATA_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, and the public key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY` on an older project) in `.env.local` and restart the application. **The application itself has still never been run against a live Supabase instance; `DATA_MODE` is `demo` in this repository and in every test recorded above.** What is no longer hypothetical is the schema: `0001`–`0005` and the category seed are applied to `mvnaqzacecnyebwsmpho` (section 9.3). Applied migrations and RLS policies are still not evidence that a policy refuses the wrong write, nor that sign-in and email flows work — that needs an administrator and a second account (section 11). Demo mode remains the only verified path.

## Handover: audit, permissions, verification, and setup

The five status words below are used with the meaning the brief gives them: **complete and verified**, **implemented but not tested**, **partially implemented**, **missing**, **blocked by credentials**. Anything claimed *verified* was executed on 2026-10-17 against a local dev server in `DATA_MODE=demo`. Nothing was executed against a live Supabase project — no project credentials were available in this environment, so every database-side behaviour is reviewed code, not observed behaviour.

### 1. Functionality that already worked, and was preserved

Before this pass the repository already had the public marketplace (home, explore, products, tourism, listing and producer pages, collective-order pages, pricing tool, contact, how-it-works, impact, offline, privacy, community guidelines), the inquiry record with reference and estimated subtotal, the seller dashboard basics, the admin area, collective selling read paths with contributions, the PWA service worker and on-device drafts, the demo session, and the Supabase repository plus migrations `0001`–`0003`. None of those routes were replaced, and no working feature was deleted to simplify the build.

Two removals were deliberate:

- `src/components/save-profile-button.tsx` was a second, unvalidated profile write path (it read DOM nodes by id and sent whatever it found). `/dashboard/profile` is now a read-only preview and every profile write goes through `AccountSettingsForm` → `POST /api/profile`, which is the one place that rejects a role, status, or verification sent by the browser.
- Nothing else. `/dashboard/listings/[id]` stays the listing edit screen, and the route named in the brief, `/dashboard/listings/[id]/edit`, is a redirect to it rather than a duplicate form.

### 2. Audit checklist

| Area | Status | What that means in this build |
| --- | --- | --- |
| Public pages, search, filters, listing and producer detail | **Complete and verified** (demo mode) | Every public route returns 200 and filters reduce the row set; unknown ids render the 404 page, not a blank one. |
| Buyer area: inquiries, orders, bookings, profile, settings | **Complete and verified** (demo mode) | 82 HTTP checks in `tests/http/buyer-smoke.mjs`. |
| Producer dashboard: listings, lifecycle, pictures, inquiries, orders, profile, settings | **Complete and verified** (demo mode) | 112 HTTP checks in `tests/http/producer-smoke.mjs`, including ownership refusals and suspension. |
| Coordinator collective selling: open, edit, status, contributions | **Complete and verified** (demo mode) | Same producer suite: oversell, non-member, fractional quantity, foreign write, withdrawal, fulfilled-cannot-reopen. |
| Admin area: users, roles, status, verification, listings, categories, homepage, settings, messages, reports, reviews, orders, opportunities, analytics, audit log | **Complete and verified** (demo mode) | 53 HTTP checks in `tests/http/admin-smoke.mjs`, including the last-active-administrator guards and the platform-administrator label check added in section 9.2. |
| Demo authentication and session handling | **Complete and verified** | Sign-in, sign-out, role read-back per request, suspension taking effect immediately. |
| Real authentication: password sign-in, signup, email confirmation, recovery, onboarding | **Implemented but not tested** — no longer blocked by credentials, now blocked by configuration | `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/onboarding`, `/auth/callback` exist and call the correct `@supabase/supabase-js` 2.118 methods. The project is linked and reachable, but the application has never run against it: `DATA_MODE` is still `demo`, `auth.users` holds 0 rows, and neither SMTP nor the Auth redirect Allow list is configured, so confirmation and recovery emails cannot be delivered. |
| Administrative authorization model (no self-assignment, server-side checks) | **Complete and verified** (demo mode); **applied but not behaviour-tested** at database level | Registration can only produce `buyer` or `producer`; role/status/verification are re-read from the stored profile every request; `0003` and `0005` triggers mirror the same rules in Postgres and are confirmed present and enabled on the project (section 9.3). No non-administrator account has yet attempted a refused write. |
| Schema, RLS policies, migrations | **Applied and structurally verified; behaviour not tested** | `0001`–`0005` are applied to `mvnaqzacecnyebwsmpho` and `supabase/seed.sql` is loaded: 17 tables, all RLS-enabled, 50 policies, 14 triggers (every one enabled), 10 functions, 12 enum types, 8 categories. Section 9.3 records the push, including the `0002` parse failure on the first attempt. Unverified: what each policy and trigger actually refuses. |
| Order/inquiry status rules and recomputed totals | **Complete and verified** (demo mode) | Amounts are computed server-side from the listing price at submission time; a buyer cannot record acceptance. |
| Offline support | **Complete and verified** (production build, browser-tested) | Shell plus browsed pages served from cache with the origin unreachable; on-device listing drafts, a per-listing queued inquiry that keeps its reference across a reload, and duplicate-submit refusals. No background sync queue, and no claim that an offline write reaches a server later. |
| Accessibility | **Partially implemented** | Landmarks, skip link, labelled fields, `role=status`/`role=alert` feedback, and a required alt description for every new picture are verified; no formal audit (no screen-reader or keyboard sweep) was performed. |
| Languages | **Implemented and verified (demo mode)** | All seven offered languages are selectable, the choice persists, and every page announces its own coverage. English is the only reviewed-complete dictionary; Simplified Chinese and Italian cover every interface key but await speaker review; Amharic is a partial draft; Hamer, Dasenech and Tsamai have no translation and say so. See [Interface languages](#interface-languages-and-translation-status). |
| Payments, SMS, USSD, mobile money, telecom | **Missing** | Nothing in this build moves money or sends a message, and no screen claims otherwise. |
| Object storage for uploaded files | **Missing** | Listings therefore store a web address per picture; see the limitation note below. |

### 3. Pages and routes

59 pages, 27 route handlers, 4 layouts. New in this pass (committed as `72644b5`, plus the offline work committed after it):

```text
/forgot-password            /reset-password           /verify-email
/onboarding                 /dashboard/settings       /dashboard/orders
/dashboard/listings/[id]/edit   (alias → /dashboard/listings/[id])
/dashboard/inquiries/[id]   /dashboard/collective-orders/new
/dashboard/collective-orders/[id]
POST/PATCH /api/collective/opportunities
PATCH    /api/collective/opportunities/[id]
PATCH    /api/collective/contributions/[id]
DELETE   /api/listings/[id]
```

Existing areas kept: `/admin` and its 15 sub-pages, `/buyer` and its 6 sub-pages, `/dashboard` and its listing/inquiry pages, the public catalogue, `/api/inquiries`, `/api/listings`, `/api/profile`, `/api/session`, `/api/contact`, `/api/reviews`, `/api/reports`, and the `/api/admin/*` form endpoints. `GET /buyer/dashboard` does not exist — the buyer area is served under `/buyer`, as the brief allows when an app already has its own routing pattern.

### 4. Role-permission matrix

Enforced in `requireRole()`/`requireArea()` and again inside the repository; in Supabase mode the same rules are restated as RLS policies. A suspended account keeps read access to its own records and loses every write path, immediately, because role and status are read from the stored profile on each request.

| Capability | Visitor | Buyer (tourist / customer) | Producer | Coordinator | Administrator |
| --- | --- | --- | --- | --- | --- |
| Browse and search the marketplace | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send an inquiry or booking | ✓ as a guest (name + contact supplied) | ✓ | ✓ | ✓ | ✓ |
| Open `/buyer` (their own arrangements) | — | ✓ | ✗ | ✗ | ✗ |
| Create, edit, publish, archive, delete-when-safe **their own** listings | ✗ | ✗ | ✓ | ✓ | ✗ (own listings only) |
| Manage any listing, hide or feature one | ✗ | ✗ | ✗ | ✗ | ✓ |
| Move the seller-side status of an inquiry on their own listing | ✗ | ✗ | ✓ | ✓ | ✓ |
| Move the buyer-side status (confirm, cancel) of their own request | guest ✗ | ✓ | ✓ (on requests they sent) | ✓ | ✓ |
| Record acceptance | ✗ | ✗ (server refuses) | ✓ | ✓ | ✓ |
| Open or steer a collective opportunity | ✗ | ✗ | ✗ | ✓ (their own orders) | ✓ |
| Confirm or withdraw a contribution | ✗ | ✗ | Own contribution: withdraw only | ✓ (as that order's coordinator) | ✓ |
| Approve a verification application | ✗ | ✗ | ✗ (never their own) | ✗ | ✓ |
| Assign or remove roles, suspend or reactivate accounts | ✗ | ✗ | ✗ | ✗ | ✓ (and never the last active admin) |
| Edit site settings, homepage content, categories | ✗ | ✗ | ✗ | ✗ | ✓ |
| Read analytics and the audit log | ✗ | ✗ | ✗ | ✗ | ✓ |
| Edit their own profile fields | ✗ | ✓ | ✓ | ✓ | ✓ |
| Set their own role, status or verification | ✗ | ✗ | ✗ | ✗ | ✗ (only another admin can) |

A producer who sends an inquiry cannot open `/buyer` to watch it, because that area is limited to the buyer role; the record is still visible to the seller. That is a known scope limitation, noted below.

### 5. Features completed in this pass

- Listing lifecycle: publish, unpublish, archive, restore (publishing clears the archived flag), availability toggle, and delete that the repository refuses while an inquiry still points at the listing — with the refusal stated in the UI before anyone clicks it.
- Listing pictures: attach by web address with a required alt description and a consent statement, remove one while the rest are kept exactly as stored, a buyer-side gallery on the listing page, and server-side rejection of non-`http(s)` addresses, missing descriptions and missing consent.
- One profile write path: `AccountSettingsForm` (seller and buyer variants), a read-only `/dashboard/profile`, and `/dashboard/settings` and `/buyer/settings` for account changes.
- Auth surface: `/onboarding` that branches by account type and derives the role server-side, `/forgot-password`, `/reset-password`, `/verify-email`, and `/auth/callback` that lands each role in its own area, refuses a `?next=` outside its allowlist, and sends a suspended account to the refusal page. In demo mode these pages explain that no mail service exists instead of showing a form that would lie.
- Coordinator tooling: create and edit a collective opportunity, the five opportunity states with the fulfilled one irreversible, contribution confirmation, withdrawal and quantity correction, all with ownership checks and stock-based oversell protection.
- Producer order board at `/dashboard/orders`: goods and sessions separated, an honest sum-of-estimates line, and the closed records listed rather than merely counted.
- Inquiry filtering by listing and status that actually reduces the rows, with visible chips for each filter.
- Admin enforcement details: role assignment requires confirmation, the last active administrator cannot be demoted or suspended, and audit entries carry summaries only.
- Offline path repaired: the worker is now valid browser JavaScript (it had never once installed), registers on a page that already finished loading, precaches the shell without letting one failing route empty the cache, keeps pages network-first so an online buyer never sees a stale price, and falls back to the `/offline` explainer. A queued inquiry is stored per listing, keeps its reference across a reload, restores its fields, and clears when the server accepts it. Creating a listing while offline now says it needs a connection instead of firing a doomed request, and three submit attempts create one listing rather than three.

### 6. Incomplete, blocked, or missing

- **Performed on 2026-10-18, verification still open:** `0001`–`0005` are applied to the linked project and the category seed is loaded (section 9.3). **Not performed:** verifying each RLS policy with a second, non-administrator tenant; exercising real sign-in, email confirmation and password recovery; provisioning the first administrator (section 11 — deliberately left to the project owner). `DATA_MODE` is still `demo`, so the application has not read or written a row in that database.
- **Partially implemented:** Amharic (draft strings only), reviews and verification (records exist; nothing verifies a real person). Offline reading is verified; offline *writes* stop at the device — a queued inquiry waits for you to press send again rather than being delivered by a background worker.
- **Missing by decision:** payment, SMS, USSD, and any telecom path; object storage for uploaded files; a self-service account deletion (the other party's inquiry is their evidence, so removal is an administrator action); a buyer area for sellers who buy.
- **Not performed:** a formal accessibility audit, load testing, browser matrix testing, and a security review by a third party.

### 7. Database migrations

| File | State | Purpose |
| --- | --- | --- |
| `supabase/migrations/0001_init.sql` | **Applied** to `mvnaqzacecnyebwsmpho`, 2026-10-18 (section 9.3) | Core tables: profiles, categories, listings, `listing_images`, inquiries, groups, opportunities, contributions, reviews, messages, reports. |
| `supabase/migrations/0002_rls.sql` | **Applied**, 2026-10-18 | RLS enabled on every exposed table; `current_profile_id()` and `is_admin()` are `SECURITY DEFINER` on purpose — a policy that read `profiles` directly would recurse into its own policy. They return values derived from `auth.uid()` only, so they describe the caller rather than widen access. This file also declared a third helper, `in_group()`, which was removed before it was ever applied: its parameter name was the reserved word `group`, so `create function` could not parse. See section 9.3. |
| `supabase/migrations/0003_admin_accounts_reviews.sql` | **Applied**, 2026-10-18 | Account kinds, site settings row, audit log, privileged-column triggers, and the insert guard that stops a signup from creating an administrator or coordinator. |
| `supabase/migrations/0004_inquiry_status_guard.sql` | **Applied**, 2026-10-18 | Stops a buyer from rewriting quantity or the recorded totals through the public key, and restricts each side to the statuses it can honestly attest to. |
| `supabase/migrations/0005_privilege_guards.sql` | **Applied**, 2026-10-18 | Verification and homepage-feature guards on listings, the platform-administrator label guard, honest `inquiry_events` actors, the guest-inquiry event that `0002` blocked, a narrowed audit-log append, membership reads, and administrator listing deletion. Section 9.2 lists what each one closes. |
| `supabase/seed.sql` | **Applied**, 2026-10-18, and re-applied once to prove the `on conflict` guard | Categories only. No listings, prices, or identities are seeded as if real. |

The sequence was applied in order `0001` → `0002` → `0003` → `0004` → `0005` against a schema that was verified empty immediately beforehand. **All five files are now historical: they are recorded in the project's migration history, so any further schema change must be a new `0006_*.sql`, not an edit to these.** Editing an applied file would leave the local sequence and the remote database describing different things, and `0001`/`0002` use plain `create table`/`create type`, so they cannot be re-run against a database that already holds these objects anyway. One consequence of that rule: the header comments inside `0002`–`0005` still say the files have "not been applied" or "not executed" — that was true when they were written and is now wrong, but they are frozen, and this section and 9.3 are the live record.

**Do not set `DATA_MODE=supabase` against a database that has only `0001` and `0002`.** `0002_rls.sql` gives every signed-in user a `for all` policy on their own `profiles` row, which in that state lets a normal account `update public.profiles set role = 'admin'` and hand itself the administrator seat; `0003` is the migration that closes it with the `profiles_privileged_columns` trigger and `guard_admin_insert`. The same `0002` policies also leave contact details and group membership readable (`"Public profiles are readable" … using (true)`, `"Members readable" … using (true)`); `0003` narrows the profile read and `0005` narrows the membership read. The linked project holds all five, so it is not in that state — but the warning matters for any project that stops partway, and a push can stop partway: `0002` failed on the first attempt here. Applying the sequence proves the SQL parses and the objects exist; it does not prove a policy refuses the write you expect, which still needs the second, non-administrator account described in section 9.3.

### 8. Environment variables

See `.env.example`; there are no secret values in this repository and none should be added.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATA_MODE` | yes (`demo` default) | `demo` or `supabase`. An incomplete Supabase configuration refuses the first data-touching request rather than falling back to sample data; it does not stop the server from booting. |
| `NEXT_PUBLIC_SITE_URL` | yes, for any real deployment | The origin written into account-confirmation and password-reset **links**, plus share links and QR codes. Sign-in, sign-out and `/auth/callback` no longer use it (they redirect relatively), but an emailed link built without this value points at `localhost:3000` and cannot be opened by anyone else. |
| `NEXT_PUBLIC_SUPABASE_URL` | in Supabase mode | Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | in Supabase mode | Public key; every read and write it makes is still subject to RLS. Preferred name on newer projects. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | in Supabase mode | The same key under its older name. Set one or the other; if both are set, the publishable value wins. |
| `SUPABASE_SERVICE_ROLE_KEY` | **never** | The application does not read it, by design: it bypasses RLS and has no place in a request path a browser can influence. |

`.gitignore` excludes `.env`, `.env.local`, key material, and credential files. Confirm with `git status --porcelain` before every commit.

### 9. Tests actually run, and their results

All commands were run on 2026-10-17 and re-run on 2026-10-18 (section 9.1) on Windows. The HTTP suites were run against `next start` serving the production build on a local port (earlier runs used `next dev`); they are parameterised by `SMOKE_BASE`. Each suite needs a freshly started server because it mutates the in-memory demo store.

| Command | Result |
| --- | --- |
| `npm test` | **46 passed, 0 failed** — pricing, money, mappers, inquiry idempotency, demo auth, repository rules. |
| `npx tsc --noEmit` | Clean. |
| `npx next lint --quiet` | Clean. |
| `node tests/http/admin-smoke.mjs` | **49/49 PASS** — administrator surface, refusals for non-admins, last-admin guards, public page renders, 404 page. |
| `node tests/http/buyer-smoke.mjs` | **82/82 PASS** — buyer area access, guest inquiry, buyer-side statuses, suspension matrix, role-escalation attempts. |
| `node tests/http/producer-smoke.mjs` | **112/112 PASS** — every selling route, listing ownership matrix, lifecycle, pictures, inquiry loop, delete guard, profile/settings, coordinator and contribution rules, suspension matrix, demo-mode honesty of the auth help pages, 404s. |
| `node tests/http/workflow-smoke.mjs` | **20/20 PASS** — the admin-to-public workflow as one repeatable suite: category created, read back through the public filter, listing created unpublished (public 404, inquiry refused), published, rendered with the stored price, guest inquiry accepted, edited, price change visible publicly, unpublished again, foreign producer 403, anonymous 401, category deactivated and still protected from deletion, record still owned by its producer. |
| `npm run build` | **Succeeded** (see section 10). |

**Those are the section 9.1 counts, not the current ones.** The passes that followed raised `npm test` from 46 to **65** and `admin-smoke` from 49 to **53**; `buyer-smoke` 82, `producer-smoke` 112 and `workflow-smoke` 20 are unchanged. Sections 9.2 and 9.3 record the later runs, and 9.3 records the build, typecheck and lint results for the tree that the migrations were applied from.

Manual browser checks on the production build, in a real browser tab at a 510px viewport:

| Check | Result |
| --- | --- |
| Worker installs by itself on an ordinary page load | **PASS** — registration reached `activated`, cache `omonetab-shell-v2` held the 8 shell routes. |
| Origin unreachable, revisit a page loaded while controlled | **PASS** — `/listings/lst_forest_honey` rendered from cache (title, 68.00 ETB price) and the inquiry form still worked: quantity 8 recomputed the subtotal to 544.00 ETB. |
| Origin unreachable, route never loaded while controlled | **PARTIAL** — the cached HTML can arrive without its JS chunks, and React then replaces the page with its client-exception message. Serving the `/offline` explainer instead requires knowing which chunks each page needs; not implemented. |
| Queued inquiry survives a reload | **PASS** — the saved name, contact, quantity, message, and date were restored, the outgoing request reused the stored reference `idem_seed_verify_001`, and the device record cleared once the server accepted it. |
| Duplicate submission refusal | **PASS** — three submit attempts fired back to back on the new-listing form created **one** listing (2 → 3 records). Before this pass the same sequence created three. |
| Offline indicator on a phone-width screen | **PASS** — the offline chip computes to a visible `flex` at 510px; the online chip stays desktop-only by design. |
| Real airplane-mode / interface-down offline state | **NOT TESTED** — the tooling available cannot switch the device network off; `navigator.onLine` was simulated, and `onLine` stays true when only the origin is down. |

Notes on how to read those numbers:

- The HTTP suites run against **demo mode**. They prove the application's own authorization layer refuses correctly; they cannot prove RLS refuses the same way, because demo mode has no Postgres underneath.
- Each suite mutates the in-memory store (it deletes listings, suspends accounts, changes roles), so run one suite per freshly started server. Running two against the same process produces failures that belong to the leftover state, not to the code.
- **Not tested:** everything requiring a live Supabase project — RLS policy outcomes, migration application, `SECURITY DEFINER` behaviour, real password reset email, email confirmation, magic-link exchange in `/auth/callback`, and the onboarding path behind real auth. Those are marked accordingly above rather than counted as passes.

### 9.1 Stabilization audit (2026-10-18)

The whole tree, both repositories, the migrations and the deployment surface were re-inspected and the checks above were re-run on the current commit. Everything listed here is an observed result, with the command that produced it.

Re-run results: `npx tsc --noEmit` clean; `npx next lint` **1 warning, 0 errors** (the deliberate `<img>` in `src/components/listing-images.tsx` — producer pictures are external links and cannot go through `next/image` without a configured image domain); `npx next lint --quiet` clean; `npm test` **46/46**; `npm run build` exit **0**; `node tests/http/admin-smoke.mjs` **49/49**, `buyer-smoke.mjs` **82/82**, `producer-smoke.mjs` **112/112**, `workflow-smoke.mjs` **20/20**, each on its own freshly started `next start` process.

The admin-to-public workflow was traced over HTTP rather than read in the source, and is now a permanent suite: `tests/http/workflow-smoke.mjs`. It covers administrator creates a category → it appears in the public category filter → producer creates a listing in it **unpublished** → public page 404s → publishing makes it render with the stored price → an inquiry is accepted → the title and price edit propagate to the public page → unpublishing 404s again → a second producer and an anonymous caller are refused (403/401) → deactivating the category removes it from browsing while the listing record survives for its owner → deleting it is refused while a listing still uses it. **20 checks, 20 passed.** It mutates the demo store, so it needs its own freshly started server like the other three suites.

Fixed in this pass, each followed by the full check set above:

- **Demo mode accepted an inquiry on an unpublished listing.** `src/lib/supabase/repository.ts` refused it (`This listing is not published.`) and `src/lib/demo-repo.ts` did not, so the two modes answered the same request differently. The check is now in both, and the workflow trace above proves the demo refusal.
- **Signing out, and `/auth/callback` and the Supabase sign-in redirect, pointed at `http://localhost:3000`** whenever `NEXT_PUBLIC_SITE_URL` was unset — correct in development, broken for a visitor on a deployed host. All three now reply with a **relative** `Location`, which the browser resolves against the site it is already on. Falling back to the request's own origin was tried first and rejected: inside a route handler `req.url` reports the address `next start` bound itself to, not the address the visitor used, so it returned `http://localhost:3000/` even when the request arrived with `Host: omotab.example.com`. Verified after the change: sign-out returns `Location: /` and `/auth/callback` returns `Location: /sign-in?error=missing_code` under that same foreign Host header, and following the redirect resolves to the site actually being served. The confirmation and password-reset **links mailed to users** are still built from `NEXT_PUBLIC_SITE_URL` (they must be absolute, and they are composed inside server actions) — see section 13.
- **`.env.example` and the README said an incomplete Supabase configuration "fails at startup".** It does not: `requireSupabaseConfig()` runs when the Supabase client is built, which is per request. A misconfigured deployment boots cleanly and then errors on the first page that reads data. The wording now says what happens.

Public pages are not hardcoded. `src/app/page.tsx`, `/products`, `/tourism`, `/listings/[id]` and `/producers/[id]` each call `getRepo()` per request, and no page or component imports the seed module (`src/lib/demo-data.ts` is reachable only through the demo repository and the reset helper). The workflow suite proves it from the outside: a record created through the API becomes visible on the public page, changes there when edited, and disappears when unpublished — which mock markup could not do.

Left open on purpose, because each needs a live Supabase project or a decision rather than a local edit:

- `0002_rls.sql` kept `"Public profiles are readable" … using (true)` and `"Members readable" … using (true)`. `0003` narrowed the profile policy; `0005` narrows group membership. Closed on 2026-10-18, see section 9.2 — still unexecuted.
- Postgres enforces `listings.category_id references categories(id) on delete restrict`; demo mode stores any string. A typo'd or stale category id therefore fails loudly in Supabase mode and silently in demo mode.
- `DATA_MODE` is parsed in two places (`getDataMode()` in `src/lib/supabase/config.ts` and `isDemoMode()` in `src/lib/store.ts`). They agree today; they are two chances to disagree later.
- Inquiry, contact, report and review endpoints have no rate limit, and consent statements and picture links are recorded rather than verified (section 14).

### 9.2 Pre-push security pass (2026-10-18)

A Supabase project (`mvnaqzacecnyebwsmpho`) now exists, the CLI is authenticated and the repository is linked to it. `npx supabase db push --dry-run` was run twice — before and after this pass — and `npx supabase migration list` shows all five versions local with the remote column empty. A read-only `npx supabase db query --linked "select count(*) from information_schema.tables where table_schema='public'"` returns **0 tables, 0 policies**, so nothing has been applied and the sequence starts from an empty schema. **No migration has been applied, no database has been reset, nothing has been deployed, and `DATA_MODE` is still `demo`.**

Reviewing `0001`–`0004` policy by policy against the code that uses them found seven issues. Six are fixed by `supabase/migrations/0005_privilege_guards.sql` plus two small application changes; the seventh is documented as by design.

1. **Administrator promotion would have failed on the real database.** `0003` adds `profiles_admin_kind_check` (`role <> 'admin' or account_kind = 'platform_admin'`), but `setProfileRole` updated only `role`. Every demo test passed because the demo store carries no such constraint. `src/lib/supabase/repository.ts` now writes both columns on promotion, `src/lib/demo-repo.ts` mirrors the invariant, and `admin-smoke.mjs` proves it over HTTP: after a promotion, `/admin/users` lists one more "Platform administrator".
2. **A producer could have set their own `verification` or `featured`.** `0002`'s `"Producer updates their own listing"` checks only `producer_id`, and `listingToRow` sends `verification`, `featured` and `archived` with every edit. No route offers the first two to a producer, so this was a hand-made-request gap rather than a reachable bug — which is exactly the case RLS exists for. `0005` adds a `listings_privileged_columns` trigger: a non-administrator may only carry the verification their own account already has (that is what `src/app/api/listings/route.ts` sends when creating) and may never set `featured`. `published` and `archived` stay with the producer, who legitimately lists and unlists their own work. `src/lib/demo-repo.ts` now refuses the same two writes in demo mode, where the repository is the only enforcement point.
3. **Guest inquiries were broken, not merely unguarded.** `0002`'s `"System/seller appends events"` requires the caller to be the buyer, the seller or an administrator; for an inquiry submitted by a visitor `buyer_profile_id` is null and there is no signed-in profile, so none of the three can match. `createInquiry()` then writes the event that records the submission, and `/api/inquiries` accepts a guest — so the row would be created and the request would fail. `0005` replaces that policy with the participant rules plus one narrow guest case: a single `created` event, marked `buyer`, on an inquiry nobody owns yet, for a published listing whose status is still `new`.
4. **`inquiry_events.actor` was unconstrained.** Any participant could append an event labelled `system`. `0005` adds `inquiry_event_actor_is_honest`, tying each actor to the side that can attest to it, mirroring `src/app/api/inquiries/[id]/route.ts`, which already derives the side from stored data rather than from the request.
5. **`audit_logs` accepted unlimited blind writes.** `0003`'s `"Append own audit entries"` let any signed-in account insert any action, record type and summary while being unable to read them back. `0005` narrows non-administrator appends to the one action the code actually produces for them (`record_archived` on a listing or an opportunity).
6. **Group membership was a public directory.** `0002`'s `"Members readable" … using (true)` survived `0003`, so a buyer's profile id appeared in the membership table even though their profile row is private. `0005` keeps membership readable wherever the profile is already public (producer and coordinator), plus the member themself and administrators — which is all `fetchGroups()` and `membershipsFor()` need.
7. **Administrator listing deletion differed by mode.** `requireListingWriter()` permits an administrator and demo mode honoured it, while the only `listings` DELETE policy was producer-scoped. `0005` adds `"Admins delete any listing"` so the two modes agree; the application still refuses any delete that carries inquiries, and archiving stays the moderation path.

`0003`'s comment claiming "the reporter may read their own submission" was wrong — no such policy exists, and the application never shows a visitor their own report. The comment now states the behaviour. The three remaining `using (true)` reads (`collective_opportunities`, `transport_plans`, `site_settings`) are **left as they are on purpose**: `src/app/collective-orders/[id]/page.tsx` calls `getTransportPlan()` while rendering a public page, and the homepage, footer and contact page read `site_settings` for every visitor. Narrowing either would empty a section of a public page rather than protect anything. The consequence worth keeping in mind: the contact email and phone an administrator stores under **Admin → Site settings** are public by design.

Checks after the pass: `npx tsc --noEmit` clean; `npx next lint` 1 warning and 0 errors (the same deliberate `<img>`); `npm test` **63/63** (was 48 — 9 in `tests/migrations.test.ts`, 4 in `tests/supabase-repo.test.ts`, 2 in `tests/demo-auth.test.ts`); `npm run build` exit **0** from a clean `.next`; `buyer-smoke` **82/82**, `producer-smoke` **112/112**, `admin-smoke` **53/53** (was 49), `workflow-smoke` **20/20**, each on a freshly started `next start`.

`tests/migrations.test.ts` reads the five files and does not execute them. It catches the class of mistake that either breaks a push or silently leaves a table open: a created table that is never enabled for RLS, an enabled table with no surviving policy, one policy name created twice on the same table, a `using (true)` read on any table holding personal or privileged data, a `for all … using (true)` policy, the helper functions' `security definer set search_path`, and the presence of each privileged-column trigger.

**Still NOT TESTED at the time of that pass, and still NOT TESTED now as behaviour:** every policy and trigger in `0001`–`0005`. The sequence has since been applied (section 9.3), which proves the SQL parses and the objects exist — not that a policy refuses the write you expect. The stub client in `tests/stub-supabase.ts` proves which requests the repository builds, not what Postgres allows. The first real verification is still a throwaway non-administrator account attempting each refused write.

### 9.3 Migrations applied to the live project (2026-10-18)

`supabase db push` was run against the linked project `mvnaqzacecnyebwsmpho` (`omonetab-production`), with `DATA_MODE=demo` unchanged throughout. Two pushes were needed, and the first one failed for a reason no earlier pass could see.

**First push — FAIL at `0002`.**

```
Applying migration 0001_init.sql...
Applying migration 0002_rls.sql...
ERROR: syntax error at or near "group" (SQLSTATE 42601)
At statement: 16
create or replace function public.in_group(group uuid)
```

`GROUP` is a PostgreSQL reserved word, so it cannot be a function parameter name unless double-quoted; `0002` quoted it inside the body (`gm.group_id = "group"`) but not in the declaration, so `create function` never parsed. Three things let that survive to a live push: a read-through sees a correctly quoted body, `db push --dry-run` only lists pending versions and never sends the SQL to the parser, and `tests/migrations.test.ts` asserted the broken text was *present*. The function was also dead code — no policy, route, or `rpc()` call referenced it anywhere in `supabase/` or `src/`.

The damage was zero and provably so. The CLI applies each file in its own transaction: after the failure the history held `0001` only, `0002`'s three helpers and every policy were absent (`policies = 0`, `functions = 2`), and `0001`'s 14 tables, 12 enum types and 5 `set_updated_at` triggers were all there. Nothing was half-created, so no cleanup was needed and the next push simply resumed at `0002`.

**Fix, before re-pushing.** `in_group()` deleted from `0002` (an unapplied file, so editing it was legitimate; all five are applied now, so it no longer is — see section 7). `tests/migrations.test.ts` gained two checks: no function declaration may use an unquoted PostgreSQL reserved word as a parameter name, and the sequence must declare exactly the ten functions the policies and triggers need. The helper assertion no longer pins `in_group`.

**Second push — PASS**, after the checks below:

| check | result |
| --- | --- |
| `npx tsx --test tests/migrations.test.ts` | **11/11 PASS** |
| `npm test` | **65/65 PASS** |
| `npx tsc --noEmit` | exit **0** |
| `npx next lint` | 0 errors, 1 warning (the deliberate `<img>`) |
| `npm run build` from a clean `.next` | exit **0** |
| `npx supabase db push --dry-run` | listed `0002`–`0005` only, confirming `0001` was already recorded |
| link + history re-verified before pushing | `project-ref` = `mvnaqzacecnyebwsmpho`, `recorded_versions` = `0001`, 14 tables, 0 policies |
| `npx supabase db push --yes` | `Applying migration 0002…0005…` then `Finished supabase db push.`, exit **0** |

**Remote state after the push, all read back from the project:**

| object | expected | remote |
| --- | --- | --- |
| migration versions recorded | `0001`–`0005` | `0001,0002,0003,0004,0005` |
| base tables in `public` | 17 (14 from `0001` + `site_settings`, `audit_logs`, `contact_messages`) | 17 |
| tables with row level security on | 17 | 17 |
| policies | — | 50, every table between 2 and 6 |
| non-internal triggers | 14 | 14, every one `tgenabled = 'O'` |
| functions in `public` (excluding Supabase's own `rls_auto_enable`) | 10 | 10, `in_group` absent |
| enum types | 12 | 12 |
| `0003`'s added columns | 3 profile + 2 listing + 3 category + 3 review | 3, 2, 3, 3 |
| `profiles_admin_kind_check` present | yes | `CHECK ((role <> 'admin') OR (account_kind = 'platform_admin'))` |

The only `using (true)` reads that survived the sequence are the five intended public ones: `categories`, `collective_opportunities`, `producer_groups`, `site_settings`, `transport_plans`. No table holding personal or privileged data has an unqualified read.

**Seed — PASS, and idempotency proven by running it twice.** `supabase db push` never executes `seed.sql`, so it went in with `npx supabase db query --linked --file supabase/seed.sql` (exit 0, through the CLI's existing authenticated session — no key, URL or token printed). `public.categories` then held 8 rows, 8 distinct ids and slugs, 5 `product` + 3 `service`, all `active`. Re-running the same file left the count at 8, which is the `on conflict (id) do nothing` guard working rather than merely written. `site_settings` already carried its single `'site'` row, inserted by `0003` itself.

**What this did not do.** No administrator was provisioned — section 11 is left for the project owner, and `auth.users` and `public.profiles` are both still empty (0 rows). `DATA_MODE` is still `demo`; the application has never read or written this database. Nothing was committed, pushed or deployed, and no table was dropped or reset. One incident worth remembering: 14 of the 17 tables arrived with RLS already enabled and 0 policies, because Supabase auto-enables RLS on new `public` tables — the interim state was deny-all for `anon` and `authenticated`, which is the safe direction, but it is Supabase's behaviour rather than ours and nobody should rely on noticing it next time.

**Still open, in order:** provision the first administrator (section 11), then test each refused write with a throwaway non-administrator account, then set the Supabase Auth redirect URLs and `NEXT_PUBLIC_SITE_URL`, and only then flip `DATA_MODE`. Email confirmation and password recovery cannot complete at all until SMTP is configured.

### 9.4 Interface language pass (2026-10-18)

Replaces the language selector that shipped broken: it wrote only `localStorage`, nothing ever read the value back, and four of its seven options were `disabled`. The preference is now a server-readable cookie and every offered option is selectable. See [Interface languages and translation status](#interface-languages-and-translation-status) for what each language actually covers.

Checks run on the finished tree, each with the command that produced it:

| Command | Result |
| --- | --- |
| `npm test` | **78/78 PASS** — the 65 existing tests plus 13 new ones in `tests/language.test.ts` (cookie contract, forged-value fallback, the exact seven options, no invented BCP-47 tags, dictionary coverage, status/suffix rules, interpolation, catalogue fallback). |
| `npx tsc --noEmit` | exit **0** |
| `npx next lint` | 0 errors, 1 warning (the same deliberate `<img>`) |
| `rm -rf .next && npm run build` | exit **0** |
| `node tests/http/buyer-smoke.mjs` | **92/92 PASS** — was 82; the 10 additions are the interface-language block below |
| `node tests/http/producer-smoke.mjs` | **113/113 PASS** — was 112; one obsolete check became two |
| `node tests/http/admin-smoke.mjs` | **53/53 PASS** |
| `node tests/http/workflow-smoke.mjs` | **20/20 PASS** |

Each HTTP suite ran against its own freshly started `next start` process on a separate port (`SMOKE_BASE=http://localhost:32xx node tests/http/…-smoke.mjs`), because every suite mutates the in-memory demo store. Note for whoever re-runs them: a `next dev` process left running in the same checkout overwrites `.next` with development output, and `next start` then fails with *"Could not find a production build in the '.next' directory"* — build again, do not debug the port.

Two smoke assertions encoded the **old** policy — that an unreviewed interface language must be refused — and were replaced rather than left failing:

- `producer-smoke.mjs` asserted `PATCH /api/profile` with `preferredLanguage: 'hamer'` returned 400. That policy is gone: saving a preference is harmless even where the wording does not exist yet, and refusing it was the bug that made four of seven languages unusable. It is now two checks — `hamer` is accepted and echoed back, while an invented code (`hamer-ish`) is still refused with 400.
- `buyer-smoke.mjs` asserted the same refusal for a tourist account. It now asserts the opposite: `am` is saved and read back, because a draft dictionary is a legitimate preference.

The new buyer block starts each language from a clean process and asks the served HTML, not the component source:

| Check | Result |
| --- | --- |
| Simplified Chinese renders and stays selected | **PASS** — `lang="zh-Hans"`, 产品 on the page, `<option value="zh-Hans" … selected>` |
| Italian renders and stays selected | **PASS** — `lang="it"`, marker and selected state present |
| The Amharic draft renders where wording exists | **PASS** — `lang="am"`, ምርቶች rendered, English elsewhere |
| Hamer / Dasenech / Tsamai say plainly that they have no translation | **PASS** — `lang="en"` (the text really is English) plus the "No verified … translation exists yet" notice |
| An unknown language cookie cannot switch the site and does not break it | **PASS** — 200, English |
| The default language is English | **PASS** |
| A translated listing page keeps its price and demo label | **PASS** — 示例手织储物篮套装 with 125.00 unchanged |
| The Italian listing page warns that catalogue wording is unverified | **PASS** |

**What is NOT TESTED**, and stays unverified rather than claimed: a screen-reader or keyboard sweep of the selector; rendering in a real browser of anything beyond the HTML the suites assert on; and Supabase-mode profile language writes, since `DATA_MODE` is still `demo`. The database column was checked by reading it, not by writing to it — `supabase/migrations/0001_init.sql` declares `preferred_language text not null default 'en'` with no enum or check constraint, so the seven offered codes all fit without a schema change.

### 9.5 Real producer catalogue (2026-10-18)

The producers' own material replaced most of the invented sample catalogue. Nothing about the data mode, schema, routes, roles or language rules changed to make that happen; the real products are ordinary `Listing`, `ListingImage` and `Profile` records in `src/lib/demo-data.ts`.

**What was supplied, and what became of it.** `Pictures/` holds 25 `.docx` documents and 74 `.jpg` photographs: 18 product documents, 4 seller documents (Mr. Getachew Kafa, Mrs. Gado Gofa, Mrs. Tate, Mr. Chufo Adey) and 3 hotel documents. Twenty-one listings are now published from it — 18 products and 3 accommodation services — priced 100 to 3,500 ETB. Sixty-nine photographs are published under `public/images/products/<folder>/`, resized to a 1400 px longest edge, downscaled only, never upscaled. `Pictures/` and `.pending-review/` are git-ignored, are not copied into `public/`, and are not reachable through any URL; a visitor reads product text on the product page, never a document.

**Who sells what.** Mr. Getachew Kafa: Fota (menswear), Fota (womenswear), Barabaso. Mrs. Gado Gofa: Kashi, Chele (beaded bracelet), Shikini (beaded necklace). Mrs. Tate: Borde. The 3 hotels each sell their own room-night listing (600 / 3,500 / 700 ETB per day). Eleven products arrived with no seller named in the documents — Kuri, the five artifacts and the five cutlery pieces — and are held by one obviously-labelled account, `prof_pilot_holding`, "OmoNetTab pilot holding account — producer not yet recorded". Mr. Chufo Adey's document names his services but quotes no price, so he has a seller page that says "No published listings yet" rather than an invented price.

**Fields that were not in the documents are stated, not guessed.** Stock and availability were never recorded, so every real listing uses the app's existing made-to-order convention (`availability: 'made_to_order'`, `availableQuantity: 0`, `minOrderQuantity: 1`) with a sentence on the page saying the producer did not record it. Community, exact location and pickup point are the same where the notes are silent ("Not recorded in the producer's notes", "South Omo (exact location not recorded…)", "Collection point not recorded — arrange it with the producer when you inquire."). The hotels deliberately carry no `tourism` metadata (duration, group size, inclusions) because the documents do not state it, and no cultural claim was added to any description: the description is the producer's own wording, verbatim, plus their documented materials lines.

**Privacy decisions taken in this pass.**
- Four photographs are identifiable portraits of named people (the three sellers with phone numbers and Mr. Chufo Adey) with no consent record, and one photograph whose product association could not be established from the documents. Those five are withheld in `.pending-review/` and need a person to decide, not a build. Nothing else in the 74 showed a publishable face.
- Phone numbers appear on seller pages because the documents supplied them for public contact and the user chose to publish them as supplied (`ContactMethod` `{ kind: 'phone', consent: true }`), and only where consent is set — `publicContact()` in `src/app/producers/[id]/page.tsx` still falls back to "In-app inquiry only" otherwise.
- **0977105752 is recorded for both Mr. Chufo Adey and Mr. Getachew Kafa.** Both profiles say so in `verificationNote`. This is flagged, not resolved; a human has to establish whose number it is.
- Real seller accounts cannot be signed in as. `canSignInAsDemo()` in `src/lib/store.ts` is now shared by `POST /api/session` and the sign-in picker, so the picker lists only `demo_user_*` accounts and a visitor never meets a dead button. Hiding the option was not treated as the boundary — the endpoint refuses the same way.

**Language rules were not bent.** `CATALOG_REVIEWED` is still `false`, and no producer wording was machine-translated: `listingTexts()` has no entries for real listings, so Chinese, Italian and Amharic visitors see the producer's English text inside translated chrome. The only catalogue translation removed was `lst_cotton_shawl`, which no longer exists; the 8 categories and the remaining sample fixtures keep theirs.

**Verification numbers for this pass** (each suite against its own freshly started `next start` process, `NEXT_DIST_DIR=.scratch-build` so a production build never writes into the `.next` the developer's `next dev` owns):

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit **0** |
| `npm test` | **88/88 PASS** (includes the 10 new tests in `tests/catalogue.test.ts`) |
| `npx next lint` | 0 errors, 1 pre-existing warning (the deliberate `<img>`) |
| `NEXT_DIST_DIR=.scratch-build npx next build` | exit **0** |
| `SMOKE_BASE=http://localhost:3311 node tests/http/catalogue-smoke.mjs` | **235/235 PASS** (new suite) |
| `…:3312 node tests/http/buyer-smoke.mjs` | **92/92 PASS** |
| `…:3313 node tests/http/producer-smoke.mjs` | **113/113 PASS** |
| `…:3314 node tests/http/admin-smoke.mjs` | **53/53 PASS** |
| `…:3315 node tests/http/workflow-smoke.mjs` | **20/20 PASS** |

`tests/catalogue.test.ts` checks the data itself: every real listing's photograph path exists on disk, no photograph is shared between two listings, no orphan file is left in `public/images/products`, nothing under `public/` is a document or HEIC, every category and seller reference resolves, prices are whole birr in ETB, and the 11 unsold products sit with the labelled placeholder. `tests/http/catalogue-smoke.mjs` asks the served HTML the same questions a visitor would: does each product page show its own title, price, wording and photographs, do two products ever share a description (the big and small shorka are the documented exception — their producer notes were word-for-word identical), is every one of the 67 photographs served as `image/jpeg`, are `/Pictures`, `/Documents`, `/supabase/seed.sql` and a guessed `.docx` path all 404, do category, search and price filters still behave, and does the interface stay honestly in demo mode while the record itself is no longer tagged as sample data.

**What is NOT TESTED.** Browser screenshots could not be produced — the in-app browser had no visible surface during this pass (`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`, `visibilityState=hidden`), so visual verification was limited to DOM inspection through `evaluate_script`: it confirmed the Kashi gallery's three photographs each decoded at 1050 px with distinct alt text, the homepage references all five featured real photographs with no broken image, and Mrs. Gado Gofa's page renders "Phone: 0919219830" and her three listings. Layout, spacing and mobile appearance were not eyeballed. Supabase mode was not exercised at all — see the drift note below.

**Every photograph was looked at before this tree was published.** The 69 resized images that the catalogue pass produced were each classified for personal identifiability: the `artifact-*` folders hold carved wooden figures and a mask, not people; the jewellery and cloth sets show wrists, necks and torsos with the head out of frame; the guesthouse sets show buildings. Two Shikini necklace photographs — the model's mouth, chin, beard and ear in close view — were the only ones where a stranger who knows the person could plausibly have recognised them, and no consent record covers a recognisable person, so they were moved to the git-ignored `.pending-review/withheld-lower-face-2026-10-19/` folder and removed from the listing. **67 photographs are published; the necklace listing keeps its other three.** Business signage is a different matter and was left as supplied: the Kizo Lodge and Selhadin Pension photographs show their own signboards, with the business names and telephone numbers legible, which is the intended use of a listing for a place a visitor can walk into.

**Remaining default content, and why it stays.** Five labelled sample listings survive: `lst_basket_set` and `lst_forest_honey` are fixtures the authorization and HTTP suites depend on, and `lst_milk_butter`, `lst_valley_walk`, `lst_craft_session` are the only records keeping Dairy and agricultural products, Guided visits and Craft demonstrations populated at all, so removing them would empty three of the eight categories the task says to keep. `cat_other` has no listing of any kind.

**Demo/Supabase drift, unresolved by design.** `supabase/seed.sql` still seeds the old invented products; the real catalogue exists only in the demo repository, because writing it to the live database would be a database change and `DATA_MODE` is still `demo`. Anyone who wants Supabase mode to match needs a reviewed insert script for the 21 listings, 67 image rows and 8 profiles first.

### 10. Production build status



`npm run build` completed successfully with the current tree: 59 pages and 27 route handlers compiled, no type or lint errors, and every data-bearing route emitted as dynamic (`ƒ`) because both repositories read per request. `npm run start` then serves that build. The build was produced from a clean `.next` directory (`rm -rf .next` first) on 2026-10-17 and again on 2026-10-18 after the audit fixes; both exited 0. `npx next lint` without `--quiet` reports one warning and no errors: the deliberate `<img>` in `src/components/listing-images.tsx`, which stays a plain tag because producer pictures are external links that `next/image` cannot optimize without a configured domain.

### 11. Setting up the first administrator, securely

There is no public endpoint that grants administrator access, in either mode. `roleForNewAccount()` maps registration to `buyer` or `producer` only, the profile route overwrites any role the browser sends, and in Supabase mode `profiles_privileged_columns` and `profiles_guard_admin_insert` refuse a privileged write from a caller who is not already an administrator.

**Demo mode.** Nothing to provision: the sample reviewer account on `/sign-in` already has `role = 'admin'`. It is sample data, not a credential, and it resets when the server restarts.

**Supabase mode, first administrator only.** After the account has registered normally through `/register` → `/onboarding` (so `auth.users` holds a real identity with a password the person chose), run this in the Supabase SQL editor while signed in as the project owner. It is one transaction, one row, and the guard is restored inside the same transaction:

```sql
begin;

-- 'you@example.com' is the address the intended administrator signed up with.
create temp table _first_admin on commit drop as
  select id from public.profiles
  where user_id = (select id from auth.users where email = 'you@example.com');

alter table public.profiles disable trigger profiles_privileged_columns;
alter table public.profiles disable trigger profiles_guard_admin_insert;

update public.profiles
   set role = 'admin', account_kind = 'platform_admin'
 where id = (select id from _first_admin);

alter table public.profiles enable trigger profiles_privileged_columns;
alter table public.profiles enable trigger profiles_guard_admin_insert;

commit;
```

Then:

1. Verify the transaction really produced an administrator, and that the guards are back on. `select count(*) filter (where role = 'admin') as admins from public.profiles;` must return `1`. Read this one first, because the UPDATE above affects zero rows and still commits cleanly when `_first_admin` is empty — which happens if the address does not match `auth.users` exactly (the comparison is case-sensitive, so copy the spelling from Auth → Users) or if the account registered but never finished `/onboarding` and has no profile row. Then `select role, account_kind, status from public.profiles where role = 'admin';` should show exactly one row carrying both privileged values. `select tgname, tgenabled from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal;` must return `O` for every trigger, which is the check that the two `enable trigger` lines ran, and `select relrowsecurity from pg_class where relname = 'profiles';` must return `true`.
2. Sign in as that account and confirm `/admin` renders for it, and that a producer account is still refused at `/api/admin/roles`.
3. From now on, promote every further administrator through **Admin → Roles** with the confirmation step. Do not repeat the SQL above; the triggers are the protection against a self-promotion, and leaving them disabled is a regression in the security model.
4. Keep at least two active administrators. The application refuses to demote or suspend the last active one, which is also why step 3 matters before anyone leaves the project.
5. Provisioning should happen before the registration page is reachable to the public, or with `DATA_MODE=supabase` on a private preview URL. If the database is already open to signups, someone could take the administrator seat first; the triggers stop them from being handed it, but they do not stop a race for the SQL step.

**Why the two `disable trigger` lines are needed, and what they do not cover.** On this project the SQL editor and the CLI connect as `postgres`, which holds `bypassrls` (verified against `mvnaqzacecnyebwsmpho`: `rolsuper = false`, `rolbypassrls = true`). So Row Level Security is not what refuses a bootstrap promotion — the triggers are, because Postgres fires triggers for the table owner as well, and `is_admin()` is false in the SQL editor since no JWT exists there. That does not make this reachable by an ordinary user: everything this sequence creates is owned by `postgres`, `alter table … disable trigger` needs that ownership, and the `anon` and `authenticated` roles have neither `bypassrls` nor superuser. The same rule keeps working after the bootstrap, and it is worth knowing before anyone hand-writes SQL: an administrator cannot be inserted by hand either (`profiles_guard_admin_insert` raises `42501`), and neither can a listing carrying `verification = 'verified'` or `featured = true` (`listings_privileged_columns`). Provision further administrators through **Admin → Roles**, and let listings be verified through the admin UI — do not disable triggers a second time to make hand-written SQL go through.

A `service_role` key is not needed for any of this, and the application is written so that it never reads one.

### 12. Running locally

```bash
npm ci
cp .env.example .env.local      # defaults to DATA_MODE=demo, no credentials needed
npm run dev                     # http://localhost:3000
npm run typecheck && npm run lint && npm test
```

To reproduce the HTTP verification, start a **fresh** dev server in one terminal and run one suite per server start, in another:

```bash
npm run dev                                  # leave this running
SMOKE_BASE=http://localhost:3000 node tests/http/admin-smoke.mjs
```

Then stop the server, start it again, and run `tests/http/buyer-smoke.mjs`; repeat for `tests/http/producer-smoke.mjs` and `tests/http/workflow-smoke.mjs`. On Windows, set the variable for one command with `$env:SMOKE_BASE="http://localhost:3000"; node tests/http/admin-smoke.mjs`.

### 13. Deployment

1. Deploy to any Node 18.17+ host that runs `npm run build` and `npm run start` (Vercel, a container, or a plain Node host). No provider is configured in this repository, and nothing has been deployed from it.
2. Apply **all five** migrations in order (section 7), seed categories, and provision the first administrator (section 11) **before** switching the application to the database. On `mvnaqzacecnyebwsmpho` the first two are already done (section 9.3); the administrator is not, and until it exists `DATA_MODE=supabase` would give you a working database that nobody can administer. `DATA_MODE=supabase` is the last value you set, not the second: a project holding only `0001` and `0002` still lets a signed-in account promote itself to administrator through its own profile row.
3. Set `NEXT_PUBLIC_SITE_URL` to the public origin, then `DATA_MODE=supabase` with the project URL and public key. `NEXT_PUBLIC_SITE_URL` is not optional once real accounts exist: the confirmation and password-reset links are built from it, and unset it emails a link to `localhost:3000`. `NEXT_PUBLIC_*` values are read at build time, so a host that injects them at runtime still needs a rebuild.
4. In the Supabase dashboard, add the deployed origin to the allowed redirect URLs for email confirmation and password recovery. `/auth/callback` redirects on relative paths, so it returns the visitor to whichever origin they arrived on; the only absolute address it depends on is the `emailRedirectTo` built during registration (step 3). It accepts a `?next=` only under `/dashboard`, `/admin`, or `/buyer`.
5. Confirm after deployment that `/api/session` refuses demo sign-in (it returns 400 when `DATA_MODE=supabase`), that a suspended account loses write access, and that no `SUPABASE_SERVICE_ROLE_KEY` exists in the host's environment.
6. Until step 2 has actually been performed by someone with credentials, treat any deployed instance as demo data — the README status line at the top should be updated only when it is not.

**On Vercel specifically.** Nothing is configured for it in this repository: there is no `vercel.json`, no `.github/workflows`, and no project has ever been deployed from here, so all of the following is a checklist, not a verified deployment. Vercel detects Next.js 14 automatically and needs no override for build (`npm run build`), output (`.next`) or start. Set `DATA_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` on an older project) and `NEXT_PUBLIC_SITE_URL` as environment variables **for the Production environment before the first build**, because `NEXT_PUBLIC_*` is inlined at build time and changing one later requires a redeploy. Never add `SUPABASE_SERVICE_ROLE_KEY` — the application does not read it, and its presence on the host is an accident waiting to happen. Then add both `https://<project>.vercel.app` and the production domain (if any) to Supabase Auth's redirect Allow list, and set SMTP before enabling email confirmation or password recovery; without SMTP those two flows cannot complete, and the pages already say so in demo mode. There is no object storage configured, so pictures stay external links and `public/sw.js` caching is the only asset cache in play. `package.json` declares no `engines` field; the build was produced on Node 24 locally, so pin a version on the host rather than assuming Vercel's default matches.

### 14. Known security and integration limitations

- **Demo session is not authentication.** In `DATA_MODE=demo` the session cookie is a plain JSON `{userId}` with no signature. Carrying a role is impossible, but anyone who can set that cookie can act as that sample account. It is acceptable only because demo mode holds throwaway sample records and no real data — which is why the brief's "do not pretend demo mode is production authentication" is honoured by labelling rather than by treating it as a security boundary.
- **RLS is unverified.** The policies and triggers are reviewed code, never executed. A live test must attempt the same refusals the HTTP suites made, directly against Postgres with the public key.
- **No rate limiting or abuse controls** on inquiry, contact, report, or review endpoints; a guest can submit repeatedly.
- **Picture addresses are stored as supplied.** New entries must be `http(s)`, and every `<img>` renders the producer's own link, so a listing can point at a host that later changes the picture or logs the viewer. Nothing fetches or verifies the image.
- **Consent statements are recorded, not verified**, including for cultural imagery; the community-guidelines page is a draft awaiting review with community partners.
- **Estimated totals are estimates.** They are computed from the listing price at submission time and never represent money owed, held, or paid.
- **Email delivery is untested** — password recovery and confirmation depend on a configured SMTP/provider inside Supabase Auth; in demo mode those pages state plainly that no mail service exists.
- **No account deletion self-service**, no data-export path, and no retention policy yet; the privacy page is a placeholder that must be finalised with legal review before real data.
- **The interface brand is settled; one live database row is not.** The UI, the manifest, the logo file and this README say **OmoNetTab** with the tagline **Connecting Cultures and Commerce**, and so do `DEFAULT_SITE_SETTINGS` (`src/lib/settings.ts`) and the demo seed. Two leftovers remain, one deliberate and one pending. Deliberate: internal identifiers still carry the older name (`omolink_demo_session`, `omolink_drafts`, `omolink_lang`, `__omolinkDemoStore`, the migration comments) because renaming them would orphan live sessions and the listing drafts already stored on users' devices — they are not shown to anyone. Pending: the `site_settings` row that `0003` seeded into `mvnaqzacecnyebwsmpho` still holds `"siteName": "OmoLink"` with the old tagline and hero text, and `0003` is applied and frozen, so this is a data change rather than a migration. Once an administrator exists, save the values under **Admin → Site settings**; before that, this one-off statement carries the same correction. **Neither has been run.**

  ```sql
  update public.site_settings
     set settings = settings || '{
           "siteName": "OmoNetTab",
           "tagline": "Connecting Cultures and Commerce",
           "heroDescription": "OmoNetTab helps rural entrepreneurs, local producers, artisans, and community tourism providers in South Omo present their offerings and receive inquiries from potential customers."
         }'::jsonb,
         updated_at = now()
   where id = 'site';

  -- read-only confirmation
  select settings ->> 'siteName' as site_name, settings ->> 'tagline' as tagline
    from public.site_settings where id = 'site';
  ```

  Until one of the two is done, `DATA_MODE=supabase` serves the old brand from the database: `mapSiteSettings` (`src/lib/supabase/mappers.ts:439`) falls back to the code defaults only for keys the row does not have, and `siteName` is one it does have.

- **Offline reading works for pages you actually browsed.** The service worker registers only in a production build (development bundle URLs keep their name while their contents change, so caching them would hide new code). A page loaded while the worker controlled the tab is readable and interactive afterwards without a network. A page whose HTML was precached but never browsed that way can arrive without the JavaScript chunks it needs, and React then shows its client-exception message instead of the cached text; the fix would be a per-page chunk manifest, which is not implemented. See the browser table in section 9.
- **`navigator.onLine` is weaker than it looks.** It means the device has a network interface, not that OmoNetTab can be reached. With the origin down but Wi-Fi up, the header chip still reads "Online" even though the app is serving from cache.
- **Local queues are device-local and unencrypted.** Queued inquiries and listing drafts sit in `localStorage`/IndexedDB for whoever holds that phone, and clearing site data deletes them. They are not delivered to anybody until the buyer presses send again with a connection.

### 15. Three-minute demonstration script

Run in demo mode (`npm run dev`), which resets on restart, so it can be shown repeatedly. For step 7 only, use `npm run build && npm start` instead — the offline worker deliberately does not register in development.

1. **Public side, signed out** — `/` → open a basket listing → show the labelled sample placeholder, the unit price in ETB, and the note that no payment moves. Send an inquiry for 3 bundles as a guest and point at the reference number.
2. **Seller side** — sign in as the basket producer → `/dashboard/orders` shows it under "Goods to supply", `/dashboard/inquiries` filters by listing → accept it, move it to "Fulfillment arranged", and note that the status says nothing was delivered yet.
3. **Listing control** — `/dashboard/listings` → unpublish, show the public page refusing with a 404, republish → attach a picture, show that the alt description and consent statement are required → archive.
4. **Buyer side** — sign in as the hotel account → `/buyer/orders` shows the same record from the other side, with the buyer's own confirm/cancel actions and the same "not a receipt" wording.
5. **Group selling** — sign in as the coordinator account → open a collective opportunity, watch contributions aggregate toward the target, confirm one contribution, and show that withdrawing it recomputes the total. Show the transport figure labelled as an estimate.
6. **Administration** — sign in as the reviewer → `/admin/users` suspend the buyer account → show, in the buyer's own tab, that reads still work but every write is refused → reactivate. Try to promote an account without the confirmation checkbox, then attempt to demote the last administrator and show the refusal.
7. **Low connectivity** — on the production build, open a listing, then stop the server (or turn the device off the network) and revisit that same listing: it still renders, and changing the quantity still recomputes the subtotal, from the cache. Then visit a page you never opened and show the `/offline` explainer, plus the draft picker and the queued-inquiry notice. Say plainly what is not real: no payment, no SMS, no verified producers, no live database yet, and an offline write waits on the phone until someone sends it.

## Interface languages and translation status

The header offers seven languages. Every one of them is selectable and saves; **not** every one of them has translated wording, and the site says which is which rather than pretending.

| Offered as | Code | Interface coverage | Review status | `<html lang>` |
| --- | --- | --- | --- | --- |
| English | `en` | 2094/2094 keys — the source of truth | Written in English, needs no review | `en` |
| አማርኛ (Amharic) | `am` | 112/2094 | **Draft, native review pending** — a header comment in `src/lib/i18n/am.ts` records that every term needs a competent speaker | `am` |
| 简体中文 (Chinese, Simplified) | `zh-Hans` | 2094/2094 | Complete, **not yet reviewed by a speaker** | `zh-Hans` |
| Italiano | `it` | 2094/2094 | Complete, **not yet reviewed by a speaker** | `it` |
| Hamer | `hamer` | 0/2094 | No translation exists | `en` — the page genuinely is English |
| Dasenech | `dag` | 0/2094 | No translation exists | `en` |
| Tsamai | `tsamai` | 0/2094 | No translation exists | `en` |

`hamer`, `dag` and `tsamai` are **identifiers this repository chose**, not tags claimed for the browser. No BCP-47 tag is asserted for them here, because none has been looked up and confirmed against a language registration — and a wrong tag would let the markup claim a language the page is not written in. So `documentLang` stays `en` for those three, which is the truth: the text on screen is English. Getting a speaker's dictionary in place is step one; choosing the correct registered tag is a lookup to do with them, in `src/lib/language.ts`, not a guess to make now. `rtl` is `false` for all seven options and no page is forced into a right-to-left layout.

### How the choice is stored and applied

- The selector is a plain `<select>` (unchanged styling, `sr-only` label, native keyboard behaviour) in `src/components/language-selector.tsx`. Changing it calls the `'use server'` action `saveLanguagePreference()` in `src/lib/language-actions.ts`, which sets the `omonettab_lang` cookie — `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`, one year — then `revalidatePath('/', 'layout')` and `router.refresh()` inside a `useTransition`. The interface updates without a full page load, and the selected option is read back from the server, so the control can't disagree with the page.
- Server components read the cookie through `getLanguage()` / `getT()` (`src/lib/i18n/server.ts`); client components receive the code as a `lang` prop and call the pure `t(lang, key, vars)`. `next/headers` never reaches a client bundle.
- The value is validated by `isLanguageCode()` on the way in and by `safeLanguageCode()` on every read. A forged or stale cookie (`fr`, `EN`, `en-US`, `drop table`, an empty string, a number, an array) falls back to English instead of erroring. `/api/profile`'s `preferredLanguage` accepts all seven for the same reason: storing a preference is harmless, and the old refusal was what made four languages unusable.
- **The previous implementation only wrote `localStorage['omolink_lang']`, nothing read it back, and left four options disabled.** That key is no longer read anywhere, so a returning visitor starts on English until they choose again; there is no migration of the old stored value.
- A signed-in profile's `preferredLanguage` is a stored preference; the cookie is what renders a page. The column is `preferred_language text not null default 'en'` (`supabase/migrations/0001_init.sql:41`) with no enum or check, so no schema change was needed and none was made.

### What is translated, and what is not

Translated where the dictionary has the key: essentially the whole interface. Header, footer and navigation; the home page including the Founders & Team preview; the marketplace browse pages (`/products`, `/tourism`, `/explore`) with their filters and result counts; listing pages with their inquiry, review and report panels; producer profile pages; `/team`, `/how-it-works`, `/privacy`, `/community-guidelines`, `/contact`, `/pricing-tool`; the collective order list, detail, new and manage pages with the buyer panel and the producer contribution form; sign-in, register and onboarding; `/impact` and `/offline`; and the signed-in areas (`/dashboard`, `/buyer`, `/admin`) including the admin analytics and audit screens. A missing key shows as English text rather than as a key or a blank — for Amharic that fallback is still visible on most of the interface, because only 100 keys exist.

### Honesty rules the code enforces

- Coverage and review are **separate facts**. `languageStatus()` answers only coverage (`complete` / `partial` / `not_available`); `REVIEW_PENDING_LANGUAGES = ['zh-Hans','it','am']` and `amReviewPending` answer whether a speaker has read it. The dropdown suffix comes from `languageSuffixKey()`, which combines the two, so a complete-but-unreviewed dictionary says "complete, needs speaker review" and cannot be reported as done.
- The dropdown itself carries the same admission: each `<option>` shows the suffix from `languageSuffixKey()`, and its `title` states the coverage in words plus ", wording not yet reviewed by a speaker" whenever `coverageFor(code).reviewPending` is true. There is no separate page-level draft banner — the site-wide demo notice and the `LanguageNotice` block were removed once the header stated the facts.
- `zh-Hans` and `it` are typed as `TranslationSet = { [K in TranslationKey]: string }`, so a missing key is a **compile error** rather than a runtime surprise. Amharic is a `Partial<TranslationSet>` and the three local languages are empty objects — deliberately, so no future edit can imply coverage that a speaker has not reviewed.
- `tests/language.test.ts` asserts the fallback dynamically (it finds a key Amharic genuinely lacks rather than a hardcoded one), that coverage equals the key count, that no invented tag exists, and that every offered code round-trips.

### Product and category text

Listing copy is a data field, not an interface string, so it is translated separately in `src/lib/i18n/catalog.ts`: a map of two languages (`zh-Hans`, `it`) × the **demo** record ids — the eight categories (`cat_handicraft` … `cat_other`) and six listings (`lst_basket_set`, `lst_forest_honey`, `lst_cotton_shawl`, `lst_milk_butter`, `lst_valley_walk`, `lst_craft_session`) — each entry `{ name, description? }`. `categoryTexts()` / `listingTexts()` return `{ text, translated }`, so the caller always knows whether it is showing a translation or the original.

- The producer's original wording is always preserved and is what English and the three untranslated languages show.
- Unknown ids — which is **every listing in Supabase mode, because a real producer wrote the text** — keep their published wording. Nothing is machine-guessed.
- Prices, availability, references, and record data are never routed through the dictionary; only the description, title and category name are, and a translated listing page still shows the same price (verified in the buyer suite).
- `CATALOG_REVIEWED` is `false`, so an Italian or Chinese listing page carries a notice that the catalogue wording is not yet speaker-verified. Flipping that flag is a review decision, not a code change.

### No translation provider is wired

There is **no paid or external translation dependency in this build, and no environment variable to configure.** Deliberately:

- Google Cloud Translation (or DeepL, Azure, Amazon Translate) needs an API key and a billing account. Undocumented "free endpoint" mirrors of Google Translate are unofficial, can break or start charging at any time, and are not used.
- Sending producer descriptions, inquiry messages, contact details or names to a third-party translator would move private user information outside the platform without the person's consent.
- Translating the whole application on every page load would add latency and cost to a page that is mostly static text.

So the app is fully functional with zero provider configuration: dictionaries are local modules, resolved at render time. If a provider is ever added, the requirements to document are the key, the billing account, a rate limit, a data-processing agreement, and an explicit user opt-in per piece of content — and machine output must be labelled as unreviewed, the way `zh-Hans` and `it` already are.

### Contributing a reviewed local-language dictionary

1. Add keys to `src/lib/i18n/en.ts` only if new interface text needs one; `en.ts` is the source of truth and every other dictionary is typed against its key union.
2. Hamer, Dasenech and Tsamai have **no dictionary file yet** — they are the `{}` literals in `src/lib/i18n/index.ts`. Create `src/lib/i18n/hamer.ts` (or `dag.ts`, `tsamai.ts`) and fill it with wording **confirmed by a competent speaker of that language**, including whether a script or a romanisation the community actually uses is expected. Do not supply text by guessing or by machine output.
3. Type the new module as a full `TranslationSet` and register it in `translations` in place of the `{}`. The compiler then proves the dictionary is complete. Remove the code from `REVIEW_PENDING_LANGUAGES` only once a speaker has read the **rendered pages**, not merely the strings.
4. Set a real `documentLang` in `src/lib/language.ts` if and only if the language has a legitimate BCP-47 tag (check the registered tag; do not reuse the internal identifier).
5. Add product/category text to `src/lib/i18n/catalog.ts` separately, and keep `CATALOG_REVIEWED` false until that wording is also reviewed.
6. Run `npm test`, `npx tsc --noEmit`, and the buyer suite — its interface-language block is data-driven over `LANGUAGE_OPTIONS`, so a new dictionary is asserted as soon as it is offered.

For Amharic specifically: the 100 keys in `am.ts` need a competent speaker's review before `amReviewPending` is set to `false`. The remaining ~2,007 keys still have to be written, and the set covers the priority journeys (navigation, home, listing detail, collective orders, inquiry validation, sign-in) rather than the whole interface. On Founders & Team only the page title is drafted: the role and background labels were dropped from the draft rather than re-guessed when the team supplied new titles, so they currently render as English.

## Payments, PDF receipts, admin reports, and appearance

This section documents the four features added most recently, including what is
*not* true about them.

### What is live and what is simulated

No money moves anywhere in this build. In demo mode (`DATA_MODE=demo`, which is how
the project currently runs) the payment provider is a labelled simulator, and every
payment record, receipt and report row that comes from it is marked as simulated.
There is no SMS, USSD, or email payment link wired to a real gateway, and no Chapa
call has been executed against Chapa's API from this codebase.

The provider boundary is `src/lib/payment-providers/`:

| File | Role |
| --- | --- |
| `contract.ts` | The interface every provider implements, plus the error types. |
| `demo.ts` | The simulator used in demo mode. Outcomes are chosen by the buyer on a clearly-labelled control. |
| `chapa.ts` | Hosted checkout against `api.chapa.global` (`POST /v2/payments/hosted`, `GET /v2/payments/{reference}/verify`), with HMAC-SHA256 webhook signature checking. |
| `index.ts` | Chooses the provider. Refuses `PAYMENT_PROVIDER=demo_simulated` when `DATA_MODE` is not `demo`. |

To make a real payment possible:

1. Set `DATA_MODE=supabase` and the Supabase keys.
2. Set `PAYMENT_PROVIDER=chapa`, `CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`
   (names only — see `.env.example`; never commit values).
3. Apply migration `0006_payments.sql` (see "Migrations that have not been applied").
4. Register the webhook endpoint at the provider and point it at
   `/api/payments/webhook`.
5. Run one sandbox transaction before telling anyone payments work.

Amounts are integer cents end to end (`Money = { cents, currency }`); the browser
never supplies a total that the server trusts. A webhook never sets a status by
itself: it re-runs the provider's verify call, so a repeated or forged event cannot
confirm a payment.

### PDF receipts

`src/lib/receipts.ts` builds the document and `src/lib/pdf-kit.ts` draws it with
`pdf-lib` (a new dependency of this pass; it is server-side only). A receipt is
generated when it is asked for, from the stored records, and is never cached on the
server.

- Route: `GET /api/payments/[reference]/receipt` — the buyer of record, the seller of
  the listing, or an administrator. Anyone else gets 401/403; the check runs on the
  server, not by hiding a link.
- A payment that is not confirmed produces a *payment summary* or an *inquiry
  record*, never a receipt claiming money arrived, and a simulated payment says so on
  the page.
- Fonts: the embedded standard fonts are WinAnsi (CP1252) only. Characters outside
  that range are drawn as `?`, and both receipts and reports append an explicit note
  admitting the substitution rather than silently dropping the text. Amharic, Chinese
  and the unwritten local languages therefore cannot be printed in their own script;
  `PRINTABLE_LANGUAGES` is `['en', 'it']`, and the printable language is stated on the
  document.

### Administrator reports

`src/lib/business-reports.ts` is a pure module: the on-page report, the CSV and the
PDF are all built from the same figures, so they cannot disagree.

- Page: `/admin/business-reports` (the "Business reports" tab). It is separate from
  `/admin/reports`, which is the reported-listings queue.
- Export: `GET /api/admin/business-reports/export?format=csv|pdf&range=day|week|custom&from=&to=&seller=&category=&status=&provider=`.
  The route re-checks `requireRole('admin')` itself; the admin layout gate is a
  convenience, not the boundary.
- Timezone: `Africa/Addis_Ababa` (UTC+3, no DST). "Today" means the Addis calendar
  day, computed with zone-aware day boundaries, not the server's clock.
- Revenue counts confirmed payments only. Refunds are reported apart, never as
  negative revenue in the same column. Duplicate provider records for one reference
  are collapsed (`uniqueByReference`), and an inquiry with two payment attempts counts
  as one paid inquiry.
- CSV: 21 columns, a UTF-8 BOM so Excel reads Amharic names correctly, quote-aware
  escaping, and a leading `'` on any cell starting with `= + - @ TAB CR` so a stored
  string cannot become a formula when the file is opened in a spreadsheet.
- Rows beyond 25 per table are omitted with a notice saying how many were left out.

### Appearance (light / dark)

Every signed-in role chooses light or dark on their own settings page — buyer at
`/buyer/settings`, seller and coordinator at `/dashboard/settings`, administrator at
`/admin/settings`.

- The choice is applied immediately on click, and is also written to the
  `omonettab_theme` cookie, so the *next server render* arrives already painted in it
  (`<html class="theme-light|theme-dark">`). Nothing waits on a script, so there is
  no flash of the other scheme, and the choice survives a reload, a sign-out, or a
  page the browser has never opened.
- `src/lib/theme.ts` holds the pure rules; `theme-actions.ts` is the server action;
  `theme-server.ts` reads the cookie and hands the account's saved scheme back at
  sign-in (`/api/session` for demo, `/api/auth/signin` for Supabase).
- The value is only ever read through `safeThemePreference`, because a cookie is
  attacker-editable and it decides a class name in the document. A forged value paints
  the default instead.
- Storage: the browser cookie always works. The account copy needs the `theme` column
  from migration `0007_profile_theme.sql`, which has **not** been applied. Where it is
  missing, the interface says "saved on this browser" rather than claiming more than
  it did.
- Mechanism: the Tailwind palette entries are CSS variables
  (`tailwind.config.ts`), with light values in `globals.css :root` and dark values in
  `.theme-dark`, so the scheme changes the whole app rather than one component. The
  few classes that carry a solid brand fill keep their light-mode colour so a clay
  button stays a clay button.
- The language selector is untouched by this feature: `omonettab_lang` and
  `omonettab_theme` are independent, and a page can be Italian and dark at once.

### Migrations that have not been applied

`supabase/migrations/0006_payments.sql` and `supabase/migrations/0007_profile_theme.sql`
are written for review and are **not** applied to the live project. Nothing in this
pass ran SQL against the database.

- 0006 adds `payments` and `payment_events` with RLS. Until it is applied, the
  Supabase-mode payment routes cannot persist a payment; demo mode is unaffected.
- 0007 adds one nullable, check-constrained `profiles.theme` column. Until it is
  applied, the theme works from the browser cookie and reports the account write as
  failed.

To review and apply, in order:

```bash
cd C:\Users\lenovo\OmoNetTab
npx supabase db push --dry-run   # prints what would run; changes nothing
# read supabase/migrations/0006_payments.sql and 0007_profile_theme.sql first,
# then, only once they are approved:
npx supabase db push
```

Or paste each file into the Supabase SQL Editor by hand. `0007` is safe to skip: the
feature degrades honestly without it.

### Verifying this pass locally

```bash
cd C:\Users\lenovo\OmoNetTab
npx tsc --noEmit
npm test          # 147 tests
npm run lint
npm run build
npm run start     # in its own terminal, then in another one:
SMOKE_BASE=http://localhost:3000 node tests/http/money-and-appearance-smoke.mjs
```

`npm test` includes `tests/business-reports.test.ts` (report maths, CSV escaping,
rendered PDF text) and `tests/theme.test.ts` (cookie validation, scheme resolution,
row mapping). The tests that read PDF bytes inflate the content streams and assert on
the text that is actually drawn, so a claim about a document is a claim about its
bytes.

`tests/http/money-and-appearance-smoke.mjs` is the HTTP half: 53 checks that a unit
test cannot make, because they are about what reaches the browser. It walks one
arrangement from inquiry to producer acceptance to a simulated payment, then asserts
that the attempt is priced from the stored inquiry rather than from the request body
(a body carrying `amountCents: 1` is ignored), that a settled attempt cannot be
re-decided, that the receipt arrives as `%PDF` bytes with `no-store`, that the seller
is refused the payer's receipt and pointed at the inquiry record instead, that the
administrator's daily report and CSV export name that payment, that the CSV carries a
UTF-8 BOM and no unguarded formula cell, and that the colour scheme is present in the
first bytes of the page — including that a forged cookie value paints the default and
injects nothing, and that signing in on a second browser receives the saved scheme as
a cookie.

It mutates the demo store, so it needs its own freshly started `next start` process
like the other suites. Run against a server another suite has already used and the
homepage checks can fail for that reason alone: the workflow suite saves site
settings, which overwrites the featured listings the catalogue suite expects.

Last full run of this tree (2026-10-19): `npx tsc --noEmit` clean; `npm test`
**147/147**; `npm run lint` 1 warning and 0 errors (the deliberate `<img>` in
`src/components/listing-images.tsx`); `npm run build` exit 0; and each suite on its
own freshly started server — `workflow-smoke` **20/20**, `buyer-smoke` **93/93**,
`producer-smoke` **113/113**, `admin-smoke` **53/53**, `catalogue-smoke` **235/235**,
`money-and-appearance-smoke` **53/53**.


## Project status and roadmap


The repository contains a navigable marketplace prototype, demo-backed buyer/provider/admin workflows, and an optional Supabase integration that still requires live validation. Sample identities, listings, prices, locations, and activity are illustrative only.

Proposed next steps:

- Validate onboarding, product information, pricing, and inquiry workflows with local entrepreneurs and visitors.
- Agree community-led consent, profile verification, moderation, privacy, and cultural-representation practices before publishing real information.
- Configure and security-test Supabase Auth, migrations, RLS, backups, and operational monitoring.
- Test usability and resilient low-connectivity behavior on target devices and networks.
- Get the existing dictionaries reviewed by competent speakers: Amharic needs its 112 drafted terms checked and the remaining ~1,980 keys written; Simplified Chinese and Italian need a read of the rendered pages; Hamer, Dasenech and Tsamai need a dictionary from their communities before the selector's promise can be kept. Appropriate SMS/USSD options remain to be explored if communities request them.
- Evaluate logistics and digital-payment integrations only with local partners, legal review, and a tested provider.
- Replace sample data and placeholders with verified content only after receiving permission.

## Security, privacy, and responsible cultural representation

- Use server-side role and ownership checks; do not rely on hidden UI controls as authorization.
- Supabase access is intended to use the public key with Row Level Security. The policies have not been tested on a live database.
- Keep secrets out of source control, use `.env.local` for local settings, and never expose service-role credentials in browser code.
- Validate application data and review the privacy and security design before handling real user information.
- The privacy and community-guidelines pages are drafts/placeholders, not legal advice or evidence of community approval.
- Obtain informed permission before publishing identifiable people, photographs, cultural knowledge, rituals, or community-owned descriptions. Respect requests to withdraw or correct content.
- Do not present illustrative profiles, locations, verification labels, prices, reviews, or impact figures as real-world evidence.

## Contributing, license, and contact

Contributions should be made through a focused branch and pull request. Include a clear description, explain user-visible changes, and run the relevant checks (`npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`) before requesting review. Do not include real personal data or credentials in commits, tests, or screenshots.

No `LICENSE` file is present in this repository. All rights and reuse permissions are therefore unspecified here; do not assume the project is open source or add a license without the maintainers' decision.

Repository: <https://github.com/Newaznezif/OmoNetTab>. No public contact address or organizational partnership is asserted by this README.
