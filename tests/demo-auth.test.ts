import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoRepo } from '../src/lib/demo-repo';
import { resetDemoStore } from '../src/lib/store';
import type { DB } from '../src/lib/demo-data';
import type { Actor } from '../src/lib/session';
import type { CollectiveOpportunity } from '../src/lib/types';

/**
 * These tests run against the demo repository, which in demo mode is the only
 * enforcement point (no Row Level Security sits behind it). The same rules are
 * expressed as database policies for Supabase mode in
 * supabase/migrations/0002_rls.sql and 0003_admin_accounts_reviews.sql, which
 * cannot be executed here because no live project credentials exist.
 */

const ADMIN = 'prof_admin';
const BASKET = 'prof_artisan_basket';
const HONEY = 'prof_honey_group';
const DAIRY = 'prof_dairy_farmer';
const TOURIST = 'prof_tourist_visitor';
const HOTEL = 'prof_hotel_buyer';

type Fixture = { store: DB; actor: (profileId: string) => Actor };

/** Fresh sample data plus actors built from it, so each test is independent. */
function seed(): Fixture {
  const store = resetDemoStore();
  const actor = (profileId: string): Actor => {
    const profile = store.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error(`Sample profile ${profileId} is missing.`);
    return {
      userId: profile.userId,
      profileId: profile.id,
      role: profile.role,
      accountKind: profile.accountKind,
      status: profile.status
    };
  };
  return { store, actor };
}

async function rejects(fn: () => Promise<unknown>, pattern: RegExp): Promise<string> {
  try {
    await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    assert.match(message, pattern);
    return message;
  }
  assert.fail(`Expected a rejection matching ${pattern}, but the call succeeded.`);
}

test('self-registration cannot create an administrator or a coordinator', async () => {
  const { store, actor } = seed();
  const template = store.profiles.find((p) => p.id === BASKET)!;

  await rejects(
    () => demoRepo.upsertProfile({ ...template, id: 'prof_sneaky', userId: 'demo_user_sneaky', role: 'admin' }),
    /assigned by an existing administrator/
  );
  await rejects(
    () => demoRepo.upsertProfile({ ...template, id: 'prof_sneaky2', userId: 'demo_user_sneaky2', role: 'coordinator' }),
    /assigned by an existing administrator/
  );
  assert.equal(store.profiles.some((p) => p.id === 'prof_sneaky'), false);

  // An existing account that submits itself as an administrator keeps its role,
  // because the privileged columns are copied from the stored row.
  await demoRepo.upsertProfile({ ...template, role: 'admin', status: 'active', verification: 'verified' });
  const stored = store.profiles.find((p) => p.id === BASKET)!;
  assert.equal(stored.role, 'producer');
  assert.equal(stored.verification, 'unverified');
  assert.equal(stored.status, 'active');
  assert.equal(actor(BASKET).role, 'producer');
});

test('only an administrator can change roles, and never their own', async () => {
  const { store, actor } = seed();

  await rejects(() => demoRepo.setProfileRole(HONEY, 'admin', actor(BASKET)), /Only an administrator/);
  await rejects(() => demoRepo.setProfileRole(HONEY, 'admin', actor(TOURIST)), /Only an administrator/);

  await rejects(() => demoRepo.setProfileRole(ADMIN, 'producer', actor(ADMIN)), /your own administrator access/);
  assert.equal(store.profiles.find((p) => p.id === ADMIN)!.role, 'admin');

  const promoted = await demoRepo.setProfileRole(BASKET, 'coordinator', actor(ADMIN));
  assert.equal(promoted.role, 'coordinator');
  const audit = await demoRepo.listAuditLogs(5);
  assert.equal(audit[0]!.action, 'role_changed');
});

