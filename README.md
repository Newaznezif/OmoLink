# OmoLink

**Connecting South Omo’s local producers to wider markets.**

A community-centred marketplace for **South Omo Zone, Southern Ethiopia**. Producers, guides, and producer groups publish products and services with clear unit pricing; buyers submit inquiries; groups pool quantities to serve bulk buyers; producers see a shared transport cost split. The build runs end-to-end in **demo mode** with no credentials, and can run against **Supabase Postgres + Supabase Auth** when `DATA_MODE=supabase` and the project keys are provided.

---

## Status at a glance

| Area | Status | Notes |
| --- | --- | --- |
| Homepage, marketplace, filters, sorting | ✅ working | Sample data, fully navigable |
| Listing detail + inquiry workflow | ✅ working | Reference number generated, statuses honest |
| Producer profiles + QR share | ✅ working | QR uses locally generated PNG via `qrcode` |
| Seller dashboard, listing CRUD | ✅ working | Cookie-based demo session; ownership enforced server-side |
| Collective-selling workflow | ✅ working | Positive-quantity and stock validation, aggregate recompute |
| Price calculator (markup vs margin) | ✅ working | Integer-cents math throughout |
| Offline PWA + IndexedDB drafts | ✅ working | Service worker caches shell + visited pages; drafts survive refresh |
| Admin verifications + reports | ✅ working | **Simulated** — every action labelled |
| Supabase repository | ✅ implemented, ⚠️ unverified against a live project | `src/lib/supabase/repository.ts` implements the full `Repo` interface over PostgREST; no Supabase project exists yet, so it has never executed against real data |
| Supabase Auth | ✅ implemented, ⚠️ unverified | Password sign-in/sign-up, cookie sessions via `@supabase/ssr`, email-confirmation callback |
| Row Level Security | ⚠️ written, not exercised | 30+ policies in `0002_rls.sql`; unapplied and untested against a running database |
| SMS / USSD gateway | ❌ not implemented | A web app cannot claim SMS without a real gateway |
| Payment processing | ❌ not implemented | Never marked as paid |
| Hamer / Dasenech / Tsamai translations | ❌ not fabricated | Selector shows “not yet available” |

## Tech stack

- **Next.js 14** App Router, **TypeScript** strict, **React 18**
- **Tailwind CSS** custom earth-tone palette
- **qrcode** (local generation)
- **@supabase/supabase-js** + **@supabase/ssr** — only used when `DATA_MODE=supabase`
- **Node** ≥ 18.17. Runs cleanly on Node 24.
- Demo mode needs no external service at all.

## Quick start

```bash
npm install
cp .env.example .env.local   # defaults are fine for demo mode
npm run dev
```

Then open <http://localhost:3000>.

To sign in as a demo producer, use the “Sign in” button and pick any sample producer. To open the admin area, choose the “Sample authorised reviewer” account.

## Environment

`.env.example` documents every variable.

- `DATA_MODE` = `demo` (default) or `supabase`
- `NEXT_PUBLIC_SITE_URL` — used for QR codes and share URLs
- Supabase keys — required only when `DATA_MODE=supabase`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` strict type pass |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | 26 unit tests via the Node test runner and `tsx` |

## Project layout

```
src/
  app/                     App Router pages and API routes
    api/                   Server mutations (listings, inquiries, sessions, admin)
    dashboard/             Producer-only area
    admin/                 Reviewer-only area
    listings/[id]          Public listing detail
    producers/[id]         Public producer profile
    collective-orders/     Group-order browsing + detail
    pricing-tool/          Producer cost/margin calculator
    offline/               Documents the offline UX; lists local drafts
    impact/                Sample-only impact dashboard
    sign-in/, register/, how-it-works/, privacy/, community-guidelines/
  components/              Design system + feature components
  hooks/                   useListingDraft (IndexedDB + localStorage fallback)
  lib/                     types, money, i18n, session, repository, demo data
supabase/
  migrations/0001_init.sql
  migrations/0002_rls.sql
  seed.sql
public/
  sw.js                    Service worker
  manifest.webmanifest     PWA manifest
  icon.svg                 Application icon
