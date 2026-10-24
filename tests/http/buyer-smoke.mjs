// Buyer / visitor verification suite (demo mode).
// Run it against a freshly started dev server: it sends inquiries, suspends a
// sample buyer, and edits profiles, so results depend on unmutated demo data.
//   npm run dev
//   SMOKE_BASE=http://localhost:3000 node tests/http/buyer-smoke.mjs
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
    headers: { ...(cookie ? { cookie } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// The RSC flight payload legitimately contains "$undefined", so only the
// rendered text outside <script> is scanned.
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

// Next issues 307 for a server redirect and 303 for a form-post redirect; both
// are the same refusal, so the checks match the destination, not the code.
function redirectedTo(res, needle) {
  return res.status >= 300 && res.status < 400 && (res.location ?? '').includes(needle);
}

const tourist = await signIn('demo_user_tourist');
const hotel = await signIn('demo_user_hotel');
const basket = await signIn('demo_user_basket');
const guide = await signIn('demo_user_guide');
const admin = await signIn('demo_user_admin');
check('demo accounts sign in', tourist.profile.profile.role === 'buyer' && hotel.profile.profile.role === 'buyer' && basket.profile.profile.role === 'producer' && guide.profile.profile.role === 'producer' && admin.profile.profile.role === 'admin',
  [tourist.profile.profile.role, hotel.profile.profile.role, basket.profile.profile.role, guide.profile.profile.role, admin.profile.profile.role].join('/'));

// ---------- 1. buyer area access control ----------
const buyerHome = await get('/buyer', tourist.cookie);
check('GET /buyer as buyer renders', buyerHome.status === 200 && visible(buyerHome.body).includes('Welcome,'), `status=${buyerHome.status}`);

const buyerAsProducer = await get('/buyer', basket.cookie);
check('GET /buyer as producer is refused', redirectedTo(buyerAsProducer, 'access-denied'), `${buyerAsProducer.status} -> ${buyerAsProducer.location}`);

const buyerAsAdmin = await get('/buyer', admin.cookie);
check('GET /buyer as admin is refused', redirectedTo(buyerAsAdmin, 'access-denied'), `${buyerAsAdmin.status} -> ${buyerAsAdmin.location}`);

const buyerAnon = await get('/buyer', undefined);
check('GET /buyer signed out goes to sign-in with next', redirectedTo(buyerAnon, '/sign-in?next=%2Fbuyer'), `${buyerAnon.status} -> ${buyerAnon.location}`);

const buyerPages = ['/buyer/inquiries', '/buyer/orders', '/buyer/bookings', '/buyer/profile', '/buyer/settings'];
for (const path of buyerPages) {
  const res = await get(path, tourist.cookie);
  check(`GET ${path} as buyer renders`, res.status === 200 && visible(res.body).length > 2000, `status=${res.status}`);
}
for (const path of buyerPages) {
  const res = await get(path, basket.cookie);
  check(`GET ${path} as producer is refused`, redirectedTo(res, 'access-denied'), `${res.status} -> ${res.location}`);
}

// ---------- 2. inquiry attribution ----------
const asGuest = await send('POST', '/api/inquiries', undefined, {
  listingId: 'lst_basket_set',
  buyerName: 'Walk-in visitor',
  buyerContact: '+251 900 000 111',
  quantity: 2,
  preference: 'pickup',
  message: 'Smoke test inquiry from a visitor with no account.'
});
check('guest can send an inquiry', asGuest.status === 201 && !asGuest.json.inquiry?.buyerProfileId, `status=${asGuest.status}`);

const spoof = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_basket_set',
  buyerName: 'Omo Valley Guesthouse',
  buyerContact: 'guesthouse@example.test',
  quantity: 3,
  preference: 'delivery',
  message: 'Smoke test inquiry that tries to claim someone else’s account.',
  buyerProfileId: 'prof_hotel_buyer'
});
const inquiryA = spoof.json.inquiry ?? {};
check('signed-in inquiry is attributed from the session, not the body',
  spoof.status === 201 && inquiryA.buyerProfileId === 'prof_tourist_visitor',
  `status=${spoof.status} attributed=${inquiryA.buyerProfileId}`);

