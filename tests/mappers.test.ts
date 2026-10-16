import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapContactMethod, mapListing, mapOpportunity, mapProfile } from '../src/lib/supabase/mappers';
import type { ListingWithImagesRow, OpportunityRow, ProfileRow } from '../src/lib/supabase/rows';

const profileRow: ProfileRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'user-1',
  display_name: 'Danesh Woven Goods',
  producer_type: 'artisan',
  community: 'Jinka',
  operating_area: 'South Omo Zone',
  preferred_language: 'en',
  contact_method: { kind: 'in_app' },
  short_bio: 'Woven baskets and textiles.',
  categories: ['cat_handicraft'],
  image_url: null,
  consent_to_publish: true,
  verification: 'pending_review',
  verification_note: null,
  role: 'producer',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z'
};

const listingRow: ListingWithImagesRow = {
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'forest-honey',
  kind: 'product',
  title: 'Forest honey',
  description: 'Collected from forest hives in the highland margin.',
  category_id: 'cat_honey',
  producer_id: profileRow.id,
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
  listing_images: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      listing_id: '22222222-2222-4222-8222-222222222222',
      caption: null,
      src: 'https://example.invalid/honey.jpg',
      alt: 'Jar of forest honey',
      consent_recorded: true,
      is_sample: false
    }
  ]
};

const opportunityRow: OpportunityRow = {
  id: '44444444-4444-4444-8444-444444444444',
  slug: 'honey-bulk',
  title: 'Bulk honey for hotels',
  description: 'Pooling forest honey for a shared delivery.',
  category_id: 'cat_honey',
  unit: 'item',
  organizing_group_id: null,
  coordinator_profile_id: profileRow.id,
  target_quantity: 500,
  indicative_group_price_cents: 6500,
  buyer_offered_price_cents: null,
  currency: 'ETB',
  pickup_plan: 'Pickup from Jinka',
  transport_plan: null,
  order_deadline: null,
  status: 'open',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

test('database rows are never labelled demo data', () => {
  assert.equal(mapProfile(profileRow).isDemo, false);
  assert.equal(mapListing(listingRow).isDemo, false);
  assert.equal(mapOpportunity(opportunityRow, 0).isDemo, false);
});

test('prices arrive as integer cents with no float drift', () => {
  const listing = mapListing(listingRow);
  assert.equal(listing.unitPrice.cents, 6800);
  assert.equal(listing.unitPrice.currency, 'ETB');
  assert.throws(
    () => mapListing({ ...listingRow, unit_price_cents: 6800.5 }),
    /Expected integer cents/
  );
});

test('contact details published without consent are dropped', () => {
  assert.deepEqual(mapContactMethod({ kind: 'phone', value: '0900000000', consent: false }), { kind: 'none' });
  assert.deepEqual(mapContactMethod({ kind: 'email', value: 'a@b.co', consent: true }), {
    kind: 'email',
    value: 'a@b.co',
    consent: true
  });
  assert.deepEqual(mapContactMethod('nonsense'), { kind: 'none' });
  assert.deepEqual(mapContactMethod(null), { kind: 'none' });
});

test('unsupported currency fails loudly instead of mislabeling money', () => {
  assert.throws(() => mapListing({ ...listingRow, currency: 'USD' }), /Unsupported currency/);
});

test('opportunity aggregation comes from contributions, not a stored column', () => {
  assert.equal(mapOpportunity(opportunityRow, 320).aggregateQuantity, 320);
  assert.equal(mapOpportunity(opportunityRow, 320).indicativeGroupPrice?.cents, 6500);
  assert.equal(mapOpportunity(opportunityRow, 320).buyerOfferedPrice, undefined);
});

test('group membership is attached from the join table', () => {
  const groupId = '55555555-5555-4555-8555-555555555555';
  assert.deepEqual(mapProfile(profileRow, [groupId]).groupIds, [groupId]);
});
