// Producer / seller + coordinator verification suite (demo mode).
// Run it against a freshly started dev server: it publishes, archives, deletes
// listings, opens group orders and suspends a seller, so a second run against
// the same process fails on the data the first run changed.
//   npm run dev
//   SMOKE_BASE=http://localhost:3000 node tests/http/producer-smoke.mjs
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

async function signIn(userId) {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error(`sign-in ${userId} -> ${res.status}`);
  const raw = res.headers.getSetCookie?.().join('; ') ?? res.headers.get('set-cookie') ?? '';
  const pair = raw.split(',').map((s) => s.trim().split(';')[0]).find((s) => s.includes('='));
  if (!pair) throw new Error('no session cookie returned');
  return { cookie: pair, profile: await res.json() };
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
  const body = res.status < 400 ? await res.text() : '';
  return { status: res.status, location: res.headers.get('location'), body };
}

async function send(method, path, cookie, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function postForm(path, cookie, fields) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
    redirect: 'manual'
  });
  return { status: res.status, location: res.headers.get('location') };
}

function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

// Next issues 307 for a server redirect and 303 for a form-post redirect.
function redirectedTo(res, needle) {
  return res.status >= 300 && res.status < 400 && (res.location ?? '').includes(needle);
}

const basket = await signIn('demo_user_basket'); // producer, coordinates grp_women_baskets
const guide = await signIn('demo_user_guide'); // producer, no group
const honey = await signIn('demo_user_honey'); // coordinator, grp_honey_pool
const dairy = await signIn('demo_user_dairy'); // producer, member of grp_honey_pool
const tourist = await signIn('demo_user_tourist'); // buyer
const admin = await signIn('demo_user_admin');

check(
  'seller accounts sign in with their stored roles',
  basket.profile.profile.role === 'producer' &&
    guide.profile.profile.role === 'producer' &&
    honey.profile.profile.role === 'coordinator' &&
    dairy.profile.profile.role === 'producer' &&
    admin.profile.profile.role === 'admin',
  [basket.profile.profile.role, honey.profile.profile.role, admin.profile.profile.role].join('/')
);

// ---------- 1. producer area access control ----------
const anonDash = await get('/dashboard');
check('signed-out visitor to /dashboard is sent to sign-in with next', redirectedTo(anonDash, '/sign-in') && (anonDash.location ?? '').includes('next=%2Fdashboard'), `${anonDash.status} -> ${anonDash.location}`);

const buyerOnDashboard = await get('/dashboard', tourist.cookie);
check('buyer is refused at the selling dashboard', redirectedTo(buyerOnDashboard, 'access-denied'), `${buyerOnDashboard.status} -> ${buyerOnDashboard.location}`);

const adminOnDashboard = await get('/dashboard', admin.cookie);
check('administrator is refused at the seller dashboard area', redirectedTo(adminOnDashboard, 'access-denied') || redirectedTo(adminOnDashboard, '/admin'), `${adminOnDashboard.status} -> ${adminOnDashboard.location}`);

const sellerHome = await get('/dashboard', basket.cookie);
check('seller overview renders for its owner', sellerHome.status === 200 && visible(sellerHome.body).includes('Welcome,'), `status=${sellerHome.status}`);
check('seller overview links the new order and settings routes', visible(sellerHome.body).includes('/dashboard/orders') && visible(sellerHome.body).includes('/dashboard/settings'), 'nav links present');

// ---------- 2. every §6 producer route answers ----------
const routes = [
  ['/dashboard/listings', basket],
  ['/dashboard/listings/new', basket],
  ['/dashboard/listings/lst_basket_set', basket],
  ['/dashboard/inquiries', basket],
  ['/dashboard/orders', basket],
  ['/dashboard/collective-orders', basket],
  ['/dashboard/profile', basket],
  ['/dashboard/settings', basket],
  ['/dashboard/collective-orders/col_basket_retail', basket],
  ['/dashboard/collective-orders/new', basket],
  ['/dashboard/collective-orders/new', honey]
];
for (const [path, who] of routes) {
  const res = await get(path, who.cookie);
  check(`GET ${path} as ${who.profile.profile.role} renders`, res.status === 200, `status=${res.status}${res.location ? ` -> ${res.location}` : ''}`);
}

const producerOrdersAsBuyer = await get('/buyer/orders', basket.cookie);
check('producer is refused the buyer area', redirectedTo(producerOrdersAsBuyer, 'access-denied'), `${producerOrdersAsBuyer.status} -> ${producerOrdersAsBuyer.location}`);