const spoof2 = await send('POST', '/api/inquiries', hotel.cookie, {
  listingId: 'lst_valley_walk',
  buyerName: 'Hotel concierge',
  buyerContact: 'concierge@example.test',
  quantity: 2,
  preference: 'booking',
  preferredDate: '2030-03-01',
  message: 'Smoke test booking inquiry for a guided walk.'
});
const inquiryB = spoof2.json.inquiry ?? {};
check('booking inquiry accepted and attributed to the hotel account',
  spoof2.status === 201 && inquiryB.buyerProfileId === 'prof_hotel_buyer', `status=${spoof2.status}`);

const badQty = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_forest_honey',
  buyerName: 'Too little',
  buyerContact: 'x@example.test',
  quantity: 1,
  preference: 'pickup',
  message: 'Below the minimum order quantity.'
});
check('quantity below the listing minimum is refused', badQty.status === 400 && /at least 6/.test(badQty.json.error ?? ''), `status=${badQty.status} error=${badQty.json.error}`);

const oversell = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_basket_set',
  buyerName: 'Too many',
  buyerContact: 'x@example.test',
  quantity: 500,
  preference: 'pickup',
  message: 'More than the available quantity.'
});
check('quantity above available stock is refused', oversell.status === 400 && /Only 24/.test(oversell.json.error ?? ''), `status=${oversell.status} error=${oversell.json.error}`);

// ---------- 3. each buyer sees only their own records ----------
const listA = await get(`/buyer/inquiries?_=${Date.now()}`, tourist.cookie);
const listAtext = visible(listA.body);
check('buyer sees their own inquiry reference', listAtext.includes(inquiryA.reference ?? 'no-ref'), `reference=${inquiryA.reference}`);
check('buyer does not see another account’s inquiry', !listAtext.includes(inquiryB.reference ?? 'other'), 'cross-account record hidden');

const listB = await get('/buyer/inquiries', hotel.cookie);
check('other buyer sees only their own inquiry', listB.status === 200 && visible(listB.body).includes(inquiryB.reference ?? 'x') && !visible(listB.body).includes(inquiryA.reference ?? 'y'));

const foreignDetail = await get(`/buyer/inquiries/${inquiryA.id}`, hotel.cookie);
check('opening another account’s arrangement returns 404', foreignDetail.status === 404 || foreignDetail.status === 302, `status=${foreignDetail.status}`);

const ownDetail = await get(`/buyer/inquiries/${inquiryA.id}`, tourist.cookie);
check('own arrangement detail renders', ownDetail.status === 200 && visible(ownDetail.body).includes(inquiryA.reference ?? 'ref'), `status=${ownDetail.status}`);
check('arrangement detail says the estimate is not an invoice', visible(ownDetail.body).toLowerCase().includes('it is not an invoice'));
check('arrangement detail keeps payment as a separate record', visible(ownDetail.body).toLowerCase().includes('payment, where it is taken through omonettab, is a separate record'));

const notASale = visible(ownDetail.body).toLowerCase();
check('open arrangement is not described as a sale', !notASale.includes('sale completed') && notASale.includes('not a sale yet'), 'stays an arrangement');

// ---------- 4. status transition rules ----------
const buyerAccept = await send('PATCH', `/api/inquiries/${inquiryA.id}`, tourist.cookie, { status: 'accepted' });
check('buyer cannot record seller acceptance', buyerAccept.status === 403, `status=${buyerAccept.status} error=${buyerAccept.json.error}`);

const strangerEdit = await send('PATCH', `/api/inquiries/${inquiryA.id}`, hotel.cookie, { status: 'completed' });
check('a buyer on another account’s arrangement gets 404', strangerEdit.status === 404, `status=${strangerEdit.status}`);

const adminEdit = await send('PATCH', `/api/inquiries/${inquiryA.id}`, admin.cookie, { status: 'completed' });
check('administrator is not a party and cannot change it', adminEdit.status === 404, `status=${adminEdit.status}`);

const anonEdit = await send('PATCH', `/api/inquiries/${inquiryA.id}`, undefined, { status: 'completed' });
check('signed-out status change is 401', anonEdit.status === 401, `status=${anonEdit.status}`);

