import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseRepo } from '../src/lib/supabase/repository';
import { stubSupabase } from './stub-supabase';

const PRODUCER = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';
const LISTING = '22222222-2222-4222-8222-222222222222';
const GROUP = '55555555-5555-4555-8555-555555555555';

const listingRow = {
  id: LISTING,
  slug: 'forest-honey',
  kind: 'product',
  title: 'Forest honey',
  description: 'Collected from forest hives in the highland margin.',
  category_id: 'cat_honey',
  producer_id: PRODUCER,
  community: 'Jinka',
  unit_price_cents: 6800,
  currency: 'ETB',
  unit: 'item',
  available_quantity: 40,
  min_order_quantity: 2,
  availability: 'available',
  pickup_options: ['Pickup at Jinka market'],
  delivery_available: false,
  tourism_meta: null,
  published: true,
  verification: 'unverified',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
  listing_images: []
};

const draftRow = { ...listingRow, id: '66666666-6666-4666-8666-666666666666', slug: 'draft-basket', published: false };

const profileRow = {
  id: PRODUCER,
  user_id: 'user-1',
  display_name: 'Danesh Woven Goods',
  producer_type: 'artisan',
  community: 'Jinka',
  operating_area: 'South Omo Zone',
  preferred_language: 'en',
  contact_method: { kind: 'in_app' },
  short_bio: 'Woven baskets.',
  categories: ['cat_handicraft'],
  image_url: null,
  consent_to_publish: true,
  verification: 'pending_review',
  verification_note: null,
  role: 'producer',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z'
};

const inquiryRow = {
  id: '77777777-7777-4777-8777-777777777777',
  reference: 'OL-2026-ABCD',
  listing_id: LISTING,
  buyer_name: 'Ada',
  buyer_contact: 'ada@example.invalid',
  quantity: 10,
  unit: 'item',
  unit_price_cents: 6800,
  estimated_subtotal_cents: 68000,
  currency: 'ETB',
  preference: 'pickup',
  preferred_date: null,
  message: 'Ten bottles please.',
  status: 'new',
  idempotency_key: 'retry-key-1',
  buyer_profile_id: null,
  created_at: '2026-01-04T00:00:00Z',
  updated_at: '2026-01-04T00:00:00Z'
};

function baseTables(extra: Record<string, Record<string, unknown>[]> = {}) {
  return {
    listings: [listingRow, draftRow],
    profiles: [profileRow],
    group_members: [{ group_id: GROUP, profile_id: PRODUCER }],
    inquiries: [inquiryRow],
    inquiry_events: [],
    ...extra
  };
}

test('public listing reads are filtered to published rows', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  const listings = await repo.listPublicListings();
  assert.equal(listings.length, 1);
  assert.equal(listings[0]!.title, 'Forest honey');
  assert.ok(stub.steps.some((s) => s.table === 'listings' && s.method === 'eq' && s.args[0] === 'published' && s.args[1] === true));
});

test('profiles carry group membership and are never marked demo', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  const profile = await repo.getProfile(PRODUCER);
  assert.equal(profile?.displayName, 'Danesh Woven Goods');
  assert.equal(profile?.isDemo, false);
  assert.deepEqual(profile?.groupIds, [GROUP]);
});

test('a producer cannot edit another producer’s listing', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  await assert.rejects(
    () => repo.updateListing(LISTING, { title: 'Hijacked title' }, OTHER),
    /Not allowed to edit another producer/
  );
  assert.equal(stub.writes.length, 0, 'no write may reach the database');
});

test('the owning producer can update price in integer cents', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  await repo.updateListing(LISTING, { unitPrice: { cents: 7000, currency: 'ETB' } }, PRODUCER);
  const write = stub.writes.find((w) => w.table === 'listings' && w.method === 'update');
  assert.ok(write, 'expected an update on listings');
  assert.equal((write!.payload as Record<string, unknown>).unit_price_cents, 7000);
  assert.equal(write!.payload && 'id' in (write!.payload as object), false, 'the id must not be in the update payload');
});

test('profile ownership is forced to the signed-in user', async () => {
  const stub = stubSupabase(baseTables(), { userId: 'user-1' });
  const repo = createSupabaseRepo(stub.client);
  const profile = await repo.getProfile(PRODUCER);
  assert.ok(profile);
  await repo.upsertProfile({ ...profile!, userId: 'SOMEONE-ELSE' });
  const write = stub.writes.find((w) => w.table === 'profiles');
  assert.equal((write!.payload as Record<string, unknown>).user_id, 'user-1');
});

test('non-positive contribution quantities are rejected before any query', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  await assert.rejects(
    () => repo.contribute({ opportunityId: '44444444-4444-4444-8444-444444444444', producerProfileId: PRODUCER, quantity: 0 }),
    /positive whole number/
  );
  await assert.rejects(
    () => repo.contribute({ opportunityId: '44444444-4444-4444-8444-444444444444', producerProfileId: PRODUCER, quantity: 2.5 }),
    /positive whole number/
  );
  assert.equal(stub.steps.length, 0);
});

test('a retried inquiry with the same idempotency key is not inserted twice', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  const result = await repo.createInquiry({
    listingId: LISTING,
    buyerName: 'Ada',
    buyerContact: 'ada@example.invalid',
    quantity: 10,
    preference: 'pickup',
    message: 'Ten bottles please.',
    idempotencyKey: 'retry-key-1'
  });
  assert.equal(result.reference, 'OL-2026-ABCD');
  assert.equal(stub.writes.length, 0, 'idempotent retry must not write');
});

test('inquiry subtotal is computed server-side in integer cents', async () => {
  const stub = stubSupabase({ ...baseTables(), inquiries: [{ ...inquiryRow, idempotency_key: null }] });
  const repo = createSupabaseRepo(stub.client);
  await repo.createInquiry({
    listingId: LISTING,
    buyerName: 'Ada',
    buyerContact: 'ada@example.invalid',
    quantity: 10,
    preference: 'pickup',
    message: 'Ten bottles please.'
  });
  const insert = stub.writes.find((w) => w.table === 'inquiries' && w.method === 'insert');
  assert.ok(insert, 'expected an inquiry insert');
  const payload = insert!.payload as Record<string, unknown>;
  assert.equal(payload.unit_price_cents, 6800);
  assert.equal(payload.estimated_subtotal_cents, 68000);
  assert.equal(payload.status, 'new');
});

test('quantities below the minimum order are refused', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  await assert.rejects(
    () =>
      repo.createInquiry({
        listingId: LISTING,
        buyerName: 'Ada',
        buyerContact: 'ada@example.invalid',
        quantity: 1,
        preference: 'pickup',
        message: 'Just one bottle for now please.'
      }),
    /at least 2/
  );
});

test('aggregate stats are counted rather than fetched in bulk', async () => {
  const stub = stubSupabase(baseTables());
  const repo = createSupabaseRepo(stub.client);
  const stats = await repo.aggregateStats();
  assert.equal(stats.listings, 1);
  assert.equal(stats.producers, 1);
});