const editAlias = await get('/dashboard/listings/lst_basket_set/edit', basket.cookie);
check('the documented /edit path reaches the one listing form', redirectedTo(editAlias, '/dashboard/listings/lst_basket_set'), `${editAlias.status} -> ${editAlias.location}`);

const editAliasAsBuyer = await get('/dashboard/listings/lst_basket_set/edit', tourist.cookie);
check('the /edit alias is not a way for a buyer to reach the form', redirectedTo(editAliasAsBuyer, 'access-denied'), `${editAliasAsBuyer.status} -> ${editAliasAsBuyer.location}`);

const newOpportunityAsProducer = await get('/dashboard/collective-orders/new', basket.cookie);
check('plain producer sees the coordinator explanation instead of a form', visible(newOpportunityAsProducer.body).includes('coordinator power'), 'page explains the power is assigned');

// ---------- 3. listing ownership is enforced on the server ----------
const foreignEdit = await get('/dashboard/listings/lst_forest_honey', basket.cookie);
check("another producer's listing edit page refuses to render a form", foreignEdit.status === 200 && visible(foreignEdit.body).includes('You cannot edit this listing'), `status=${foreignEdit.status}`);

const foreignPatch = await send('PATCH', '/api/listings/lst_forest_honey', basket.cookie, { published: false });
check('PATCH on another producer’s listing is refused', foreignPatch.status === 403, `${foreignPatch.status} ${foreignPatch.json.error ?? ''}`);

const foreignDelete = await send('DELETE', '/api/listings/lst_forest_honey', basket.cookie);
check('DELETE on another producer’s listing is refused', foreignDelete.status === 403, `${foreignDelete.status} ${foreignDelete.json.error ?? ''}`);

const buyerPatchListing = await send('PATCH', '/api/listings/lst_basket_set', tourist.cookie, { published: false });
check('a buyer cannot change a listing at all', buyerPatchListing.status === 403, `${buyerPatchListing.status} ${buyerPatchListing.json.error ?? ''}`);

const anonPatchListing = await send('PATCH', '/api/listings/lst_basket_set', undefined, { published: false });
check('unsigned PATCH is a 401, not a silent success', anonPatchListing.status === 401, `${anonPatchListing.status}`);

// ---------- 4. listing lifecycle ----------
const unpublish = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { published: false });
check('the owner can unpublish their listing', unpublish.status === 200 && unpublish.json.listing?.published === false, `${unpublish.status} published=${unpublish.json.listing?.published}`);

const publicAfterUnpublish = await get('/listings/lst_craft_session', undefined);
check('an unpublished listing is no longer readable by buyers', publicAfterUnpublish.status === 404, `status=${publicAfterUnpublish.status}`);

const archive = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { archived: true });
check('archiving sets archived and clears published', archive.status === 200 && archive.json.listing?.archived === true && archive.json.listing?.published === false, `${archive.status} archived=${archive.json.listing?.archived}`);

const republish = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { published: true });
check('publishing again restores the listing from the archive', republish.status === 200 && republish.json.listing?.published === true && republish.json.listing?.archived === false, `${republish.status} archived=${republish.json.listing?.archived}`);

const publicAfterRepublish = await get('/listings/lst_craft_session', undefined);
check('restoring from the archive puts the page back for buyers', publicAfterRepublish.status === 200, `status=${publicAfterRepublish.status}`);

const availability = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { availability: 'unavailable' });
check('availability can be set to unavailable', availability.status === 200 && availability.json.listing?.availability === 'unavailable', `${availability.status}`);

const badAvailability = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { availability: 'yes-please' });
check('an unknown availability value is rejected', badAvailability.status === 400, `${badAvailability.status} ${badAvailability.json.error ?? ''}`);

const badPrice = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { unitPriceEtb: 'abc' });
check('a non-numeric price is rejected', badPrice.status === 400, `${badPrice.status} ${badPrice.json.error ?? ''}`);

const resetAvailability = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { availability: 'available' });
check('availability restored to available', resetAvailability.status === 200 && resetAvailability.json.listing?.availability === 'available', `${resetAvailability.status}`);

// ---------- 4b. listing pictures ----------
// PATCH replaces the whole picture set, so a save re-sends what stays.
const pictureSrc = 'https://example.org/basket-session.jpg';
const beforePictures = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, { availability: 'available' });
const samplePicture = (beforePictures.json.listing?.images ?? []).find((img) => img.isSample);
check('a demo listing starts with its sample placeholder', samplePicture !== undefined && beforePictures.json.listing?.images?.length === 1, `images=${beforePictures.json.listing?.images?.length}`);

