// Administrator verification suite (demo mode).
// Start a fresh dev server first: this suite suspends, re-roles and edits sample
// accounts, so a second run against the same process can fail on stale state.
//   npm run dev
//   SMOKE_BASE=http://localhost:3000 node tests/http/admin-smoke.mjs
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
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location'), body: res.status < 400 ? await res.text() : '' };
}

async function postForm(path, cookie, fields) {
  const body = new URLSearchParams(fields).toString();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual'
  });
  return { status: res.status, location: res.headers.get('location') };
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const admin = await signIn('demo_user_admin');
check('demo admin sign-in', admin.profile.profile.role === 'admin', JSON.stringify(admin.profile));

const pages = [
  ['/admin', 'Administration overview'],
  ['/admin/users', 'Accounts'],
  ['/admin/roles', 'Roles'],
  ['/admin/listings', 'Listing moderation'],
  ['/admin/categories', 'Categories'],
  ['/admin/verifications', 'Verification queue'],
  ['/admin/reviews', 'Review moderation'],
  ['/admin/reports', 'Reported listings'],
  ['/admin/orders', 'Arrangements'],
  ['/admin/messages', 'Contact messages'],
  ['/admin/opportunities', 'Group orders'],
  ['/admin/homepage', 'Homepage'],
  ['/admin/settings', 'Site settings'],
  ['/admin/analytics', 'Platform activity'],
  ['/admin/audit-logs', 'Audit log']
];

function visible(html) {
  // The RSC flight payload legitimately contains "$undefined" markers, so only
  // the rendered document is inspected.
  return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
}

for (const [path, needle] of pages) {
  const res = await get(path, admin.cookie);
  const text = visible(res.body);
  check(`GET ${path}`, res.status === 200 && text.includes(needle), `status=${res.status}`);
  if (/undefined|NaN|\[object Object\]/.test(text)) check(`GET ${path} clean render`, false, 'stray undefined/NaN in visible HTML');
}

// Filters actually filter.
const filtered = await get('/admin/listings?state=archived&q=zzzznomatch', admin.cookie);
check('listings filter returns empty state', /No listing matches/.test(filtered.body), `status=${filtered.status}`);
const analyticsFiltered = await get('/admin/audit-logs?action=role_changed', admin.cookie);
check('audit log filter renders', analyticsFiltered.status === 200, `status=${analyticsFiltered.status}`);

// Non-admins are kept out of the whole area.
for (const [userId, label] of [['demo_user_tourist', 'tourist/buyer'], ['demo_user_basket', 'producer']]) {
  const session = await signIn(userId);
  const res = await get('/admin/settings', session.cookie);
  check(`${label} blocked from /admin/settings`, res.status === 307 || res.status === 302, `-> ${res.location}`);
  const post = await postForm('/api/admin/settings', session.cookie, { siteName: 'Hijacked', accentColor: '#b2542a' });
  check(`${label} cannot POST admin settings`, post.status === 401 || post.status === 403, `status=${post.status}`);
}

// Bad values are refused on the server, not silently saved.
const badColor = await postForm('/api/admin/settings', admin.cookie, {
  back: '/admin/settings',
  siteName: 'OmoLink',
  accentColor: 'rebeccapurple',
  announcementEnabled: 'on',
  announcementText: ''
});
check('invalid accent + empty announcement refused', decodeURIComponent(badColor.location ?? '').includes('Not saved'), badColor.location);

const goodSave = await postForm('/api/admin/settings', admin.cookie, {
  back: '/admin/settings',
  siteName: 'OmoLink',
  tagline: 'A community marketplace for South Omo producers, guides and buyers.',
  contactEmail: 'hello@omolink.example',
  accentColor: '#b2542a',
  announcementText: ''
});
check('valid settings save accepted', (goodSave.location ?? '').includes('status='), goodSave.location);