```

## Data mode and safety

In **demo mode** (`DATA_MODE=demo`, the default) the app uses an in-memory store seeded by `src/lib/demo-data.ts`. Every record is flagged with `isDemo: true` and rendered with a visible “Sample data” badge, and a banner states demo mode is active. Mutations from the UI (create listing, submit inquiry, contribute, verify) live in that store only. They are lost on a server cold restart — this is a documented limitation, not a bug.

In **Supabase mode** (`DATA_MODE=supabase`) the same `Repo` interface is served by `src/lib/supabase/repository.ts` against Postgres, sessions come from Supabase Auth, and every row is mapped with `isDemo: false`, so the sample-data badge disappears. There is no silent mixing:

- Missing or half-set credentials throw at startup with the exact variable names to fix.
- Only the **anon key** is ever used, so PostgREST evaluates every request under Row Level Security. `SUPABASE_SERVICE_ROLE_KEY` is deliberately not read anywhere in this codebase.
- Profile ownership is taken from the authenticated user, never from the request body.

**The Supabase path has never been executed against a real project.** Migrations are unapplied and the RLS policies are unexercised, so treat the schema as reviewed-but-unverified until `supabase db push` and the access tests below have actually run.

**Never** commit `.env.local` or real keys. The `.gitignore` excludes them.

## Feature checklist (from the brief)

- [x] Responsive homepage with hero, search, featured listings, producer highlights, how-it-works, collective explainer, trust section, CTA, footer
- [x] Marketplace browse with filters (category, community, availability, price range), sorting (newest, price asc/desc, updated), search, empty state
- [x] Product & service detail pages with pricing, minimum order, availability, pickup options, related listings, tourism metadata (when kind = service), consent-aware placeholder imagery
- [x] Producer onboarding with display name, type, community, language, contact, bio, categories, image, consent
- [x] Verification labels: unverified / pending review / verified, with the caveat that the workflow itself is pending pilot design
- [x] Seller dashboard: list/create/edit own listings, publish / unpublish, change availability, view inquiries, update status, collective contributions, activity summary
- [x] Buyer inquiry workflow with reference number, idempotency key, estimated subtotal, delivery preference, offline queue
- [x] Collective-selling: aggregate contributions, target vs remaining, per-producer stock validation, duplicate merge, transport calculator, honest pending/confirmed labels
- [x] Transparent price calculator distinguishing markup on cost from profit margin, integer-cents math, override always available
- [x] Offline: PWA manifest, service worker, IndexedDB drafts with statuses Saved locally / Pending / Synced / Failed, manual retry, offline inquiry queue, network-failure handling
- [x] Language selector with clear “not yet available” status for Hamer, Dasenech, Tsamai; English is complete; Amharic is marked as review-pending (no fake translations)
- [x] Trust, traceability, QR sharing to real public URLs with locally generated QR codes
- [x] Logistics text-first pickup plan, transport cost estimate labelled “not a confirmed quote”
- [x] Admin verification queue + reports queue, every action labelled “Simulated”
- [x] Security: server-side role checks on every protected mutation, ownership checks for listing edits, admin role gate for verification actions, RLS policies for the shipped Postgres schema, no client-side secret exposure
- [x] Impact dashboard design with a clear “no fabricated metrics” rule
- [x] README, .env.example, migrations, seed, testing report, known limitations, future plan, live-demo script

## Testing report

Automated: `npm test` → **26 passing, 0 failing** (money parsing, markup vs margin, row→domain mapping, consent handling, config fail-closed rules, and Supabase repository behaviour against a stubbed client). `npm run typecheck`, `npm run lint`, and `npm run build` all pass.

Manual run against a fresh `npm run dev` in demo mode:

| Test | Result | Notes |
| --- | --- | --- |
| TEST 1 — Discovery | **PASS** | Home search → filter → open listing → inspect price and producer |
| TEST 2 — Inquiry | **PASS** | Valid quantity → subtotal → submit → reference returned |
| TEST 3 — Seller management | **PASS** | Create, publish, edit price, update quantity, listing re-shown |
| TEST 4 — Authorization | **PASS** | Cross-producer edit returns 403; `/admin` redirects to sign-in when role ≠ admin |
| TEST 5 — Collective selling | **PASS** | Contribute → aggregate updates → target math correct |
| TEST 6 — Price calculation | **PASS** | 800 ETB cost + 25% markup → 1,000 ETB price, 200 profit, 20.00% margin |
| TEST 7 — Offline draft | **PASS** | Save draft, disable network, reload page, draft is restored |
| TEST 8 — Transparent status | **PASS** | Sample tag on every demo record; verification labels explicit |
| TEST 9 — Responsive | **PASS** | Verified at 360 px, 768 px, 1440 px widths |
| TEST 10 — Production build | **PASS** | `next build` succeeds; `tsc --noEmit` clean |
| TEST 11 — Database security | **BLOCKED** | Supabase repository, Auth and RLS policies are implemented, but no Supabase project exists and this machine has no Postgres or Docker, so migrations are unapplied and no policy has been exercised. Blocked on project credentials — see “Supabase rollout”. |
| TEST 12 — Error handling | **PASS** | Invalid form input shows inline errors; network failure queues draft instead of crashing |

TEST 11 acceptance once a project is available:

```
supabase db push                                   # applies 0001_init.sql + 0002_rls.sql
psql "$DATABASE_URL" -f supabase/seed.sql          # categories only, never demo producers
# then, as two different authenticated users:
#   producer A updates producer B's listing  -> must be rejected by RLS
#   anonymous select of an unpublished listing -> must return 0 rows
#   buyer reads only their own inquiries       -> enforced by policy
```

## Known limitations

1. **Supabase mode is unverified** — the code path is written and unit-tested against a stub, but it has never touched a real database. Demo-mode authentication remains a cookie; Supabase Auth only takes effect once a project is configured.
2. **No SMS / USSD / payments** — these are explicitly out of scope until a real gateway is integrated and tested. We refuse to display a button that pretends to send SMS.
3. **No local-language translations** — Hamer, Dasenech and Tsamai translations require review by competent speakers. The selector honestly reports “not available” instead of showing invented text.
4. **Demo store is in-memory** — server cold-restart clears user-created listings, inquiries, contributions, verification decisions, reports. Real Supabase persistence is the intended path.
5. **Images are abstract SVG placeholders** — no real photographs are used. This avoids the failure mode of presenting generic stock imagery as documentary evidence of a South Omo producer.
6. **RLS not exercised** — the policies are written and enabled in `0002_rls.sql`, but no database has run them yet. Until then, the RLS layer is unproven and demo mode remains the only verified experience.
7. **No map provider** — pickup and meeting points are text-only. Free map tile integration is a roadmap item, not a dependency in this build.
8. **Rate limiting** — recommended for real deployment; not enforced in demo.

## Deployment

The app deploys on Vercel’s free tier with no additional configuration:

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project → import the repo**.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed URL. Leave `DATA_MODE=demo` for the hackathon demo, or provision a free Supabase project and add the keys.
4. Deploy. Verify the URL — do not claim a successful deployment without loading the site.

### Supabase rollout

Provisioning a project needs a human Supabase login, which this machine does not have. The exact remaining steps, from an authenticated terminal:

```
npm install -D supabase                # or install the standalone CLI
npx supabase login                     # browser/device authorisation
npx supabase projects create omolink   # free tier; reuse an existing project instead if you have one
npx supabase link --project-ref <ref>
npx supabase db push                   # applies supabase/migrations/*.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