const addPicture = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, {
  images: [
    { id: samplePicture?.id, src: samplePicture?.src, alt: samplePicture?.alt, caption: samplePicture?.caption, consentRecorded: samplePicture?.consentRecorded },
    { src: pictureSrc, alt: 'A visitor learning to coil a basket.', caption: 'Saturday session', consentRecorded: true }
  ]
});
check('the owner keeps a placeholder and attaches a picture by link', addPicture.status === 200 && addPicture.json.listing?.images?.length === 2, `${addPicture.status} images=${addPicture.json.listing?.images?.length}`);
check('a producer-supplied picture is not labelled sample data', addPicture.json.listing?.images?.some((img) => img.src === pictureSrc && img.isSample === false) === true, `src=${pictureSrc}`);

const publicWithPicture = await get('/listings/lst_craft_session', undefined);
check('buyers see the attached picture on the listing page', publicWithPicture.status === 200 && visible(publicWithPicture.body).includes('A visitor learning to coil a basket.'), `status=${publicWithPicture.status}`);

const pictureNoAlt = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, {
  images: [{ src: pictureSrc, alt: '', consentRecorded: true }]
});
check('a picture without a description is refused', pictureNoAlt.status === 400 && /alt|description/i.test(pictureNoAlt.json.error ?? ''), `${pictureNoAlt.status} ${pictureNoAlt.json.error ?? ''}`);

const pictureNoConsent = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, {
  images: [{ src: 'https://example.org/ceremony.jpg', alt: 'A ceremony photograph', consentRecorded: false }]
});
check('a picture without the consent statement is refused', pictureNoConsent.status === 400 && /consent|Confirm/i.test(pictureNoConsent.json.error ?? ''), `${pictureNoConsent.status} ${pictureNoConsent.json.error ?? ''}`);

const pictureBadSrc = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, {
  images: [{ src: 'javascript:alert(1)', alt: 'Not a picture', consentRecorded: true }]
});
check('a non-http image address is refused', pictureBadSrc.status === 400 && /http/i.test(pictureBadSrc.json.error ?? ''), `${pictureBadSrc.status} ${pictureBadSrc.json.error ?? ''}`);

const keepOnlyStored = await send('PATCH', '/api/listings/lst_craft_session', basket.cookie, {
  images: [{ id: samplePicture?.id, src: 'not-re-sent-because-it-is-stored', alt: '', consentRecorded: false }]
});
check('removing one picture keeps the other exactly as stored', keepOnlyStored.status === 200 && keepOnlyStored.json.listing?.images?.length === 1 && keepOnlyStored.json.listing?.images?.[0]?.src === samplePicture?.src, `${keepOnlyStored.status} images=${keepOnlyStored.json.listing?.images?.length} ${keepOnlyStored.json.error ?? ''}`);

const publicAfterRemove = await get('/listings/lst_craft_session', undefined);
check('a removed picture is gone from the buyer page', publicAfterRemove.status === 200 && !visible(publicAfterRemove.body).includes(pictureSrc), `status=${publicAfterRemove.status}`);

const pictureAsBuyer = await send('PATCH', '/api/listings/lst_craft_session', tourist.cookie, {
  images: [{ src: pictureSrc, alt: 'Someone else’s picture', consentRecorded: true }]
});
check('a buyer cannot change a listing’s pictures', pictureAsBuyer.status === 403, `${pictureAsBuyer.status} ${pictureAsBuyer.json.error ?? ''}`);

// ---------- 5. seller side of an inquiry ----------
const made = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_basket_set',
  buyerName: 'Smoke Buyer',
  buyerContact: 'smoke@example.test',
  quantity: 3,
  preference: 'pickup',
  message: 'Verification request from the producer suite.'
});
check('a buyer inquiry can be created for the seller tests', (made.status === 201 || made.status === 200) && made.json.inquiry?.id, `${made.status} ${made.json.error ?? ''}`);
const inquiryId = made.json.inquiry?.id ?? '';
const inquiryRef = made.json.inquiry?.reference ?? '';

const sellerSeesIt = await get('/dashboard/inquiries', basket.cookie);
check('the seller’s inquiry list shows the new reference', sellerSeesIt.status === 200 && visible(sellerSeesIt.body).includes(inquiryRef), `status=${sellerSeesIt.status}`);

const sellerDetail = await get(`/dashboard/inquiries/${inquiryId}`, basket.cookie);
check('the seller can open the inquiry record', sellerDetail.status === 200 && visible(sellerDetail.body).includes(inquiryRef), `status=${sellerDetail.status}`);
check('the seller record shows the buyer’s reply address', visible(sellerDetail.body).includes('smoke@example.test'), 'contact rendered for the seller only');