test('the platform is never left without an active administrator', async () => {
  const { store, actor } = seed();
  assert.equal(store.profiles.filter((p) => p.role === 'admin' && p.status === 'active').length, 1);

  // A caller asserting administrator rights still cannot demote the only
  // working administrator.
  const assertingAdmin: Actor = {
    userId: 'demo_user_ghost',
    profileId: 'prof_ghost',
    role: 'admin',
    accountKind: 'platform_admin',
    status: 'active'
  };
  await rejects(() => demoRepo.setProfileStatus(ADMIN, 'suspended', assertingAdmin), /last active administrator/);
  await rejects(() => demoRepo.setProfileRole(ADMIN, 'buyer', assertingAdmin), /last active administrator/);
  assert.equal(store.profiles.find((p) => p.id === ADMIN)!.status, 'active');

  // With a second administrator in place, either one can be suspended.
  await demoRepo.setProfileRole(DAIRY, 'admin', actor(ADMIN));
  const second = actor(DAIRY);
  await demoRepo.setProfileStatus(ADMIN, 'suspended', second);
  assert.equal(store.profiles.find((p) => p.id === ADMIN)!.status, 'suspended');
  await rejects(() => demoRepo.setProfileStatus(DAIRY, 'suspended', second), /your own account/);
});

test('a suspended account keeps no privileged function even with a valid session', async () => {
  const { store, actor } = seed();
  store.profiles.find((p) => p.id === BASKET)!.status = 'suspended';
  const suspended = actor(BASKET);
  assert.equal(suspended.status, 'suspended');

  await rejects(() => demoRepo.updateListing('lst_basket_set', { title: 'Rewritten' }, BASKET), /suspended/);
  await rejects(() => demoRepo.setListingPublished('lst_basket_set', false, suspended), /suspended/);
  await rejects(() => demoRepo.contribute({ opportunityId: 'col_basket_retail', producerProfileId: BASKET, quantity: 1 }), /suspended/);
  await rejects(() => demoRepo.saveSiteSettings({ siteName: 'Renamed' }, suspended), /suspended/);
  assert.equal(store.listings.find((l) => l.id === 'lst_basket_set')!.title.includes('Rewritten'), false);

  // Read access to their own records is not removed by suspension.
  assert.equal((await demoRepo.listListingsByProducer(BASKET)).length > 0, true);
});

test('a producer cannot change another producer’s listing', async () => {
  const { store, actor } = seed();
  const honey = actor(HONEY);

  await rejects(() => demoRepo.updateListing('lst_basket_set', { title: 'Taken over' }, honey.profileId), /another producer/);
  await rejects(() => demoRepo.setListingPublished('lst_basket_set', false, honey), /another producer/);
  await rejects(() => demoRepo.archiveListing('lst_basket_set', honey), /another producer/);
  await rejects(() => demoRepo.deleteListing('lst_basket_set', honey), /another producer/);

  const untouched = store.listings.find((l) => l.id === 'lst_basket_set')!;
  assert.equal(untouched.published, true);
  assert.equal(untouched.archived, undefined);

  // The owner may, and an administrator may moderate.
  await demoRepo.setListingPublished('lst_basket_set', false, actor(BASKET));
  assert.equal(store.listings.find((l) => l.id === 'lst_basket_set')!.published, false);
  await demoRepo.setListingPublished('lst_basket_set', true, actor(ADMIN));
  assert.equal(store.listings.find((l) => l.id === 'lst_basket_set')!.published, true);
});

test('a buyer sees only their own inquiries', async () => {
  const { actor } = seed();
  const mine = await demoRepo.createInquiry({
    listingId: 'lst_basket_set',
    buyerName: 'Jinka Hotel',
    buyerContact: 'purchasing@example.invalid',
    quantity: 2,
    preference: 'pickup',
    message: 'For the lobby shop.',
    buyerProfileId: HOTEL
  });
  await demoRepo.createInquiry({
    listingId: 'lst_basket_set',
    buyerName: 'Visiting guest',
    buyerContact: 'guest@example.invalid',
    quantity: 1,
    preference: 'unsure',
    message: 'Can I collect one basket?',
    buyerProfileId: TOURIST
  });

  const hotelList = await demoRepo.listInquiriesForBuyer(HOTEL);
  assert.equal(hotelList.length, 1);
  assert.equal(hotelList[0]!.id, mine.id);
  assert.equal(hotelList[0]!.buyerProfileId, HOTEL);

  // Nobody's own record is exposed through another buyer's id.
  assert.equal((await demoRepo.listInquiriesForBuyer(DAIRY)).length, 0);

  // The seller side is scoped to listings the seller owns.
  const sellerList = await demoRepo.listInquiriesForSeller(BASKET);
  assert.equal(sellerList.length, 2);
  assert.equal((await demoRepo.listInquiriesForSeller(DAIRY)).length, 0);
});