const afterSave = await get('/admin/settings', admin.cookie);
check('saved contact email appears on settings page', afterSave.body.includes('hello@omolink.example'), '');
const contact = await get('/contact', '');
check('contact page shows the configured email', contact.body.includes('hello@omolink.example'), `status=${contact.status}`);

// Listing moderation round-trip through the real endpoint.
const listings = await get('/admin/listings', admin.cookie);
const idMatch = [...listings.body.matchAll(/name="listingId" value="([^"]+)"/g)].map((m) => m[1]);
const targetId = idMatch[0];
if (targetId) {
  const feature = await postForm('/api/admin/listings', admin.cookie, { back: '/admin/listings', listingId: targetId, action: 'feature' });
  check('feature action redirects with outcome', (feature.location ?? '').includes('status='), feature.location);
  const unfeature = await postForm('/api/admin/listings', admin.cookie, { back: '/admin/listings', listingId: targetId, action: 'unfeature' });
  check('unfeature action redirects with outcome', (unfeature.location ?? '').includes('status='), unfeature.location);
  const noConfirm = await postForm('/api/admin/listings', admin.cookie, { back: '/admin/listings', listingId: targetId, action: 'archive' });
  check('archive without confirmation refused', decodeURIComponent(noConfirm.location ?? '').toLowerCase().includes('confirm'), noConfirm.location);
} else {
  check('listing id found for moderation round-trip', false, 'no listingId input in admin listings HTML');
}

// Homepage save keeps at least one section visible.
const homepage = await get('/admin/homepage', admin.cookie);
const sections = [...homepage.body.matchAll(/name="section_([a-z_]+)"/g)].map((m) => m[1]);
check('homepage editor lists every section', sections.length === 9, `${sections.length} checkboxes`);
const allOff = Object.fromEntries([
  ['back', '/admin/homepage'],
  ['heroTitle', 'Sell directly. Price transparently. Deliver together.'],
  ['heroDescription', 'OmoLink connects producers, artisan groups, and local guides in the South Omo area with visitors, shops, hotels and institutions.']
]);
const offRes = await postForm('/api/admin/homepage', admin.cookie, allOff);
check('homepage cannot be emptied', decodeURIComponent(offRes.location ?? '').includes('Keep at least one'), offRes.location);

const onFields = { back: '/admin/homepage', heroTitle: 'Sell directly. Price transparently. Deliver together.', heroDescription: 'Shorter description.' };
for (const id of sections) onFields[`section_${id}`] = 'on';
const saveRes = await postForm('/api/admin/homepage', admin.cookie, onFields);
check('homepage save accepted', (saveRes.location ?? '').includes('status='), saveRes.location);

// Audit log recorded the privileged writes above, without secrets.
const audit = await get('/admin/audit-logs', admin.cookie);
check('audit log shows the settings save', audit.body.includes('site settings') || audit.body.includes('Site settings'), '');
check('audit log shows role-free listing moderation', /listing/.test(audit.body.replace(/<[^>]+>/g, ' ')), '');
const auditText = visible(audit.body);
// Prose legitimately names the categories of secret that are never stored, so
// look for an actual credential shape (a JWT) or an env value instead.
check('audit log leaks no credential value', !/eyJ[A-Za-z0-9_-]{15,}/.test(auditText), '');
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  check('audit log omits the configured anon key', !auditText.includes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), '');
}

// Public pages still render after the settings change.
for (const path of ['/', '/products', '/tourism', '/collective-orders', '/how-it-works', '/impact', '/pricing-tool', '/offline', '/producers', '/sign-in', '/register', '/community-guidelines', '/privacy']) {
  const res = await get(path, '');
  check(`GET ${path}`, res.status === 200, `status=${res.status}`);
}

const notFound = await get('/definitely-not-a-page', '');
check('custom not-found responds 404', notFound.status === 404, `status=${notFound.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) console.log('FAILING:\n' + failed.map((f) => ` - ${f.name} (${f.detail})`).join('\n'));