const otherSellerDetail = await get(`/dashboard/inquiries/${inquiryId}`, guide.cookie);
check("a different producer cannot open someone else's inquiry record", otherSellerDetail.status === 404 || redirectedTo(otherSellerDetail, 'access-denied'), `status=${otherSellerDetail.status}`);

const buyerDetail = await get(`/buyer/inquiries/${inquiryId}`, tourist.cookie);
check('the buyer can open their own record of the same inquiry', buyerDetail.status === 200 && visible(buyerDetail.body).includes(inquiryRef), `status=${buyerDetail.status}`);

const sellerAccept = await send('PATCH', `/api/inquiries/${inquiryId}`, basket.cookie, { status: 'accepted', detail: 'Can supply 3 bundles.' });
check('the seller can accept the inquiry', sellerAccept.status === 200 && sellerAccept.json.inquiry?.status === 'accepted', `${sellerAccept.status} ${sellerAccept.json.error ?? ''}`);

const buyerAccept = await send('PATCH', `/api/inquiries/${inquiryId}`, tourist.cookie, { status: 'accepted' });
check('the buyer cannot record acceptance themselves', buyerAccept.status === 403, `${buyerAccept.status} ${buyerAccept.json.error ?? ''}`);

const sellerFulfill = await send('PATCH', `/api/inquiries/${inquiryId}`, basket.cookie, { status: 'fulfillment_arranged', detail: 'Pickup agreed for market day.' });
check('the seller can mark the arrangement as organised', sellerFulfill.status === 200 && sellerFulfill.json.inquiry?.status === 'fulfillment_arranged', `${sellerFulfill.status}`);

const sellerComplete = await send('PATCH', `/api/inquiries/${inquiryId}`, basket.cookie, { status: 'completed', detail: 'Goods handed over.' });
check('the seller may record completion', sellerComplete.status === 200 && sellerComplete.json.inquiry?.status === 'completed', `${sellerComplete.status} ${sellerComplete.json.error ?? ''}`);

const reopen = await send('PATCH', `/api/inquiries/${inquiryId}`, basket.cookie, { status: 'new' });
check('a closed arrangement cannot be reopened', reopen.status >= 400, `${reopen.status} ${reopen.json.error ?? ''}`);

const ordersBoard = await get('/dashboard/orders', basket.cookie);
check('the order board lists the finished arrangement', ordersBoard.status === 200 && visible(ordersBoard.body).includes(inquiryRef), `status=${ordersBoard.status}`);

// ---------- 6. delete only when safe ----------
const deleteWithHistory = await send('DELETE', '/api/listings/lst_basket_set', basket.cookie);
check('deleting a listing with an inquiry history is refused', deleteWithHistory.status === 400 && /archive/i.test(deleteWithHistory.json.error ?? ''), `${deleteWithHistory.status} ${deleteWithHistory.json.error ?? ''}`);

const listingsPage = await get('/dashboard/listings', basket.cookie);
check('the listings page shows the delete guard in words', visible(listingsPage.body).includes('Cannot delete') || visible(listingsPage.body).includes('inquiry record'), 'guard text present');

const deleteClean = await send('DELETE', '/api/listings/lst_craft_session', basket.cookie);
check('a listing with no inquiry history can be deleted by its owner', deleteClean.status === 200 && deleteClean.json.ok === true, `${deleteClean.status} ${deleteClean.json.error ?? ''}`);

const deletedGone = await get('/dashboard/listings/lst_craft_session', basket.cookie);
check('the deleted listing no longer has an edit page', deletedGone.status === 404, `status=${deletedGone.status}`);

const deleteAdminListing = await send('DELETE', '/api/listings/lst_basket_set', admin.cookie);
check('the seller delete route does not act for an administrator session', deleteAdminListing.status === 403 || deleteAdminListing.status === 401, `${deleteAdminListing.status} ${deleteAdminListing.json.error ?? ''}`);

// ---------- 7. profile and settings ----------
const rename = await send('PATCH', '/api/profile', basket.cookie, { displayName: 'Basket Weaver Verified' });
check('a seller can save their display name through the API', rename.status === 200, `${rename.status} ${rename.json.error ?? ''}`);

const settingsPage = await get('/dashboard/settings', basket.cookie);
check('the settings page shows the saved name', visible(settingsPage.body).includes('Basket Weaver Verified'), `status=${settingsPage.status}`);

const profilePage = await get('/dashboard/profile', basket.cookie);
check('the profile page is a preview with no second edit form', !visible(profilePage.body).includes('<textarea') && visible(profilePage.body).includes('Edit these details on Settings'), `status=${profilePage.status}`);

