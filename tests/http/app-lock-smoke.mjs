// App lock suite (demo mode, read-only).
//   npm run build && npm run start
//   SMOKE_BASE=http://localhost:3000 node tests/http/app-lock-smoke.mjs
//
// What this can prove, stated plainly: the app lock is a Supabase-mode feature, and
// this deployment runs in demo mode, so every check below is that the feature is
// *absent and says so* rather than imitated. Nothing here exercises WebAuthn, an
// unlock window, or the lock password — those need a project with migration 0008
// applied, a real phone, and a fingerprint. The README lists what is still untested.
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function raw(path, init) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  const body = res.status < 400 || res.status === 409 ? await res.text() : '';
  return { status: res.status, location: res.headers.get('location'), cookies: res.headers.getSetCookie?.() ?? [], body };
}

function lockCookieSet(cookies) {
  return cookies.some((line) => line.includes('omonettab_app_lock='));
}

function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function signIn(userId) {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error(`sign-in ${userId} -> ${res.status}`);
  const pair = (res.headers.getSetCookie?.()[0] ?? '').split(';')[0];
  return { cookie: pair, session: res.headers.getSetCookie?.() ?? [] };
}

const seller = await signIn('demo_user_basket');
const CHECK = { cookie: `${seller.cookie}; omonettab_lang=en` };

// ---------- 1. demo mode mints no envelope, for anybody ----------
const home = await raw('/');
check('a public page sets no lock envelope', home.status === 200 && !lockCookieSet(home.cookies), `status=${home.status} cookies=${home.cookies.length}`);

const dash = await raw('/dashboard', { headers: CHECK });
check(
  'the seller dashboard renders as it did before the lock existed',
  dash.status === 200 && !lockCookieSet(dash.cookies) && visible(dash.body).length > 200,
  `status=${dash.status} envelope=${lockCookieSet(dash.cookies)}`
);

const anon = await raw('/dashboard', { headers: { cookie: 'omonettab_lang=en' } });
check(
  'an anonymous visit to the account area still goes to sign-in, not to the unlock screen',
  anon.status >= 300 && anon.status < 400 && /\/sign-in/.test(anon.location ?? ''),
  `status=${anon.status} location=${anon.location}`
);

// ---------- 2. the unlock screen refuses to be a stage ----------
const signedInUnlock = await raw('/unlock?next=%2Fdashboard', { headers: CHECK });
check(
  'a signed-in demo account is sent straight back from /unlock, because there is nothing to unlock',
  signedInUnlock.status >= 300 && signedInUnlock.status < 400 && signedInUnlock.location === '/dashboard',
  `status=${signedInUnlock.status} location=${signedInUnlock.location}`
);

const bareUnlock = await raw('/unlock', { headers: CHECK });
check(
  'a bookmarked /unlock with no destination lands on the site root rather than a dead screen',
  bareUnlock.status >= 300 && bareUnlock.status < 400 && bareUnlock.location === '/',
  `status=${bareUnlock.status} location=${bareUnlock.location}`
);

const anonUnlock = await raw('/unlock?next=%2Fdashboard');
check(
  'an anonymous /unlock goes to sign-in, never to a form that could not be answered',
  anonUnlock.status >= 300 && anonUnlock.status < 400 && /\/sign-in/.test(anonUnlock.location ?? ''),
  `status=${anonUnlock.status} location=${anonUnlock.location}`
);

const bootstrap = await raw('/api/app-lock/bootstrap?next=%2Fdashboard', { headers: CHECK });
const bootstrapPath = bootstrap.location ? new URL(bootstrap.location, BASE).pathname : '';
check(
  'the envelope bootstrap passes the session through instead of inventing a requirement',
  bootstrap.status >= 300 && bootstrap.status < 400 && bootstrapPath === '/dashboard' && !lockCookieSet(bootstrap.cookies),
  `status=${bootstrap.status} location=${bootstrap.location}`
);

// ---------- 3. every endpoint answers with the capability, not an imitation ----------
const ENDPOINTS = [
  ['POST', '/api/app-lock/unlock', { method: 'password', password: 'whatever12' }],
  ['POST', '/api/app-lock/lock', {}],
  ['POST', '/api/app-lock/settings', { enabled: true, method: 'password', password: 'whatever12' }],
  ['POST', '/api/app-lock/enroll/options', { label: 'This phone' }],
  ['POST', '/api/app-lock/enroll/verify', { response: {} }]
];