const wrongSeller = await send('PATCH', `/api/inquiries/${inquiryA.id}`, guide.cookie, { status: 'accepted' });
check('a producer who does not own the listing gets 404', wrongSeller.status === 404, `status=${wrongSeller.status}`);

const sellerAccept = await send('PATCH', `/api/inquiries/${inquiryA.id}`, basket.cookie, { status: 'accepted' });
check('seller can accept their own arrangement', sellerAccept.status === 200 && sellerAccept.json.inquiry?.status === 'accepted', `status=${sellerAccept.status}`);

const sellerArrange = await send('PATCH', `/api/inquiries/${inquiryA.id}`, basket.cookie, { status: 'fulfillment_arranged' });
check('seller can record fulfilment', sellerArrange.status === 200 && sellerArrange.json.inquiry?.status === 'fulfillment_arranged', `status=${sellerArrange.status}`);

const buyerComplete = await send('PATCH', `/api/inquiries/${inquiryA.id}`, tourist.cookie, { status: 'completed' });
check('buyer can confirm completion', buyerComplete.status === 200 && buyerComplete.json.inquiry?.status === 'completed', `status=${buyerComplete.status}`);

const reopen = await send('PATCH', `/api/inquiries/${inquiryA.id}`, basket.cookie, { status: 'accepted' });
check('a completed arrangement cannot be reopened', reopen.status === 400 && /closed/.test(reopen.json.error ?? ''), `error=${reopen.json.error}`);

const history = await get(`/buyer/inquiries/${inquiryA.id}`, tourist.cookie);
const historyText = visible(history.body);
check('status history is shown to the buyer', historyText.includes('Buyer recorded this arrangement as completed') && historyText.includes('Seller changed status to accepted'));

// ---------- 5. review loop ----------
const reviewForm = historyText.includes('Leave a review') || historyText.includes('rating');
check('completed arrangement offers the review form', reviewForm, 'review form present');

const anonReview = await send('POST', '/api/reviews', undefined, { listingId: 'lst_basket_set', inquiryId: inquiryA.id, rating: 5, comment: 'Smoke test review without a session.' });
check('anonymous review is rejected with 401', anonReview.status === 401, `status=${anonReview.status}`);

const notYours = await send('POST', '/api/reviews', hotel.cookie, { listingId: 'lst_basket_set', inquiryId: inquiryA.id, rating: 5, comment: 'Trying to review someone else’s arrangement.' });
check('reviewing another account’s arrangement is refused', notYours.status === 400 && /your own/.test(notYours.json.error ?? ''), `error=${notYours.json.error}`);

const openArrangement = await send('POST', '/api/reviews', hotel.cookie, { listingId: 'lst_valley_walk', inquiryId: inquiryB.id, rating: 4, comment: 'Reviewing before completion should fail.' });
check('review before completion is refused', openArrangement.status === 400 && /completed/.test(openArrangement.json.error ?? ''), `error=${openArrangement.json.error}`);

const soldOutReview = await send('POST', '/api/reviews', basket.cookie, { listingId: 'lst_basket_set', inquiryId: inquiryA.id, rating: 5, comment: 'A seller must not review the buyer side.' });
check('seller cannot author a buyer review', soldOutReview.status === 400 && /your own/.test(soldOutReview.json.error ?? ''), `status=${soldOutReview.status} error=${soldOutReview.json.error}`);

const firstReview = await send('POST', '/api/reviews', tourist.cookie, { listingId: 'lst_basket_set', inquiryId: inquiryA.id, rating: 5, comment: 'The baskets arrived at the guesthouse exactly as described in the listing.' });
check('buyer can review their own completed arrangement', firstReview.status === 201 && firstReview.json.review?.status === 'published', `status=${firstReview.status} author=${firstReview.json.review?.authorName}`);
check('review author name comes from the stored profile', (firstReview.json.review?.authorName ?? '') === tourist.profile.profile.displayName, `${firstReview.json.review?.authorName} vs ${tourist.profile.profile.displayName}`);