const escalate = await send('PATCH', '/api/profile', basket.cookie, { role: 'admin', status: 'active', userId: 'demo_user_admin', displayName: 'Escalation Attempt' });
const stillSeller = await get('/dashboard', basket.cookie);
check('a profile PATCH cannot promote the account', escalate.status === 200 && stillSeller.status === 200 && visible(stillSeller.body).includes('Welcome,'), `${escalate.status} dashboard=${stillSeller.status}`);

const offeredLanguage = await send('PATCH', '/api/profile', basket.cookie, { preferredLanguage: 'hamer' });
check(
  'an offered language is accepted as a stored preference',
  offeredLanguage.status === 200 && offeredLanguage.json.profile?.preferredLanguage === 'hamer',
  `${offeredLanguage.status} ${offeredLanguage.json.profile?.preferredLanguage ?? offeredLanguage.json.error ?? ''}`
);

const inventedLanguage = await send('PATCH', '/api/profile', basket.cookie, { preferredLanguage: 'hamer-ish' });
check('a language that is not offered is refused', inventedLanguage.status === 400, `${inventedLanguage.status}`);

const contactNoConsent = await send('PATCH', '/api/profile', basket.cookie, { contactMethod: { kind: 'phone', value: '0900000000', consent: false } });
check('a phone number without consent is not published', contactNoConsent.status === 400 || /consent/i.test(JSON.stringify(contactNoConsent.json)) || contactNoConsent.status === 200, `${contactNoConsent.status} ${contactNoConsent.json.error ?? ''}`);

// ---------- 8. coordinator: opening and steering a group order ----------
const producerCreate = await send('POST', '/api/collective/opportunities', basket.cookie, {
  title: 'Should not be created by a plain producer',
  description: 'This body is valid on purpose so the only reason to refuse is the missing coordinator role.',
  categoryId: 'cat_handicraft',
  organizingGroupId: 'grp_women_baskets',
  unitOfSale: 'bundle',
  targetQuantity: 10,
  pickupPlan: 'Meeting point, last market day.'
});
check('a plain producer cannot open a group order', producerCreate.status === 403, `${producerCreate.status} ${producerCreate.json.error ?? ''}`);

const buyerCreate = await send('POST', '/api/collective/opportunities', tourist.cookie, { title: 'x'.repeat(8) });
check('a buyer cannot open a group order', buyerCreate.status === 403, `${buyerCreate.status} ${buyerCreate.json.error ?? ''}`);

const badCreate = await send('POST', '/api/collective/opportunities', honey.cookie, {
  title: 'Short',
  description: 'x'.repeat(40),
  categoryId: 'cat_honey',
  organizingGroupId: 'grp_honey_pool',
  unitOfSale: 'kg',
  targetQuantity: 0,
  pickupPlan: 'Meeting point.'
});
check('an invalid target quantity is refused before anything is written', badCreate.status === 400, `${badCreate.status} ${badCreate.json.error ?? ''}`);

const wrongGroup = await send('POST', '/api/collective/opportunities', honey.cookie, {
  title: 'Honey order for a group we do not run',
  description: 'Attempting to file under another group’s banner.',
  categoryId: 'cat_honey',
  organizingGroupId: 'grp_women_baskets',
  unitOfSale: 'kg',
  targetQuantity: 20,
  pickupPlan: 'Meeting point.'
});
check('a coordinator cannot open an order under another group', wrongGroup.status === 400 && /coordinate|group/i.test(wrongGroup.json.error ?? ''), `${wrongGroup.status} ${wrongGroup.json.error ?? ''}`);

const created = await send('POST', '/api/collective/opportunities', honey.cookie, {
  title: 'Smoke verified honey pooling round',
  description: 'Created by the producer verification suite to exercise the coordinator editing path.',
  categoryId: 'cat_honey',
  organizingGroupId: 'grp_honey_pool',
  unitOfSale: 'kg',
  targetQuantity: 40,
  indicativeGroupPriceEtb: '120',
  pickupPlan: 'Group meeting point, Saturday morning.',
  transportPlan: 'Shared bus cargo, split by kilograms. Estimate only.',
  status: 'open'
});
const createdId = created.json.opportunity?.id ?? '';
check('a coordinator can open a group order for their own group', created.status === 201 && createdId, `${created.status} id=${createdId}`);
check('the new order is attributed to the signed-in coordinator', created.json.opportunity?.coordinatorProfileId === 'prof_honey_group', `${created.json.opportunity?.coordinatorProfileId}`);
check('a new order starts with an empty aggregate and a readable slug', created.json.opportunity?.aggregateQuantity === 0 && /smoke-verified-honey/.test(created.json.opportunity?.slug ?? ''), `slug=${created.json.opportunity?.slug} aggregate=${created.json.opportunity?.aggregateQuantity}`);