for (const [method, path, payload] of ENDPOINTS) {
  const res = await raw(path, { method, headers: { ...CHECK, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  let error = '';
  try {
    error = (JSON.parse(res.body) ?? {}).error ?? '';
  } catch {
    error = '(not JSON)';
  }
  check(
    `${method} ${path} says the lock is not available here`,
    res.status === 409 && /not available/i.test(error) && !lockCookieSet(res.cookies),
    `status=${res.status} error=${error.slice(0, 70)}`
  );
}

const credentials = await raw('/api/app-lock/credentials', { headers: CHECK });
const unlockOptions = await raw('/api/app-lock/unlock/options', { headers: CHECK });
check(
  'listing devices and asking for a challenge answer 409 rather than an empty success',
  credentials.status === 409 && unlockOptions.status === 409,
  `credentials=${credentials.status} options=${unlockOptions.status}`
);

// ---------- 4. a settings attempt cannot lock a demo account out ----------
const after = await raw('/dashboard', { headers: CHECK });
check(
  'the dashboard is still reachable after a rejected attempt to turn the lock on',
  after.status === 200 && !lockCookieSet(after.cookies),
  `status=${after.status} envelope=${lockCookieSet(after.cookies)}`
);

// ---------- 5. the settings page explains itself, with no dead controls ----------
const settings = await raw('/dashboard/settings', { headers: CHECK });
const settingsText = visible(settings.body);
check(
  'the settings page names the app lock and why it is not offered here',
  settings.status === 200 && /App lock/.test(settingsText) && /demo mode/.test(settingsText),
  settingsText.match(/App lock[^.]*\./)?.[0]?.slice(0, 140) ?? 'no app lock block'
);
const lockControls = (settingsText.match(/Turn the app lock on|Enroll this device|Save lock password/g) ?? []).concat(
  (settings.body.match(/api\/app-lock\/(settings|lock|enroll)/g) ?? [])
);
check(
  'no switch, form or button for the lock is rendered in demo mode',
  lockControls.length === 0,
  lockControls.slice(0, 3).join(',') || 'none found'
);
check(
  'the rest of the settings page survived: the appearance card is still there',
  /Appearance|theme/i.test(settingsText),
  settingsText.slice(0, 90)
);

// ---------- 6. the offline shell does not carry account pages ----------
const sw = await raw('/sw.js');
const swBody = sw.body;
check(
  'the service worker is served and is the cache version that excludes account pages',
  sw.status === 200 && swBody.includes('omonettab-shell-v3'),
  `status=${sw.status} ${(swBody.match(/omonettab-shell-v\d/) ?? ['(none)'])[0]}`
);
check(
  'account prefixes are declared, and every one of them is refused from the cache',
  /const ACCOUNT_PREFIXES = \[([^\]]*)\]/.test(swBody) &&
    ['/dashboard', '/buyer', '/admin', '/unlock'].every((p) => (swBody.match(/const ACCOUNT_PREFIXES = \[([^\]]*)\]/)?.[1] ?? '').includes(p)),
  (swBody.match(/const ACCOUNT_PREFIXES = \[[^\]]*\]/)?.[0] ?? 'missing').slice(0, 120)
);
const messageIndex = swBody.indexOf("addEventListener('message'");
const purgeBlock = messageIndex >= 0 ? swBody.slice(messageIndex, messageIndex + 700) : '';
check(
  'a relock message deletes cached account documents from every cache',
  purgeBlock.includes('omonettab:purge-account-cache') && purgeBlock.includes('isAccountPath') && purgeBlock.includes('cache.delete'),
  `${purgeBlock.slice(0, 46).replace(/\s+/g, ' ')}${purgeBlock ? '…' : '(no message listener)'}`
);

// ---------- 7. locale honesty for the new copy ----------
const zhUnlock = await raw('/unlock?next=%2Fdashboard', { headers: { cookie: 'omonettab_lang=zh-Hans' } });
check(
  'zh-Hans: the unlock screen still redirects an anonymous visitor to sign-in',
  zhUnlock.status >= 300 && zhUnlock.status < 400 && /\/sign-in/.test(zhUnlock.location ?? ''),
  `status=${zhUnlock.status} location=${zhUnlock.location}`
);
const zhSettings = visible((await raw('/dashboard/settings', { headers: { cookie: `${seller.cookie}; omonettab_lang=zh-Hans` } })).body);
check('zh-Hans: the app lock block is translated, not left as a key', zhSettings.includes('应用锁定') && !/appLock\./.test(zhSettings), zhSettings.slice(0, 80));
const amSettings = visible((await raw('/dashboard/settings', { headers: { cookie: `${seller.cookie}; omonettab_lang=am` } })).body);
check('am: the app lock block falls back to English rather than an invented translation', /App lock/.test(amSettings) && !/appLock\./.test(amSettings), amSettings.slice(0, 80));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('FAILING:');
  for (const f of failed) console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  process.exitCode = 1;
}