test('collective contributions cannot oversell the contributing producer', async () => {
  const { store, actor } = seed();
  // col_basket_retail: the sample producer already commits 10 of 24 available bundles.
  await rejects(
    () => demoRepo.contribute({ opportunityId: 'col_basket_retail', producerProfileId: BASKET, quantity: 20 }),
    /Only 14 units left/
  );
  const extra = await demoRepo.contribute({
    opportunityId: 'col_basket_retail',
    producerProfileId: BASKET,
    quantity: 5,
    note: 'Additional from this month.'
  });
  // A second contribution adds to the producer's existing line rather than
  // creating a parallel one, so the commitment stays auditable.
  assert.equal(extra.id, 'con_sample_basket_1');
  assert.equal(extra.quantity, 15);
  assert.equal((await demoRepo.getOpportunity('col_basket_retail'))!.aggregateQuantity, 15);

  // Editing a contribution is bounded by the same stock check.
  await rejects(() => demoRepo.updateContribution(extra.id, 999, actor(BASKET)), /available stock of 24/);
  await demoRepo.updateContribution(extra.id, 8, actor(BASKET));
  assert.equal((await demoRepo.getOpportunity('col_basket_retail'))!.aggregateQuantity, 8);

  // Withdrawing releases the quantity again.
  await demoRepo.withdrawContribution(extra.id, actor(BASKET));
  assert.equal((await demoRepo.getOpportunity('col_basket_retail'))!.aggregateQuantity, 0);

  // A group member with no stock in the opportunity category cannot join in.
  await rejects(
    () => demoRepo.contribute({ opportunityId: 'col_honey_bulk', producerProfileId: DAIRY, quantity: 5 }),
    /No stock in a matching category/
  );
  // And a non-member is refused before any stock is read.
  await rejects(
    () => demoRepo.contribute({ opportunityId: 'col_honey_bulk', producerProfileId: TOURIST, quantity: 5 }),
    /Only members of the organizing group/
  );
  assert.equal(store.contributions.some((c) => c.producerProfileId === TOURIST), false);
});

test('a contribution is confirmed by the coordinating account, not by the contributor', async () => {
  const { store, actor } = seed();
  // A contribution from another member of the retail basket order. The
  // coordinating account for that order is prof_artisan_basket.
  store.contributions.push({
    id: 'con_test_dairy',
    opportunityId: 'col_basket_retail',
    producerProfileId: DAIRY,
    quantity: 2,
    status: 'pending',
    createdAt: new Date().toISOString(),
    isDemo: true
  });

  // The producer who committed the quantity cannot confirm their own line.
  await rejects(() => demoRepo.confirmContribution('con_test_dairy', actor(DAIRY)), /coordinating account/);
  assert.equal(store.contributions.find((c) => c.id === 'con_test_dairy')!.status, 'pending');

  await demoRepo.confirmContribution('con_test_dairy', actor(BASKET));
  assert.equal(store.contributions.find((c) => c.id === 'con_test_dairy')!.status, 'confirmed');

  // An administrator may confirm on a coordinator's behalf.
  await demoRepo.confirmContribution('con_sample_basket_1', actor(ADMIN));
  assert.equal(store.contributions.find((c) => c.id === 'con_sample_basket_1')!.status, 'confirmed');

  // A contribution cannot be edited past the producer's own stock by the
  // coordinator either.
  await rejects(() => demoRepo.updateContribution('con_sample_basket_1', 500, actor(BASKET)), /available stock of 24/);
});