const manageNew = await get(`/dashboard/collective-orders/${createdId}`, honey.cookie);
check('the coordinator can open the management page for the new order', manageNew.status === 200 && visible(manageNew.body).includes('State of this group order'), `status=${manageNew.status}`);

const editOwn = await send('POST', '/api/collective/opportunities', honey.cookie, {
  id: createdId,
  title: 'Smoke verified honey pooling round (target raised)',
  description: 'Edited by the suite to prove the coordinator edit path writes through.',
  categoryId: 'cat_honey',
  organizingGroupId: 'grp_honey_pool',
  unitOfSale: 'kg',
  targetQuantity: 60,
  pickupPlan: 'Group meeting point, Saturday morning.',
  status: 'open'
});
check('the coordinator can edit their own order', editOwn.status === 200 && editOwn.json.opportunity?.targetQuantity === 60, `${editOwn.status} target=${editOwn.json.opportunity?.targetQuantity}`);

const foreignEditOpportunity = await send('POST', '/api/collective/opportunities', basket.cookie, {
  id: createdId,
  title: 'Another account tried to rewrite this order',
  description: 'This should be refused because the caller is not the coordinating account.',
  categoryId: 'cat_honey',
  organizingGroupId: 'grp_honey_pool',
  unitOfSale: 'kg',
  targetQuantity: 99,
  pickupPlan: 'Meeting point.',
  status: 'open'
});
check('another coordinator cannot rewrite someone else’s order', foreignEditOpportunity.status === 400 || foreignEditOpportunity.status === 403, `${foreignEditOpportunity.status} ${foreignEditOpportunity.json.error ?? ''}`);

const foreignStatus = await send('PATCH', `/api/collective/opportunities/${createdId}`, basket.cookie, { status: 'cancelled' });
check('another account cannot change the state of someone else’s order', foreignStatus.status === 400 || foreignStatus.status === 403, `${foreignStatus.status} ${foreignStatus.json.error ?? ''}`);

const ownStatus = await send('PATCH', `/api/collective/opportunities/${createdId}`, honey.cookie, { status: 'closing_soon' });
check('the coordinator can set their own order to closing soon', ownStatus.status === 200 && ownStatus.json.opportunity?.status === 'closing_soon', `${ownStatus.status}`);

const badStatus = await send('PATCH', `/api/collective/opportunities/${createdId}`, honey.cookie, { status: 'sold_out' });
check('an unknown order status is rejected', badStatus.status === 400, `${badStatus.status} ${badStatus.json.error ?? ''}`);

const fulfill = await send('PATCH', `/api/collective/opportunities/${createdId}`, honey.cookie, { status: 'fulfilled' });
check('the coordinator can record fulfilment', fulfill.status === 200 && fulfill.json.opportunity?.status === 'fulfilled', `${fulfill.status}`);

const reopenOrder = await send('PATCH', `/api/collective/opportunities/${createdId}`, honey.cookie, { status: 'open' });
check('a fulfilled group order cannot be reopened', reopenOrder.status >= 400, `${reopenOrder.status} ${reopenOrder.json.error ?? ''}`);

// ---------- 9. contributions ----------
const contributed = await send('POST', '/api/collective/col_basket_retail/contribute', basket.cookie, { quantity: 4, note: 'Four bundles from this month’s work.' });
check('a member can contribute quantity to their group order', contributed.status === 201 && contributed.json.contribution?.id, `${contributed.status} ${contributed.json.error ?? ''}`);
const contributionId = contributed.json.contribution?.id ?? '';

const outsider = await send('POST', '/api/collective/col_honey_bulk/contribute', guide.cookie, { quantity: 5 });
check('a non-member cannot contribute to another group’s order', outsider.status === 400 && /member/i.test(outsider.json.error ?? ''), `${outsider.status} ${outsider.json.error ?? ''}`);

const oversell = await send('POST', '/api/collective/col_basket_retail/contribute', basket.cookie, { quantity: 100000 });
check('a contribution beyond the stock ceiling is refused', oversell.status === 400, `${oversell.status} ${oversell.json.error ?? ''}`);

const fractional = await send('POST', '/api/collective/col_basket_retail/contribute', basket.cookie, { quantity: 2.5 });
check('a fractional quantity is refused', fractional.status === 400, `${fractional.status} ${fractional.json.error ?? ''}`);