const dupe = await send('POST', '/api/reviews', tourist.cookie, { listingId: 'lst_basket_set', inquiryId: inquiryA.id, rating: 1, comment: 'Second attempt at the same arrangement.' });
check('duplicate review on the same inquiry is refused', dupe.status === 400 && /already reviewed/.test(dupe.json.error ?? ''), `error=${dupe.json.error}`);

const badRating = await send('POST', '/api/reviews', hotel.cookie, { listingId: 'lst_valley_walk', inquiryId: inquiryB.id, rating: 9, comment: 'Rating out of range.' });
check('invalid rating is refused (before completion check)', badRating.status === 400, `status=${badRating.status} error=${badRating.json.error}`);

const publicListing = await get('/listings/lst_basket_set', undefined);
const publicText = visible(publicListing.body);
check('published review appears on the public listing', publicListing.status === 200 && publicText.includes('The baskets arrived at the guesthouse exactly as described'));
check('listing shows an average rating', /5\.0|average/i.test(publicText), 'average rendered');

// ---------- 6. bookings and orders split ----------
const hotelBookings = await get('/buyer/bookings', hotel.cookie);
const bookingsText = visible(hotelBookings.body);
check('service inquiry appears under Bookings', hotelBookings.status === 200 && bookingsText.includes('/buyer/inquiries/' + (inquiryB.id ?? '')) && bookingsText.includes('2030-03-01'), `link=${bookingsText.includes('/buyer/inquiries/' + (inquiryB.id ?? ''))} date=${bookingsText.includes('2030-03-01')}`);
const hotelOrders = await get('/buyer/orders', hotel.cookie);
check('service inquiry does not appear under Orders', !visible(hotelOrders.body).includes(inquiryB.reference ?? 'ref'));

const touristOrders = await get('/buyer/orders', tourist.cookie);
check('goods inquiry appears under Orders', touristOrders.status === 200 && visible(touristOrders.body).includes(inquiryA.reference ?? 'ref'));

// ---------- 7. cancellation ----------
const cancelMe = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_milk_butter',
  buyerName: 'Omo Valley Guesthouse',
  buyerContact: 'guesthouse@example.test',
  quantity: 4,
  preference: 'pickup',
  message: 'Smoke test inquiry that will be cancelled.'
});
const cancelled = await send('PATCH', `/api/inquiries/${cancelMe.json.inquiry?.id}`, tourist.cookie, { status: 'cancelled' });
check('buyer can cancel their own request', cancelled.status === 200 && cancelled.json.inquiry?.status === 'cancelled', `status=${cancelled.status}`);
const filteredCancelled = await get('/buyer/inquiries?status=cancelled', tourist.cookie);
check('status filter shows the cancelled record', filteredCancelled.status === 200 && visible(filteredCancelled.body).includes(cancelMe.json.inquiry?.reference ?? 'ref'));
const filteredEmpty = await get('/buyer/inquiries?status=new&q=zzzzzz', tourist.cookie);
check('impossible filter shows an empty state, not an error', filteredEmpty.status === 200 && visible(filteredEmpty.body).includes('No inquiry matches'));

// ---------- 8. profile and settings ----------
const noConsent = await send('PATCH', '/api/profile', tourist.cookie, { contactMethod: { kind: 'phone', value: '+251 911 222 333', consent: false } });
check('contact detail without consent is refused', noConsent.status === 400 && /consent/.test(noConsent.json.error ?? ''), `error=${noConsent.json.error}`);

const badPhone = await send('PATCH', '/api/profile', tourist.cookie, { contactMethod: { kind: 'phone', value: 'not a number', consent: true } });
check('malformed phone number is refused', badPhone.status === 400 && /phone/.test(badPhone.json.error ?? ''), `error=${badPhone.json.error}`);

const badEmail = await send('PATCH', '/api/profile', tourist.cookie, { contactMethod: { kind: 'email', value: 'nope@nope', consent: true } });
check('malformed email is refused', badEmail.status === 400 && /email/.test(badEmail.json.error ?? ''), `error=${badEmail.json.error}`);

const langAm = await send('PATCH', '/api/profile', tourist.cookie, { preferredLanguage: 'am' });
check(
  'an offered language is saved as a preference even while its copy is unreviewed',
  langAm.status === 200 && langAm.json.profile?.preferredLanguage === 'am',
  `status=${langAm.status} language=${langAm.json.profile?.preferredLanguage} error=${langAm.json.error}`
);