test('verification: an account cannot approve itself and only administrators decide', async () => {
  const { store, actor } = seed();

  await rejects(
    () =>
      demoRepo.recordVerificationReview({
        profileId: HONEY,
        reviewerProfileId: HONEY,
        decision: 'approved',
        reason: 'Looks fine to me.'
      }),
    /Only an administrator/
  );
  await rejects(
    () =>
      demoRepo.recordVerificationReview({
        profileId: ADMIN,
        reviewerProfileId: ADMIN,
        decision: 'approved',
        reason: 'Self approval.'
      }),
    /cannot decide their own/
  );
  await rejects(
    () =>
      demoRepo.recordVerificationReview({
        profileId: HONEY,
        reviewerProfileId: ADMIN,
        decision: 'rejected',
        reason: '   '
      }),
    /needs a reason/
  );
  assert.equal(store.profiles.find((p) => p.id === HONEY)!.verification, 'pending_review');

  await demoRepo.recordVerificationReview({
    profileId: HONEY,
    reviewerProfileId: ADMIN,
    decision: 'approved',
    reason: 'Group registration document reviewed.'
  });
  assert.equal(store.profiles.find((p) => p.id === HONEY)!.verification, 'verified');
  const audit = await demoRepo.listAuditLogs(3);
  assert.equal(audit[0]!.action, 'verification_decision');
});

test('a review is only possible for the buyer of a completed arrangement', async () => {
  const { actor } = seed();
  const inquiry = await demoRepo.createInquiry({
    listingId: 'lst_basket_set',
    buyerName: 'Jinka Hotel',
    buyerContact: 'purchasing@example.invalid',
    quantity: 2,
    preference: 'pickup',
    message: 'Two basket sets for the shop.',
    buyerProfileId: HOTEL
  });

  const review = (profileId: string, comment: string) => ({
    listingId: 'lst_basket_set',
    inquiryId: inquiry.id,
    rating: 5 as const,
    comment,
    authorName: 'Jinka Hotel',
    actor: actor(profileId)
  });

  await rejects(() => demoRepo.createReview(review(HOTEL, 'Good quality.')), /recorded as completed/);

  await demoRepo.updateInquiryStatus(inquiry.id, 'completed', 'seller', 'Collected at the market.');
  const published = await demoRepo.createReview(review(HOTEL, 'Stitching was as described.'));
  assert.equal(published.status, 'published');

  await rejects(() => demoRepo.createReview(review(HOTEL, 'Again.')), /already reviewed/);
  await rejects(() => demoRepo.createReview(review(TOURIST, 'Not my order.')), /your own completed inquiry/);
  await rejects(() => demoRepo.createReview({ ...review(HOTEL, 'x'), inquiryId: 'inq_missing' }), /arrangement you recorded/);

  // The rating range is checked on a fresh, owned inquiry.
  const second = await demoRepo.createInquiry({
    listingId: 'lst_forest_honey',
    buyerName: 'Visiting guest',
    buyerContact: 'guest@example.invalid',
    quantity: 6,
    preference: 'pickup',
    message: 'Six jars for the guesthouse.',
    buyerProfileId: TOURIST
  });
  await demoRepo.updateInquiryStatus(second.id, 'completed', 'seller', 'Collected.');
  await rejects(
    () => demoRepo.createReview({ ...review(TOURIST, 'Six star!'), listingId: 'lst_forest_honey', inquiryId: second.id, rating: 6 as never }),
    /1 to 5/
  );
  const secondReview = await demoRepo.createReview({
    ...review(TOURIST, 'The honey was as described.'),
    listingId: 'lst_forest_honey',
    inquiryId: second.id
  });
  assert.equal(secondReview.producerProfileId, HONEY);

  // Hiding is an administrator action and removes it from public listing views.
  await rejects(() => demoRepo.setReviewStatus(published.id, 'hidden', 'Nope', actor(BASKET)), /administrator/);
  assert.equal((await demoRepo.listReviews({ listingId: 'lst_basket_set' })).length, 1);
  await demoRepo.setReviewStatus(published.id, 'hidden', 'Contains contact details.', actor(ADMIN));
  assert.equal((await demoRepo.listReviews({ listingId: 'lst_basket_set' })).length, 0);
  assert.equal((await demoRepo.listReviews({ listingId: 'lst_basket_set', includeHidden: true })).length, 1);
});