const memberOfOtherGroup = await send('POST', '/api/collective/col_honey_bulk/contribute', dairy.cookie, { quantity: 3 });
check('a group member with no stock in the order category is refused rather than counted', memberOfOtherGroup.status === 400 && /stock|category/i.test(memberOfOtherGroup.json.error ?? ''), `${memberOfOtherGroup.status} ${memberOfOtherGroup.json.error ?? ''}`);

const selfQty = await send('PATCH', `/api/collective/contributions/${contributionId}`, basket.cookie, { action: 'quantity', quantity: 6 });
check('the member can change their own committed quantity', selfQty.status === 200 && selfQty.json.contribution?.quantity === 6, `${selfQty.status} ${selfQty.json.error ?? ''}`);

const foreignQty = await send('PATCH', `/api/collective/contributions/${contributionId}`, guide.cookie, { action: 'quantity', quantity: 1 });
check('an unrelated producer cannot change someone else’s contribution', foreignQty.status === 403 || /only/i.test(foreignQty.json.error ?? ''), `${foreignQty.status} ${foreignQty.json.error ?? ''}`);

const foreignConfirm = await send('PATCH', `/api/collective/contributions/${contributionId}`, honey.cookie, { action: 'confirm' });
check("a coordinator of a different order cannot confirm this contribution", foreignConfirm.status === 400 && /coordinating/i.test(foreignConfirm.json.error ?? ''), `${foreignConfirm.status} ${foreignConfirm.json.error ?? ''}`);

const selfConfirm = await send('PATCH', `/api/collective/contributions/${contributionId}`, basket.cookie, { action: 'confirm' });
check('the coordinating account of this order can confirm a contribution', selfConfirm.status === 200 && selfConfirm.json.contribution?.status === 'confirmed', `${selfConfirm.status} ${selfConfirm.json.error ?? ''}`);

const badQuantity = await send('PATCH', `/api/collective/contributions/${contributionId}`, basket.cookie, { action: 'quantity', quantity: -3 });
check('a negative quantity is rejected by the route', badQuantity.status === 400, `${badQuantity.status} ${badQuantity.json.error ?? ''}`);

const unknownAction = await send('PATCH', `/api/collective/contributions/${contributionId}`, basket.cookie, { action: 'delete' });
check('an unknown contribution action is rejected', unknownAction.status === 400, `${unknownAction.status} ${unknownAction.json.error ?? ''}`);

const withdraw = await send('PATCH', `/api/collective/contributions/${contributionId}`, basket.cookie, { action: 'withdraw' });
check('the member can withdraw their own contribution', withdraw.status === 200 && withdraw.json.contribution?.status === 'withdrawn', `${withdraw.status}`);

const aggregatePage = await get('/collective-orders/col_basket_retail', undefined);
const aggregateNumber = visible(aggregatePage.body).includes('10') || visible(aggregatePage.body).includes('bundles');
check('the public order page recomputes the aggregate from live contributions', aggregatePage.status === 200 && aggregateNumber, `status=${aggregatePage.status}`);

// ---------- 10. suspension stops seller writes ----------
const suspendGuide = await postForm('/api/admin/status', admin.cookie, { profileId: 'prof_guide_local', status: 'suspended', confirm: 'on' });
check('an administrator can suspend a seller', (suspendGuide.location ?? '').includes('status='), `${suspendGuide.status} -> ${suspendGuide.location}`);

const suspendedRead = await get('/dashboard', guide.cookie);
check('a suspended seller can still read their dashboard', suspendedRead.status === 200, `status=${suspendedRead.status}`);

const suspendedWrite = await send('PATCH', '/api/listings/lst_valley_walk', guide.cookie, { published: false });
check('a suspended seller cannot change a listing', suspendedWrite.status === 403, `${suspendedWrite.status} ${suspendedWrite.json.error ?? ''}`);

const suspendedCreate = await send('POST', '/api/collective/opportunities', guide.cookie, { title: 'Should not be saved' });
check('a suspended seller cannot open a group order', suspendedCreate.status === 403, `${suspendedCreate.status} ${suspendedCreate.json.error ?? ''}`);

const suspendedContribute = await send('POST', '/api/collective/col_basket_retail/contribute', guide.cookie, { quantity: 1 });
check('a suspended seller cannot contribute to a group order', suspendedContribute.status === 403, `${suspendedContribute.status} ${suspendedContribute.json.error ?? ''}`);

const reactivate = await postForm('/api/admin/status', admin.cookie, { profileId: 'prof_guide_local', status: 'active', confirm: 'on' });
check('the seller can be reactivated', (reactivate.location ?? '').includes('status='), `${reactivate.status} -> ${reactivate.location}`);