const langHamer = await send('PATCH', '/api/profile', tourist.cookie, { preferredLanguage: 'hamster' });
check('unknown language code is refused', langHamer.status === 400, `status=${langHamer.status} error=${langHamer.json.error}`);

const escalation = await send('PATCH', '/api/profile', tourist.cookie, { displayName: 'Omo Valley Guesthouse', role: 'admin', status: 'active', userId: 'demo_user_admin' });
check('profile edit succeeds while ignoring privileged fields', escalation.status === 200 && escalation.json.profile?.role === 'buyer' && escalation.json.profile?.userId === 'demo_user_tourist', `role=${escalation.json.profile?.role} userId=${escalation.json.profile?.userId}`);

const stillBlocked = await get('/admin', tourist.cookie);
check('escalation attempt did not grant admin access', redirectedTo(stillBlocked, 'access-denied'), `${stillBlocked.status} -> ${stillBlocked.location}`);

const withContact = await send('PATCH', '/api/profile', tourist.cookie, { contactMethod: { kind: 'phone', value: '+251 911 222 333', consent: true } });
check('consented contact detail is stored', withContact.status === 200 && withContact.json.profile?.contactMethod?.value === '+251 911 222 333');

const profilePage = await get('/buyer/profile', tourist.cookie);
check('buyer profile page renders stored contact', profilePage.status === 200 && visible(profilePage.body).includes('+251 911 222 333'));
check('buyer profile lists the review this account wrote', visible(profilePage.body).includes('The baskets arrived at the guesthouse'));

const anonProfile = await send('PATCH', '/api/profile', undefined, { displayName: 'Nobody' });
check('anonymous profile edit is 401', anonProfile.status === 401, `status=${anonProfile.status}`);

const settingsHtml = visible((await get('/buyer/settings', tourist.cookie)).body);
check('settings page marks unreviewed languages unavailable', /Hamer/.test(settingsHtml) && /disabled/.test(settingsHtml), 'language options disabled');

// ---------- 9. public producer directory ----------
const producers = await get('/producers', undefined);
check('GET /producers renders the seller directory', producers.status === 200 && /Sellers|producer/i.test(visible(producers.body)), `status=${producers.status}`);
const producersFiltered = await get('/producers?type=group', undefined);
check('producers filter returns a page, not an error', producersFiltered.status === 200 && visible(producersFiltered.body).length > 2000);
const producerDetail = await get('/producers/prof_artisan_basket', undefined);
check('public producer page renders', producerDetail.status === 200 && visible(producerDetail.body).length > 2000, `status=${producerDetail.status}`);
const buyerPage = await get('/producers/prof_tourist_visitor', undefined);
check('a buyer profile has no public producer page', buyerPage.status === 404, `status=${buyerPage.status}`);
const adminPage = await get('/producers/prof_admin', undefined);
check('an administrator profile has no public page', adminPage.status === 404, `status=${adminPage.status}`);

// ---------- 10. sign-in landing ----------
const landing = await get('/sign-in', tourist.cookie);
check('sign-in sends a signed-in buyer to /buyer', redirectedTo(landing, '/buyer'), `${landing.status} -> ${landing.location}`);
const landingProducer = await get('/sign-in', basket.cookie);
check('sign-in sends a producer to the seller dashboard', redirectedTo(landingProducer, '/dashboard'), `${landingProducer.status} -> ${landingProducer.location}`);

// ---------- 11. a suspended buyer keeps read access but loses every write ----------
async function postForm(path, cookie, fields) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
    redirect: 'manual'
  });
  return { status: res.status, location: res.headers.get('location') };
}

const unconfirmed = await postForm('/api/admin/status', admin.cookie, { profileId: 'prof_tourist_visitor', status: 'suspended' });
check('suspension without the confirm tick is refused', (unconfirmed.location ?? '').includes('error=') || unconfirmed.status >= 400, `${unconfirmed.status} -> ${unconfirmed.location}`);

const suspend = await postForm('/api/admin/status', admin.cookie, { profileId: 'prof_tourist_visitor', status: 'suspended', confirm: 'on' });
check('administrator can suspend an account', (suspend.location ?? '').includes('status='), `${suspend.status} -> ${suspend.location}`);