test('a category in use cannot be deleted; deactivation hides it from shoppers', async () => {
  const { store, actor } = seed();

  await rejects(() => demoRepo.deleteCategory('cat_honey', actor(ADMIN)), /Deactivate it instead/);
  await rejects(() => demoRepo.saveCategory({ id: 'cat_honey', name: 'Honey', slug: 'honey', kind: 'product', description: '' }, actor(BASKET)), /administrator/);
  await rejects(() => demoRepo.saveCategory({ id: 'cat_honey', name: '   ', slug: 'honey', kind: 'product', description: '' }, actor(ADMIN)), /needs a name/);
  await rejects(() => demoRepo.deleteCategory('cat_honey', actor(BASKET)), /administrator/);

  await demoRepo.saveCategory(
    { id: 'cat_honey', name: 'Honey and bee products', slug: 'honey', kind: 'product', description: 'Sample description.', active: false },
    actor(ADMIN)
  );
  assert.equal((await demoRepo.listCategories()).some((c) => c.id === 'cat_honey'), false);
  assert.equal((await demoRepo.listAllCategories()).some((c) => c.id === 'cat_honey'), true);
  // The listings that already use it are untouched.
  assert.equal(store.listings.filter((l) => l.categoryId === 'cat_honey').length, 1);

  // An unused category can be removed.
  const created = await demoRepo.saveCategory(
    { id: '', name: 'Sample spare', slug: '', kind: 'both', description: 'Nothing uses this yet.' },
    actor(ADMIN)
  );
  await demoRepo.deleteCategory(created.id, actor(ADMIN));
  assert.equal(store.categories.some((c) => c.id === created.id), false);
});

test('site settings are administrator-only and validated before they are stored', async () => {
  const { actor } = seed();

  await rejects(() => demoRepo.saveSiteSettings({ siteName: 'Renamed by producer' }, actor(BASKET)), /administrator/);
  await rejects(() => demoRepo.saveSiteSettings({ accentColor: 'rebeccapurple' }, actor(ADMIN)), /hex colour/);
  await rejects(() => demoRepo.saveSiteSettings({ siteName: 'O'.repeat(61) }, actor(ADMIN)), /60 characters/);
  await rejects(() => demoRepo.saveSiteSettings({ contactEmail: 'not-an-email' }, actor(ADMIN)), /email address/);
  await rejects(() => demoRepo.saveSiteSettings({ homepageSections: [{ id: 'secret_panel' as never, visible: true }] }, actor(ADMIN)), /Unknown homepage section/);

  const saved = await demoRepo.saveSiteSettings(
    { siteName: 'OmoLink Pilot', accentColor: '#7a3b12', footerNote: 'Pilot instance for the South Omo cooperative.' },
    actor(ADMIN)
  );
  assert.equal(saved.siteName, 'OmoLink Pilot');
  assert.equal(saved.accentColor, '#7a3b12');
  assert.equal(saved.updatedByProfileId, ADMIN);
  assert.equal((await demoRepo.getSiteSettings()).siteName, 'OmoLink Pilot');
});