Then create `.env.local`:

```
DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_SITE_URL=https://your-deployed-url
```

Restart the server. The demo banner disappears because no row loaded from Postgres carries `isDemo: true`. Seed data intentionally contains categories only — demo producers, listings and inquiries are never inserted into a real database, so nobody mistakes sample accounts for verified community members.

Review the migrations and RLS policies before applying them to any shared database. Until `supabase db push` and the TEST 11 access checks above have actually run, do not describe the database as secured.

## Live-demo script (5 minutes)

1. Open `http://localhost:3000`. **Point at the “Demo mode” banner and the “Sample data” tag on the hero.**
2. Search “honey” → filter by category → open the honey listing → show explicit price and min-order.
3. Set quantity to 12 jars, submit inquiry, show the reference number.
4. Go to Sign in → choose “Sample honey producers group” → Dashboard → Inquiries shows the inquiry the buyer just made.
5. Change status to **Accepted** → the event log appends a status change.
6. Go to Collective orders → open the honey bulk order → sign in as a producer → contribute 30 kg → aggregate updates live.
7. Scroll to the shared transport calculator → set total cost 450 ETB, quantity 200 kg → show estimated per-unit split, and remind the audience that no real quote is confirmed.
8. Open the pricing tool → type total cost 800, markup 25 → show the “suggested price 1,000, margin 20%” output.
9. Open a producer profile → show the QR code, explain it points to a real URL and never to a fabricated certificate.
10. Turn off network (DevTools → offline) → go to `/dashboard/listings/new`, fill a title, hit “Save draft on device” → reload page → draft comes back. Toggle status badge from Saved locally → Sync failed → online → Synced.
11. Sign in as “Sample authorised reviewer” → open `/admin` → try to approve a pending profile → highlight the “Simulated” language.
12. Close by summarising the honest boundaries: no fabricated payments, no fake SMS, no invented local-language text, no fabricated impact metrics.

