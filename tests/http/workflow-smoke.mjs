// Admin-to-public workflow suite (demo mode): one category and one listing are
// created, published, edited, unpublished and deactivated in that order, and the
// public answers are read back over HTTP after every step.
// Start a fresh server first — this suite mutates the in-memory demo store.
//   npm run build && npm start
//   SMOKE_BASE=http://localhost:3000 node tests/http/workflow-smoke.mjs
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
  return pair;
}

async function get(path, cookie = '') {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: 'manual' });
  return { status: res.status, body: await res.text() };
}

async function adminForm(fields) {
  const res = await fetch(`${BASE}/api/admin/categories`, {
    method: 'POST',
    headers: { cookie: admin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
    redirect: 'manual'
  });
  return { status: res.status, location: decodeURIComponent(res.headers.get('location') ?? '') };
}

async function json(method, path, cookie, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, parsed, text };
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const stamp = Date.now();
const catName = `Workflow category ${stamp}`;
const titleA = `Workflow basket ${stamp}`;
const titleB = `Workflow basket edited ${stamp}`;

const admin = await signIn('demo_user_admin');
check('administrator sign-in', admin.startsWith('omolink_demo_session='), admin);

// Category: created by an administrator, then read back through the public filter.
const saved = await adminForm({
  action: 'save',
  name: catName,
  slug: `workflow-category-${stamp}`,
  kind: 'both',
  description: 'Created to trace the admin-to-public workflow.',
  sortOrder: '99',
  active: 'on',
  back: '/admin/categories'
});
check('admin creates a category', saved.status === 303 && saved.location.includes('saved and visible'), `HTTP ${saved.status} ${saved.location}`);

const browseAll = await get('/products');
const option = [...browseAll.body.matchAll(/<option value="(cat_[^"]+)">\s*([^<]*?)\s*<\/option>/g)].find((m) => m[2].includes(catName));
const categoryId = option?.[1] ?? '';
check('the new category appears in the public category filter', !!option, option ? `id=${categoryId}` : `HTTP ${browseAll.status}`);

const filtered = await get(`/products?category=${categoryId}`);
check('the category filter responds', filtered.status === 200 && filtered.body.includes(catName), `HTTP ${filtered.status}`);

// Listing: created unpublished, so every public answer in between is observable.
const producer = await signIn('demo_user_basket');
const created = await json('POST', '/api/listings', producer, {
  title: titleA,
  description: 'A listing created to trace publish, edit and unpublish.',
  categoryId,
  kind: 'product',
  unitPriceEtb: '120.00',
  unitOfSale: 'basket',
  availableQuantity: 10,
  minOrderQuantity: 2,
  availability: 'available',
  pickupOptions: 'Agreed in town',
  deliveryAvailable: false,
  publish: false
});
const listingId = created.parsed?.listing?.id ?? '';
check('producer creates an unpublished listing', created.status === 201 && created.parsed?.listing?.published === false, `HTTP ${created.status} id=${listingId}`);

const hidden = await get(`/listings/${listingId}`);
check('an unpublished listing is 404 publicly', hidden.status === 404, `HTTP ${hidden.status}`);

const earlyInquiry = await json('POST', '/api/inquiries', '', {
  listingId,
  buyerName: 'Workflow Guest',
  buyerContact: 'guest@example.test',
  quantity: 2,
  preference: 'pickup',
  message: 'Attempting to inquire before the listing is published.'
});
check('an inquiry on an unpublished listing is refused', earlyInquiry.status === 400 && /not published/.test(earlyInquiry.parsed?.error ?? ''), `HTTP ${earlyInquiry.status} ${earlyInquiry.parsed?.error}`);

const published = await json('PATCH', `/api/listings/${listingId}`, producer, { published: true });
check('producer publishes the listing', published.status === 200 && published.parsed?.listing?.published === true, `HTTP ${published.status}`);

const live = await get(`/listings/${listingId}`);
check('the published listing renders publicly with the stored price', live.status === 200 && live.body.includes(titleA) && live.body.includes('120.00'), `HTTP ${live.status}`);

const inquiry = await json('POST', '/api/inquiries', '', {
  listingId,
  buyerName: 'Workflow Guest',
  buyerContact: 'guest@example.test',
  quantity: 2,
  preference: 'pickup',
  message: 'The same request, once the listing is published.'
});
check('a guest inquiry on the published listing is accepted', inquiry.status === 201 && !!inquiry.parsed?.inquiry?.reference, `HTTP ${inquiry.status} ref=${inquiry.parsed?.inquiry?.reference}`);

const edited = await json('PATCH', `/api/listings/${listingId}`, producer, { title: titleB, unitPriceEtb: '135.50' });
check('producer edits the published listing', edited.status === 200 && edited.parsed?.listing?.title === titleB, `HTTP ${edited.status}`);
const afterEdit = await get(`/listings/${listingId}`);
check(
  'the public page shows the edited title and price',
  afterEdit.body.includes(titleB) && afterEdit.body.includes('135.50') && !afterEdit.body.includes(titleA),
  `HTTP ${afterEdit.status}`
);

const unpublished = await json('PATCH', `/api/listings/${listingId}`, producer, { published: false });
check('producer unpublishes the listing', unpublished.status === 200 && unpublished.parsed?.listing?.published === false, `HTTP ${unpublished.status}`);
const goneAgain = await get(`/listings/${listingId}`);
check('the unpublished listing is 404 again', goneAgain.status === 404, `HTTP ${goneAgain.status}`);

// Authorization on the same record, from outside the owner.
const other = await signIn('demo_user_honey');
const trespass = await json('PATCH', `/api/listings/${listingId}`, other, { title: 'Rewritten by someone else' });
check('another producer cannot edit the listing', trespass.status === 403, `HTTP ${trespass.status} ${trespass.parsed?.error}`);

const anonymous = await json('PATCH', `/api/listings/${listingId}`, '', { published: true });
check('an anonymous write is refused', anonymous.status === 401 || anonymous.status === 403, `HTTP ${anonymous.status}`);

// Category retirement: hidden from browsing, but the records that use it stay.
const deactivated = await adminForm({
  action: 'save',
  id: categoryId,
  name: catName,
  slug: `workflow-category-${stamp}`,
  kind: 'both',
  description: 'Deactivated by the workflow suite.',
  sortOrder: '99',
  back: '/admin/categories'
});
check('admin deactivates the category', deactivated.status === 303 && deactivated.location.includes('hidden from browsing'), `HTTP ${deactivated.status} ${deactivated.location}`);
const browseAfter = await get('/products');
check('the deactivated category leaves the public filter', !browseAfter.body.includes(catName), `HTTP ${browseAfter.status}`);

const deleteAttempt = await adminForm({ action: 'delete', id: categoryId, confirm: 'on', back: '/admin/categories' });
check('deleting a category in use is refused', deleteAttempt.location.includes('error='), `HTTP ${deleteAttempt.status} ${deleteAttempt.location}`);

const ownerView = await get('/dashboard/listings', producer);
check('the listing still belongs to its producer', ownerView.status === 200 && ownerView.body.includes(titleB), `HTTP ${ownerView.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) console.log('FAILING:\n' + failed.map((f) => ` - ${f.name} (${f.detail})`).join('\n'));