test('audit entries carry safe summaries and never a credential', async () => {
  const { actor } = seed();
  await demoRepo.setProfileRole(BASKET, 'coordinator', actor(ADMIN));
  await demoRepo.saveSiteSettings({ siteName: 'OmoLink Pilot' }, actor(ADMIN));
  await demoRepo.recordVerificationReview({
    profileId: HONEY,
    reviewerProfileId: ADMIN,
    decision: 'approved',
    reason: 'Documents reviewed.'
  });

  const entries = await demoRepo.listAuditLogs(50);
  assert.equal(entries.length >= 3, true);
  assert.deepEqual(
    entries.slice(0, 3).map((e) => e.action).sort(),
    ['role_changed', 'site_settings_changed', 'verification_decision']
  );
  const dump = JSON.stringify(entries);
  assert.doesNotMatch(dump, /password|passwd|api[_-]?key|service[_-]?role|anon[_-]?key|bearer|secret/i);
  for (const entry of entries) {
    assert.equal(typeof entry.summary, 'string');
    assert.equal(entry.summary.length < 400, true);
  }
});

test('amounts and quantities come from the listing, not from the browser', async () => {
  seed();
  await rejects(
    () =>
      demoRepo.createInquiry({
        listingId: 'lst_forest_honey',
        buyerName: 'Hotel',
        buyerContact: 'h@example.invalid',
        quantity: 1,
        preference: 'delivery',
        message: 'One jar please.'
      }),
    /at least 6/
  );
  const inquiry = await demoRepo.createInquiry({
    listingId: 'lst_forest_honey',
    buyerName: 'Hotel',
    buyerContact: 'h@example.invalid',
    quantity: 7,
    preference: 'delivery',
    message: 'Seven jars.'
  });
  assert.equal(inquiry.estimatedSubtotalCents, 6800 * 7);
  assert.equal(inquiry.unitOfSale, 'item');
  assert.equal(inquiry.status, 'new');

  await rejects(
    () =>
      demoRepo.createInquiry({
        listingId: 'lst_forest_honey',
        buyerName: 'Hotel',
        buyerContact: 'h@example.invalid',
        quantity: 5_000,
        preference: 'delivery',
        message: 'A very large order.'
      }),
    /Only 140 item available/
  );

  // A retried submission with the same key is not stored twice.
  const first = await demoRepo.createInquiry({
    listingId: 'lst_basket_set',
    buyerName: 'Shop',
    buyerContact: 's@example.invalid',
    quantity: 1,
    preference: 'pickup',
    message: 'One set.',
    idempotencyKey: 'retry-1'
  });
  const again = await demoRepo.createInquiry({
    listingId: 'lst_basket_set',
    buyerName: 'Shop',
    buyerContact: 's@example.invalid',
    quantity: 1,
    preference: 'pickup',
    message: 'One set.',
    idempotencyKey: 'retry-1'
  });
  assert.equal(again.id, first.id);

  // A closed arrangement cannot be silently reopened.
  await demoRepo.updateInquiryStatus(first.id, 'completed', 'seller', 'Handed over.');
  await rejects(() => demoRepo.updateInquiryStatus(first.id, 'new', 'seller', 'Restart.'), /closed inquiry/);
});

test('an archived listing leaves public browse but stays in the administrator view and history', async () => {
  const { store, actor } = seed();
  const inquiry = await demoRepo.createInquiry({
    listingId: 'lst_basket_set',
    buyerName: 'Shop',
    buyerContact: 's@example.invalid',
    quantity: 1,
    preference: 'pickup',
    message: 'One set for the shop.'
  });

  await rejects(() => demoRepo.deleteListing(inquiry.listingId, actor(BASKET)), /archive it instead/);

  await demoRepo.archiveListing(inquiry.listingId, actor(BASKET));
  assert.equal((await demoRepo.listPublicListings()).some((l) => l.id === inquiry.listingId), false);
  assert.equal((await demoRepo.listAllListings()).some((l) => l.id === inquiry.listingId), true);
  assert.equal(store.inquiries.some((i) => i.id === inquiry.id), true);

  const stats = await demoRepo.adminStats();
  assert.equal(stats.archivedListings, 1);
  assert.equal(stats.newInquiries, 1);
  assert.equal(stats.byRole.admin, 1);
  assert.equal(stats.byRole.producer, 4);
  assert.equal(stats.byRole.coordinator, 1);
  assert.equal(stats.byRole.buyer, 2);
});