## Future integration plan

- **Supabase Storage**: listings still take a data-URL or external `src`. Uploads should go through a consent-checked Storage bucket with the producer's own path prefix.
- **Verified reviewer workflow**: define an onboarding path with the community partners and record the procedure in the DB.
- **Consent-aware imagery pipeline**: signed upload + community review, replacing SVG placeholders.
- **SMS/USSD fallback** for producers without always-on connectivity — only after a gateway, contract and testing plan are in place.
- **Amharic, Hamer, Dasenech, Tsamai translations** reviewed by competent speakers, then loaded through `src/lib/i18n.ts`.
- **Rate limiting + abuse protection** at the edge before going to production.

## Final list of files created or changed

This build introduces the full project from scratch:

- Project config: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.gitignore`, `.env.example`, `next-env.d.ts`
- Public assets: `public/sw.js`, `public/manifest.webmanifest`, `public/icon.svg`
- Data + logic (`src/lib/`): `types.ts`, `money.ts`, `ids.ts`, `i18n.ts`, `pricing.ts`, `demo-data.ts`, `store.ts`, `repo.ts`, `session.ts`, `validate.ts`
- Supabase (`src/lib/supabase/`): `config.ts`, `server.ts`, `rows.ts`, `mappers.ts`, `repository.ts`
- Hooks (`src/hooks/`): `use-listing-draft.ts` (IndexedDB + localStorage fallback)
- Components (`src/components/`): `ui.tsx`, `site-header.tsx`, `site-footer.tsx`, `offline-status.tsx`, `language-selector.tsx`, `service-worker-registrar.tsx`, `listing-card.tsx`, `producer-card.tsx`, `collective-card.tsx`, `marketplace.tsx`, `inquiry-form.tsx`, `qr-code.tsx`, `report-listing.tsx`, `contribute-form.tsx`, `transport-calculator.tsx`, `price-calculator.tsx`, `draft-browser.tsx`, `listing-form.tsx`, `listing-actions.tsx`, `register-form.tsx`, `demo-signin-form.tsx`, `credentials-form.tsx`, `inquiry-status-picker.tsx`, `verification-action.tsx`, `save-profile-button.tsx`
- Pages (`src/app/`): `layout.tsx`, `globals.css`, `page.tsx`, `explore`, `products`, `tourism`, `listings/[id]`, `producers/[id]`, `collective-orders`, `collective-orders/[id]`, `how-it-works`, `pricing-tool`, `offline`, `impact`, `sign-in`, `register`, `privacy`, `community-guidelines`, `dashboard/{layout,page,listings,listings/new,listings/[id],inquiries,collective-orders,profile}`, `admin/{layout,page,verifications,reports}`
- API routes (`src/app/api/`): `inquiries`, `inquiries/[id]`, `listings`, `listings/[id]`, `collective/[id]/contribute`, `reports`, `session`, `session/signout`, `profile`, `admin/verifications`, `auth/signin`
- Auth pages: `src/app/auth/callback/route.ts` (email-confirmation / PKCE code exchange)
- Database: `supabase/migrations/0001_init.sql`, `supabase/migrations/0002_rls.sql`, `supabase/seed.sql`
- Tests (`tests/`): `pricing.test.ts`, `mappers.test.ts`, `config.test.ts`, `supabase-repo.test.ts`, `stub-supabase.ts`
- Docs: this `README.md`, `.env.example`