const suspendedRead = await get('/buyer', tourist.cookie);
check('suspended buyer can still read their own records', suspendedRead.status === 200, `status=${suspendedRead.status}`);

const suspendedWrite = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_basket_set',
  buyerName: 'Suspended account',
  buyerContact: 'x@example.test',
  quantity: 1,
  preference: 'pickup',
  message: 'A suspended account must not be able to send new inquiries.'
});
check('suspended buyer cannot send a new inquiry', suspendedWrite.status === 403, `status=${suspendedWrite.status} error=${suspendedWrite.json.error}`);

const suspendedStatus = await send('PATCH', `/api/inquiries/${inquiryB.id}`, tourist.cookie, { status: 'completed' });
check('suspended buyer cannot change arrangement status', suspendedStatus.status === 403, `status=${suspendedStatus.status}`);

const suspendedProfile = await send('PATCH', '/api/profile', tourist.cookie, { displayName: 'Changed while suspended' });
check('suspended buyer cannot edit their profile', suspendedProfile.status === 403, `status=${suspendedProfile.status}`);

const reactivate = await postForm('/api/admin/status', admin.cookie, { profileId: 'prof_tourist_visitor', status: 'active', confirm: 'on' });
check('administrator can reactivate the account', (reactivate.location ?? '').includes('status='), `${reactivate.status} -> ${reactivate.location}`);

const afterReactivation = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_basket_set',
  buyerName: 'Reactivated account',
  buyerContact: 'x@example.test',
  quantity: 1,
  preference: 'pickup',
  message: 'The same account works again once the suspension is lifted.'
});
check('reactivated buyer can send inquiries again', afterReactivation.status === 201, `status=${afterReactivation.status}`);

const selfSuspend = await postForm('/api/admin/status', tourist.cookie, { profileId: 'prof_hotel_buyer', status: 'suspended', confirm: 'on' });
check('a buyer cannot call the admin suspension endpoint', selfSuspend.status === 403 || (selfSuspend.location ?? '').includes('access-denied'), `${selfSuspend.status} -> ${selfSuspend.location}`);


// ---------- 11. interface language ----------
// The preference is a cookie read while rendering, so asking for a page with the
// cookie already set is exactly what a returning visitor gets after a reload.
const languageChecks = [
  { code: 'zh-Hans', htmlLang: 'zh-Hans', marker: '产品', note: 'simplified chinese renders and stays selected' },
  { code: 'it', htmlLang: 'it', marker: 'Prodotti', note: 'italian renders and stays selected' },
  { code: 'am', htmlLang: 'am', marker: 'ምርቶች', note: 'the amharic draft renders where wording exists' },
  { code: 'hamer', htmlLang: 'en', marker: 'Products', note: 'hamer has no dictionary so the page renders in English while the preference stays' },
  { code: 'dag', htmlLang: 'en', marker: 'Products', note: 'dasenech falls back to English and keeps its own document language honest' },
  { code: 'tsamai', htmlLang: 'en', marker: 'Products', note: 'tsamai falls back to English and keeps its own document language honest' }
];

for (const { code, htmlLang, marker, note } of languageChecks) {
  const page = await get('/', `omonettab_lang=${code}`);
  const selectedOption = new RegExp(`value="${code}"[^>]*selected`).test(page.body);
  check(
    note,
    page.status === 200 &&
      page.body.includes(`<html lang="${htmlLang}"`) &&
      visible(page.body).includes(marker) &&
      selectedOption,
    `status=${page.status} lang=${htmlLang} marker=${visible(page.body).includes(marker)} selected=${selectedOption}`
  );
}

// The site-wide demo banner and the language-draft strip were removed from the
// public chrome, so no page may print either of their wordings in any locale.
const removedNotices = [
  'This preview runs in demo mode',
  'is a machine draft that has not been reviewed',
  'Unreviewed text is shown in English',
  'No verified Hamer translation exists yet',
  'No verified Dasenech translation exists yet',
  'No verified Tsamai translation exists yet'
];
for (const [route, code] of [['/', 'en'], ['/products', 'en'], ['/listings/lst_basket_set', 'it'], ['/contact', 'am']]) {
  const page = await get(route, `omonettab_lang=${code}`);
  const found = removedNotices.filter((s) => visible(page.body).includes(s));
  check(
    `${route} in ${code} prints neither the demo banner nor the language-draft notice`,
    page.status === 200 && found.length === 0,
    `status=${page.status} found=${found.join(' | ')}`
  );
}