test('collective opportunities are edited by their coordinating account or an administrator', async () => {
  const { store, actor } = seed();
  const base = store.opportunities.find((o) => o.id === 'col_honey_bulk')!;
  // The repository accepts the editable fields only; timestamps and the
  // aggregate are derived, never supplied.
  const draft = (over: Partial<CollectiveOpportunity>) => {
    const { aggregateQuantity, createdAt, updatedAt, isDemo, ...input } = base;
    return { ...input, ...over };
  };

  // A plain producer account has no opportunity editor at all.
  await rejects(() => demoRepo.saveOpportunity(draft({ title: 'Hijacked opportunity title' }), actor(BASKET)), /group coordinator or administrator/);

  // A coordinator of a different group cannot rewrite this one.
  await demoRepo.setProfileRole(DAIRY, 'coordinator', actor(ADMIN));
  await rejects(() => demoRepo.saveOpportunity(draft({ title: 'Hijacked opportunity title' }), actor(DAIRY)), /Only the coordinating account/);
  await rejects(() => demoRepo.saveOpportunity(draft({ targetQuantity: 0 }), actor(HONEY)), /whole number/);
  await rejects(() => demoRepo.saveOpportunity(draft({ title: 'Short' }), actor(HONEY)), /at least 6 characters/);

  const saved = await demoRepo.saveOpportunity(draft({ targetQuantity: 220 }), actor(HONEY));
  assert.equal(saved.targetQuantity, 220);
  assert.equal(saved.aggregateQuantity, 55);
  assert.equal(store.opportunities.find((o) => o.id === base.id)!.targetQuantity, 220);

  // Status moves forward, and a fulfilled order cannot be reopened.
  await rejects(() => demoRepo.setOpportunityStatus(base.id, 'closed', actor(DAIRY)), /Only the coordinating account/);
  await demoRepo.setOpportunityStatus(base.id, 'fulfilled', actor(HONEY));
  await rejects(() => demoRepo.setOpportunityStatus(base.id, 'open', actor(HONEY)), /cannot be reopened/);
  // Contributors are then locked out of withdrawing.
  await rejects(
    () => demoRepo.withdrawContribution('con_sample_honey_1', actor(HONEY)),
    /already closed/
  );
});

test('reports are raised by anyone but resolved only by an administrator', async () => {
  const { actor } = seed();
  const report = await demoRepo.createReport({
    listingId: 'lst_basket_set',
    reason: 'Wrong category',
    reporterName: 'Visiting buyer',
    reporterContact: 'buyer@example.invalid'
  });
  assert.equal(report.status, 'open');

  await rejects(() => demoRepo.updateReport(report.id, 'resolved', 'Done', actor(BASKET)), /administrator/);
  await rejects(() => demoRepo.updateReport(report.id, 'reviewing', '   ', actor(ADMIN)), /moderator note/);
  const resolved = await demoRepo.updateReport(report.id, 'resolved', 'Moved to the correct category.', actor(ADMIN));
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.adminNote, 'Moved to the correct category.');
});

test('a suspended administrator loses every administrator action', async () => {
  const { store, actor } = seed();
  await demoRepo.setProfileRole(DAIRY, 'admin', actor(ADMIN));
  const second = actor(DAIRY);
  await demoRepo.setProfileStatus(ADMIN, 'suspended', second);

  const staleAdminActor = actor(ADMIN);
  assert.equal(staleAdminActor.status, 'suspended');
  await rejects(() => demoRepo.saveSiteSettings({ siteName: 'Back again' }, staleAdminActor), /suspended/);
  await rejects(() => demoRepo.setProfileRole(BASKET, 'admin', staleAdminActor), /suspended/);
  assert.equal(store.profiles.find((p) => p.id === BASKET)!.role, 'producer');
});
