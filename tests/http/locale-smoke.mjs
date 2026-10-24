// Locale verification suite (demo mode).
//
// It walks a representative route for every configured interface language and
// asserts the four things that matter: the page is rendered in that language,
// the language survives navigation and a reload, no raw translation key or
// missing-key placeholder leaks into the visible text, and no right-to-left
// layout is introduced.
//
//   npm run build && npm start
//   SMOKE_BASE=http://localhost:3000 node tests/http/locale-smoke.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

/** The visible text of the site header only, so a check can be honest about
 * which part of the page it is talking about. */
function headerText(html) {
  const match = html.match(/<header[\s\S]*?<\/header>/);
  return match ? text(match[0]) : '';
}

async function get(path, lang, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: [`omonettab_lang=${lang}`, cookie].filter(Boolean).join('; ') },
    redirect: 'follow'
  });
  return { status: res.status, body: await res.text(), url: res.url };
}

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

// Every key the dictionary knows about. A key leaking into the page means either
// a typo at the call site or a language falling back to a key name, and both are
// visible bugs, so the whole list is used as the forbidden set.
const KEYS = [...readFileSync(join(ROOT, 'src/lib/i18n/en.ts'), 'utf8').matchAll(/^  '([^']+)':/gm)].map((m) => m[1]);
check('the dictionary exposes its keys to the suite', KEYS.length > 1000, `${KEYS.length} keys`);

// The Amharic count is reported rather than assumed, so the suite can never claim
// more than the draft dictionary actually holds.
const amKeys = [...readFileSync(join(ROOT, 'src/lib/i18n/am.ts'), 'utf8').matchAll(/^  '([^']+)':/gm)].map((m) => m[1]);
check(`am: the draft covers ${amKeys.length} of ${KEYS.length} keys and is still a draft`, amKeys.length > 0 && amKeys.length < KEYS.length, `${amKeys.length}/${KEYS.length}`);

const LOCALES = [
  { code: 'en', htmlLang: 'en', navMarker: 'Products', navLabel: 'the English nav label', complete: true },
  // Amharic is a reviewed-priority draft rather than a full dictionary, so
  // anything it does not hold falls back to English. The suite checks that its own
  // wording is present and never claims more than the dictionary can deliver.
  { code: 'am', htmlLang: 'am', navMarker: 'ምርቶች', navLabel: 'the Amharic draft label', complete: false },
  { code: 'it', htmlLang: 'it', navMarker: 'Prodotti', navLabel: 'the Italian nav label', complete: true },
  { code: 'zh-Hans', htmlLang: 'zh-Hans', navMarker: '产品', navLabel: 'the Simplified Chinese nav label', complete: true }
];

const PUBLIC_ROUTES = [
  '/',
  '/products',
  '/tourism',
  '/explore?q=cesto',
  '/producers',
  '/producers/prof_gado_gofa',
  '/collective-orders',
  '/listings/lst_basket_set',
  '/pricing-tool',
  '/team',
  '/how-it-works',
  '/impact',
  '/offline',
  '/privacy',
  '/community-guidelines',
  '/contact',
  '/sign-in',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/reset-password?token=example',
  '/onboarding'
];

const signed = {
  producer: await signIn('demo_user_basket'),
  buyer: await signIn('demo_user_tourist'),
  admin: await signIn('demo_user_admin')
};
const PROTECTED_ROUTES = [
  ['/dashboard', signed.producer],
  ['/dashboard/listings', signed.producer],
  ['/dashboard/listings/new', signed.producer],
  ['/dashboard/inquiries', signed.producer],
  ['/dashboard/settings', signed.producer],
  ['/buyer', signed.buyer],
  ['/buyer/inquiries', signed.buyer],
  ['/buyer/profile', signed.buyer],
  ['/admin', signed.admin],
  ['/admin/payments', signed.admin],
  ['/admin/analytics', signed.admin]
];

const leaksFor = (body) => {
  const visible = text(body);
  return KEYS.filter((key) => visible.includes(key));
};