const forgedLanguage = await get('/', 'omonettab_lang=fr');
check(
  'an unknown language cookie cannot switch the site and does not break it',
  forgedLanguage.status === 200 && forgedLanguage.body.includes('<html lang="en"') && visible(forgedLanguage.body).includes('Products'),
  `status=${forgedLanguage.status}`
);

const noCookie = await get('/', undefined);
check('the default language is English', noCookie.status === 200 && noCookie.body.includes('<html lang="en"'), `status=${noCookie.status}`);

const zhListing = await get('/listings/lst_basket_set', 'omonettab_lang=zh-Hans');
check(
  'a translated listing page keeps the price and the honest demo label',
  zhListing.status === 200 && visible(zhListing.body).includes('示例手织储物篮套装') && visible(zhListing.body).includes('125.00'),
  `status=${zhListing.status}`
);

const itListing = await get('/listings/lst_basket_set', 'omonettab_lang=it');
check(
  'the Italian listing page keeps the per-item sample and unverified labels',
  itListing.status === 200 && visible(itListing.body).includes('Dati di esempio') && visible(itListing.body).includes('Non verificato'),
  `status=${itListing.status} sample=${visible(itListing.body).includes('Dati di esempio')} unverified=${visible(itListing.body).includes('Non verificato')}`
);

// ---------- collective order: the customer panel ----------
// The group order page offers the participating producers' own listings to buy
// from. Prices and limits must come from the record, not from the visitor.
const groupPage = await get('/collective-orders/col_honey_bulk', tourist.cookie);
const gp = visible(groupPage.body);
check('the group order page offers a product to buy with the seller\'s published price',
  groupPage.status === 200 &&
    gp.includes('Buy from this group order') &&
    gp.includes('Choose a product') &&
    gp.includes('Sample forest honey') &&
    gp.includes('68.00'),
  `status=${groupPage.status} panel=${gp.includes('Buy from this group order')} price=${gp.includes('68.00')}`);

const groupPageGuest = await get('/collective-orders/col_honey_bulk');
check('a visitor with no account can still see the products in the group order',
  groupPageGuest.status === 200 && visible(groupPageGuest.body).includes('Buy from this group order'),
  `status=${groupPageGuest.status}`);

const groupInquiry = await send('POST', '/api/inquiries', tourist.cookie, {
  listingId: 'lst_forest_honey',
  buyerName: 'Group order buyer',
  buyerContact: 'group.buyer@example.test',
  quantity: 8,
  preference: 'pickup',
  message: 'Smoke test inquiry sent from the group order panel.'
});
const groupInquiryRecord = groupInquiry.json.inquiry ?? {};
check('the inquiry the panel sends is stored and gets a real reference',
  groupInquiry.status === 201 && typeof groupInquiryRecord.reference === 'string' && groupInquiryRecord.reference.length > 0,
  `status=${groupInquiry.status} reference=${groupInquiryRecord.reference}`);

const groupInquiryPage = await get(`/buyer/inquiries/${groupInquiryRecord.id}`, tourist.cookie);
check('the buyer can open that inquiry record and see its status',
  groupInquiryPage.status === 200 && visible(groupInquiryPage.body).includes(groupInquiryRecord.reference),
  `status=${groupInquiryPage.status}`);

const buyerContributes = await send('POST', '/api/collective/col_honey_bulk/contribute', tourist.cookie, {
  quantity: 10,
  note: 'A buyer should not be able to commit stock.'
});
check('a buyer cannot commit stock to a group order', buyerContributes.status === 403,
  `status=${buyerContributes.status} error=${buyerContributes.json.error}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('FAILING:');
  for (const f of failed) console.log(` - ${f.name} ${f.detail ?? ''}`);
  process.exitCode = 1;
}