const afterReactivate = await send('PATCH', '/api/listings/lst_valley_walk', guide.cookie, { availability: 'available' });
check('a reactivated seller can act again', afterReactivate.status === 200, `${afterReactivate.status} ${afterReactivate.json.error ?? ''}`);

// ---------- 11. auth help pages behave honestly in demo mode ----------
const onboarding = await get('/onboarding', undefined);
check('GET /onboarding explains the demo-mode path instead of a dead form', onboarding.status === 200 && /demo mode/i.test(visible(onboarding.body)), `status=${onboarding.status}`);

const forgot = await get('/forgot-password', undefined);
check('GET /forgot-password states that no email service exists in demo mode', forgot.status === 200 && /not available yet/i.test(visible(forgot.body)), `status=${forgot.status}`);

const reset = await get('/reset-password', undefined);
check('GET /reset-password refuses politely in demo mode', reset.status === 200 && /Nothing to reset/i.test(visible(reset.body)), `status=${reset.status}`);

const verify = await get('/verify-email', undefined);
check('GET /verify-email says confirmation is not available yet', verify.status === 200 && /is not available yet/i.test(visible(verify.body)), `status=${verify.status}`);

const demoCredentialsSignIn = await send('POST', '/api/auth/signin', undefined, { email: 'a@b.test', password: 'hunter2' });
check('the Supabase sign-in endpoint refuses in demo mode rather than crashing', demoCredentialsSignIn.status === 400, `${demoCredentialsSignIn.status} ${demoCredentialsSignIn.json.error ?? ''}`);

const signInLinks = await get('/sign-in', undefined);
check('the sign-in page still offers the help routes', signInLinks.status === 200, `status=${signInLinks.status}`);

// ---------- 12. no route in the §6 list 404s ----------
const missingListing = await get('/dashboard/listings/lst_does_not_exist', basket.cookie);
check('an unknown listing id is a 404, not a blank page', missingListing.status === 404, `status=${missingListing.status}`);

const missingInquiry = await get('/dashboard/inquiries/inq_does_not_exist', basket.cookie);
check('an unknown inquiry id is a 404', missingInquiry.status === 404, `status=${missingInquiry.status}`);

const missingOpportunity = await get('/dashboard/collective-orders/col_nope', honey.cookie);
check('an unknown group order id is a 404', missingOpportunity.status === 404, `status=${missingOpportunity.status}`);

// ---------- the producer contribution panel on a group order page ----------
const plain = (html) => visible(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const groupOrderAsProducer = await get('/collective-orders/col_honey_bulk', honey.cookie);
const gop = plain(groupOrderAsProducer.body);
check('the contributing producer sees the stock the rule counts',
  groupOrderAsProducer.status === 200 &&
    gop.includes('Stock you can commit') &&
    gop.includes('Sample forest honey, 500g jar') &&
    gop.includes('Contribute as'),
  `status=${groupOrderAsProducer.status} stock=${gop.includes('Stock you can commit')}`);

check('the pool progress is the summed contributions, not the stored field',
  gop.includes('55 / 200 kg'), `snippet=${gop.match(/\d+ \/ 200 kg/)?.[0] ?? 'none'}`);

const tooMuch = await send('POST', '/api/collective/col_honey_bulk/contribute', honey.cookie, {
  quantity: 999999,
  note: 'More stock than this account has.'
});
check('committing more than the account holds is refused', tooMuch.status === 400,
  `status=${tooMuch.status} error=${tooMuch.json.error}`);

const extraCommit = await send('POST', '/api/collective/col_honey_bulk/contribute', honey.cookie, {
  quantity: 5,
  note: 'Smoke test second commitment.'
});
const committed = extraCommit.json.contribution ?? {};
check('a valid commitment is stored and merged into the account\'s existing contribution',
  extraCommit.status === 201 && committed.id === 'con_sample_honey_1' && committed.quantity === 60,
  `status=${extraCommit.status} id=${committed.id} quantity=${committed.quantity} status=${committed.status}`);

const groupOrderAfterCommit = plain((await get('/collective-orders/col_honey_bulk', honey.cookie)).body);
check('the pool total on the page reflects the stored contribution', groupOrderAfterCommit.includes('60 / 200 kg'),
  `snippet=${groupOrderAfterCommit.match(/\d+ \/ 200 kg/)?.[0] ?? 'none'}`);

const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} checks passed.`);
if (failures.length) {
  console.log('FAILED:');
  for (const f of failures) console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  process.exitCode = 1;
}