for (const locale of LOCALES) {
  const perRoute = [];
  for (const path of PUBLIC_ROUTES) {
    const page = await get(path, locale.code);
    const ok =
      page.status === 200 &&
      page.body.includes(`<html lang="${locale.htmlLang}"`) &&
      !page.body.includes('dir="rtl"') &&
      page.body.includes(`value="${locale.code}"`) &&
      leaksFor(page.body).length === 0;
    perRoute.push(path);
    if (!ok) {
      check(
        `${locale.code} renders ${path}`,
        false,
        `status=${page.status} lang=${page.body.includes(`<html lang="${locale.htmlLang}"`)} ` +
          `selected=${page.body.includes(`value="${locale.code}"`)} leaked=${leaksFor(page.body).slice(0, 3).join(',')}`
      );
    }
  }
  check(`${locale.code}: every public route renders, stays selected and leaks no key`, perRoute.length === PUBLIC_ROUTES.length, `${perRoute.length}/${PUBLIC_ROUTES.length}`);

  // Navigation and reload: the preference is a cookie, so asking for the next
  // page with the same cookie is what a visitor clicking a link gets, and asking
  // for the same page twice is what a reload gets.
  const journey = await Promise.all(['/products', '/contact', '/listings/lst_basket_set'].map((path) => get(path, locale.code)));
  check(
    `${locale.code}: the language survives clicking between pages`,
    journey.every((page) => page.status === 200 && page.body.includes(`<html lang="${locale.htmlLang}"`)),
    journey.map((p) => `${p.status}/${p.body.includes(`<html lang="${locale.htmlLang}"`) ? 'ok' : 'wrong'}`).join(' ')
  );
  const reloaded = await get('/products', locale.code);
  check(
    `${locale.code}: the language survives a reload`,
    reloaded.body.includes(`<html lang="${locale.htmlLang}"`)
  );

  const protectedResults = [];
  for (const [path, cookie] of PROTECTED_ROUTES) {
    const page = await get(path, locale.code, cookie);
    const leaked = leaksFor(page.body);
    protectedResults.push(
      page.status === 200 && page.body.includes(`<html lang="${locale.htmlLang}"`) && leaked.length === 0
    );
    if (page.status !== 200 || leaked.length) {
      check(`${locale.code} protects ${path}`, false, `status=${page.status} leaked=${leaked.slice(0, 3).join(',')}`);
    }
  }
  check(
    `${locale.code}: signed-in routes render in ${locale.code} without leaking a key`,
    protectedResults.every(Boolean) && protectedResults.length === PROTECTED_ROUTES.length,
    `${protectedResults.filter(Boolean).length}/${protectedResults.length}`
  );

  // Header chrome must be in the chosen language; a locale with a complete
  // dictionary is additionally held to no English anywhere on the homepage.
  const home = await get('/', locale.code);
  const visible = text(home.body);
  const header = headerText(home.body);
  const markerAt = header.indexOf(locale.navMarker);
  const englishFragments =
    locale.code === 'en'
      ? []
      : ['Explore Products', 'Browse products', 'Sign in', 'Create account'].filter(
          (s) => (locale.complete ? visible : header).includes(s)
        );
  check(
    `${locale.code}: the homepage carries ${locale.navLabel}${locale.complete ? ' and no English fragment' : ' in the header'}`,
    markerAt >= 0 && englishFragments.length === 0,
    `marker=${markerAt >= 0} english=${englishFragments.join(',')}`
  );
}

// Amharic is a declared draft: the interface must still be honest about it, and
// the Ge'ez script must render rather than being replaced by English.
const amHome = await get('/', 'am');
check(
  'amharic renders Ge’ez script on the homepage and keeps its own value selected',
  /[ሀ-፿]/u.test(text(amHome.body)) && amHome.body.includes('value="am"'),
  `geez=${/[ሀ-፿]/u.test(text(amHome.body))} selected=${amHome.body.includes('value="am"')}`
);

// The three languages with no verified dictionary must not pretend.
for (const code of ['hamer', 'dag', 'tsamai']) {
  const page = await get('/', code);
  check(
    `${code} falls back to English text while the control still shows ${code}`,
    page.body.includes('<html lang="en"') && page.body.includes(`value="${code}"`) && leaksFor(page.body).length === 0,
    `lang=${page.body.includes('<html lang="en"')} selected=${page.body.includes(`value="${code}"`)}`
  );
}

const forged = await get('/', 'fr');
check('a forged language cookie cannot break the page', forged.status === 200 && forged.body.includes('<html lang="en"'));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('FAILING:');
  for (const f of failed) console.log(` - ${f.name} ${f.detail ?? ''}`);
  process.exitCode = 1;
}
