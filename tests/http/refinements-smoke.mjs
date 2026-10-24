// App & UI refinement suite (demo mode, read-only).
//   npm run build && npm run start
//   SMOKE_BASE=http://localhost:3000 node tests/http/refinements-smoke.mjs
//
// It covers the four public surfaces this pass changed — the icon set, the
// header, the guide page and the footer — plus the notices that were removed and
// the disclosures that had to survive being removed.
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function get(path, lang = 'en') {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: `omonettab_lang=${lang}` },
    redirect: 'manual'
  });
  const body = res.status < 400 ? await res.text() : '';
  return { status: res.status, type: res.headers.get('content-type') ?? '', body };
}

// Scripts and styles are removed before any text assertion: the RSC payload
// repeats copy that is not rendered, so only visible text is scanned.
function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function headerHtml(html) {
  return html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
}

function footerHtml(html) {
  return html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
}

function toText(html) {
  return visible(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------- 1. every icon is the real logo and resolves ----------
const ICONS = ['/favicon.ico', '/icon.svg', '/icons/icon-32.png', '/icons/icon-48.png', '/icons/icon-180.png', '/icons/icon-192.png', '/icons/icon-512.png'];
for (const path of ICONS) {
  const res = await fetch(`${BASE}${path}`);
  const type = res.headers.get('content-type') ?? '';
  check(`${path} is served`, res.ok && /image\/(png|svg[+]xml|x-icon|vnd[.]microsoft[.]icon)/.test(type), `status=${res.status} type=${type}`);
}

const svg = await get('/icon.svg');
check('the SVG icon embeds the supplied logo rather than drawing a letter', svg.body.includes('data:image/png;base64,') && !/<text\b/i.test(svg.body), svg.body.slice(0, 80));
check('the SVG icon keeps the brand name in its accessible label', svg.body.includes('OmoNetTab'), 'no aria-label');

const home = await get('/');
const head = home.body.match(/<head[\s\S]*?<\/head>/)?.[0] ?? '';
check('the page head declares the PNG icon, not the old letter mark', head.includes('/icons/icon-32.png') && head.includes('/icons/icon-180.png'), (head.match(/<link[^>]*rel="icon"[^>]*>/g) ?? []).join(' '));
check('the page head declares the SVG icon', head.includes('/icon.svg'), (head.match(/<link[^>]*icon\.svg[^>]*>/) ?? ['no svg link'])[0]);
check('the manifest is linked', head.includes('/manifest.webmanifest'), (head.match(/<link[^>]*manifest[^>]*>/) ?? ['no manifest link'])[0]);
check('no head link still points at a letter-O favicon', !/favicon-letter/.test(head) && !/<text\b/.test(svg.body), (head.match(/<link[^>]*icon[^>]*>/g) ?? []).join(' '));

const manifest = await get('/manifest.webmanifest');
const manifestJson = JSON.parse(manifest.body || '{}');
const declaredIcons = (manifestJson.icons ?? []).map((i) => i.src);
check(
  'the manifest ships PNG icons at 192 and 512 from the real logo',
  declaredIcons.includes('/icons/icon-192.png') && declaredIcons.includes('/icons/icon-512.png'),
  declaredIcons.join(', ')
);
for (const icon of manifestJson.icons ?? []) {
  const res = await fetch(`${BASE}${icon.src}`);
  check(`manifest icon ${icon.src} resolves`, res.ok, `status=${res.status}`);
}

// The logo the icons were cut from is still the brand asset used on the pages.
const logoFile = await fetch(`${BASE}/images/branding/logo.png`);
check('the source logo is still served for the wordmark', logoFile.ok, `status=${logoFile.status}`);

// ---------- 2. the header: Guide label, no sellers link, no status chip ----------
const header = headerHtml(home.body);
const headerText = toText(header);
check('the header uses the short Guide label', header.includes('href="/how-it-works"') && headerText.includes('Guide'), headerText.slice(0, 120));
check('the header no longer links to the seller directory', !/href="\/producers"/.test(header), header.match(/href="\/producers"/)?.[0] ?? 'no /producers link in the header');
check('the header no longer prints an online/offline status', !/\bOnline\b|\bOffline\b/.test(headerText), headerText.match(/\bOnline\b|\bOffline\b/)?.[0] ?? 'no status word in the header');
check('the header no longer carries the globe glyph', !header.includes('\u{1F310}'), header.includes('\u{1F310}') ? 'a globe is present' : 'no globe in the header');
check('the header row wraps instead of pushing the page sideways', /flex-wrap/.test(header) && /min-h-16/.test(header), header.match(/class="[^"]*"/)?.[0] ?? 'no header row');
check('the language control is capped to the space it is given', /min-w-0/.test(header) && /truncate/.test(header), header.match(/<select[^>]*>/)?.[0]?.slice(0, 130) ?? 'no select');
check('the header still links to the pricing tool', header.includes('href="/pricing-tool"'), header.match(/href="\/pricing-tool"/)?.[0] ?? 'pricing link missing');
check('the header exposes one accessible mobile menu control', /aria-expanded="false"/.test(header) && /aria-controls=/.test(header) && /\bMenu\b/.test(headerText), header.match(/aria-expanded="false"[^>]*aria-controls="[^"]*"/)?.[0]?.slice(0, 90) ?? 'no menu button');
check('the mobile menu control targets a real panel', (() => {
  const id = header.match(/aria-controls="([^"]+)"/)?.[1];
  return Boolean(id) && home.body.includes(`id="${id}"`);
})(), 'aria-controls points nowhere');

// The seller routes still work even though the header stopped advertising them.
for (const path of ['/producers', '/producers/prof_gado_gofa', '/register', '/sign-in', '/onboarding']) {
  const res = await get(path);
  check(`${path} still responds after the header change`, res.status === 200, `status=${res.status}`);
}
async function signIn(userId) {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const raw = res.headers.getSetCookie?.().join('; ') ?? res.headers.get('set-cookie') ?? '';
  const pair = raw.split(',').map((s) => s.trim().split(';')[0]).find((s) => s.includes('='));
  if (!res.ok || !pair) throw new Error(`sign-in ${userId} -> ${res.status}`);
  return pair;
}

const producerCookie = await signIn('demo_user_basket');
const signedHeader = headerHtml(await (await fetch(`${BASE}/`, { headers: { cookie: producerCookie } })).text());
check('a signed-in seller still gets a header route to their area', signedHeader.includes('href="/dashboard"'), toText(signedHeader).slice(0, 140));
for (const path of ['/dashboard', '/dashboard/listings', '/dashboard/listings/new', '/dashboard/inquiries', '/dashboard/settings']) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie: producerCookie } });
  const body = res.status < 400 ? await res.text() : '';
  check(`${path} still serves a signed-in seller`, res.status === 200 && /<html/.test(body), `status=${res.status}`);
}
const anonymous = await get('/dashboard');
check('a signed-out visitor is still turned away from the seller dashboard', [302, 307].includes(anonymous.status) || /sign.i|sign-in|Sign in/i.test(toText(anonymous.body)), `status=${anonymous.status}`);

// ---------- 3. the guide page is a selectable step sequence ----------
const guide = visible((await get('/how-it-works')).body);
const tabs = [...guide.matchAll(/role="tab"/g)].length;
const panels = [...guide.matchAll(/role="tabpanel"/g)].length;
check('the guide exposes a tablist', guide.includes('role="tablist"'), 'no tablist');
check('the guide exposes one tab per step', tabs === 6, `${tabs} tabs`);
check('the guide exposes one panel', panels === 1, `${panels} panels`);
check('exactly one step is selected', (guide.match(/aria-selected="true"/g) ?? []).length === 1 && (guide.match(/aria-selected="false"/g) ?? []).length === 5, 'selection state wrong');
check('the selected tab owns the panel', /aria-selected="true"[^>]*aria-controls="how-panel"|aria-controls="how-panel"[^>]*aria-selected="true"/.test(guide), 'no aria-controls link');
check('the panel names its controlling tab', /role="tabpanel"[^>]*aria-labelledby="how-tab-0"/.test(guide), 'panel is unlabelled');
check('the panel is focusable', /role="tabpanel"[^>]*tabindex="0"/.test(guide), 'panel not focusable');
check('the first step cannot go further back', guide.includes('disabled=""'), 'previous is enabled on step 1');
check('the guide states the position', /\bStep 1 of 6\b/.test(toText(guide)), toText(guide).match(/Step[^\d]*\d+[^\d]*\d+/)?.[0] ?? 'no position');
check('the guide labels its step group', guide.includes('aria-label="Guide steps"') || toText(guide).includes('Guide steps'), 'no group label');
check('every step tab carries its own number', [...guide.matchAll(/font-black[^>]*>([1-6])</g)].map((m) => m[1]).join('') === '123456', [...guide.matchAll(/font-black[^>]*>([1-6])</g)].map((m) => m[1]).join(''));
check('the open step is numbered in its heading', /<h3[^>]*><span[^>]*>1\s*\./.test(guide), guide.match(/<h3[\s\S]{0,80}/)?.[0] ?? 'no heading');
check('the guide prints no raw translation key', !/\bhow\.[a-zA-Z]/.test(toText(guide)), toText(guide).match(/\bhow\.[a-zA-Z]+/)?.[0] ?? '');

// ---------- 4. removed notices, kept disclosures ----------
const PUBLIC_PAGES = ['/', '/products', '/tourism', '/collective-orders', '/how-it-works', '/team', '/impact', '/contact', '/privacy', '/community-guidelines', '/pricing-tool', '/producers'];
const REMOVED = [
  ['the footer demo-mode banner', /Running in demo mode with sample listings/i],
  ['the footer live-mode banner', /Connected to a Supabase project/i],
  ['the pilot-verification caveat', /still (being )?designed for the pilot/i],
  ['the development-mode framing', /\bunder development\b|\bstill under construction\b/i]
];
for (const path of PUBLIC_PAGES) {
  const text = toText((await get(path)).body);
  for (const [label, pattern] of REMOVED) {
    check(`${path} shows no ${label}`, !pattern.test(text), text.match(pattern)?.[0] ?? '');
  }
}

const listingText = toText((await get('/listings/lst_chele_bracelet')).body);
check('a listing still states that an inquiry is not a payment', listingText.includes('Nothing here is a payment.'), 'payment disclosure removed');
check('a listing still states that prices carry no hidden fees', listingText.includes('no hidden fees'), 'pricing disclosure removed');
const sampleText = toText((await get('/listings/lst_forest_honey')).body);
check('a sample fixture is still labelled as sample data', /sample/i.test(sampleText), 'sample label removed');
const directoryText = toText((await get('/producers')).body);
check('a seller page still shows its verification status', /Unverified|Verified|Pending review/i.test(directoryText), 'verification status missing');
const privacyText = toText((await get('/privacy')).body);
check('the privacy page still discloses how data is handled', privacyText.includes('cookie') || privacyText.includes('Cookies') || privacyText.includes('data'), 'privacy copy gone');
const homeText = toText(home.body);
check('the homepage notice states the verification and payment facts without pilot framing', /unverified/i.test(homeText) && /no payment is taken/i.test(homeText) && !/pilot build/i.test(homeText), homeText.match(/[^.]*unverified[^.]*\./i)?.[0] ?? 'notice absent');
for (const path of ['/', '/contact']) {
  const text = toText((await get(path)).body);
  check(`${path} publishes no placeholder address`, !/@[A-Za-z0-9.-]*\.example\b/.test(text), text.match(/@[A-Za-z0-9.-]*\.example\b/)?.[0] ?? '');
}

// ---------- 5. the footer only links to confirmed destinations ----------
const footer = footerHtml(home.body);
const footerLinks = [...footer.matchAll(/<a\b([^>]*)>/g)].map((m) => ({ attrs: m[1] }));
const external = footerLinks.filter((l) => /href="(https?:)?\/\//.test(l.attrs));
check('the footer links to the supplied LinkedIn profile', footer.includes('https://www.linkedin.com/in/newaz-nezif-285439262'), footer.match(/linkedin[^"]*/)?.[0] ?? 'no link');
check('the footer links to the supplied Telegram handle', footer.includes('https://t.me/n53e65w27a07z'), footer.match(/t\.me[^"]*/)?.[0] ?? 'no link');
for (const link of external) {
  const href = link.attrs.match(/href="([^"]+)"/)?.[1] ?? '';
  check(`external footer link ${href} opens safely`, /rel="[^"]*noopener/.test(link.attrs) && /target="_blank"/.test(link.attrs), link.attrs);
}
check('the footer invents no email address', !/mailto:/.test(footer), footer.match(/mailto:[^"]*/)?.[0] ?? '');
check('the footer invents no Instagram or Facebook destination', !/instagram\.com|facebook\.com/i.test(footer), footer.match(/instagram\.com[^"]*|facebook\.com[^"]*/i)?.[0] ?? '');
check('every external footer link is described for assistive tech', external.every((l) => /aria-label=/.test(l.attrs)), 'an icon link has no label');
const footerText = toText(footer);
check('the footer still states that no payment provider is connected', /payment provider/i.test(footerText), footerText.slice(-160));

// ---------- 6. locale coverage for the new chrome ----------
for (const [lang, label] of [['en', 'Guide'], ['it', 'Guida'], ['zh-Hans', '指南']]) {
  const page = await get('/', lang);
  check(`${lang}: the header shows ${label}`, toText(headerHtml(page.body)).includes(label), toText(headerHtml(page.body)).slice(0, 90));
}
const zhGuide = toText((await get('/how-it-works', 'zh-Hans')).body);
check('zh-Hans: the guide body is translated', zhGuide.includes('指南') && !/[A-Za-z]{6}/.test(zhGuide.match(/第 1 步[^\n]{0,40}/)?.[0] ?? ''), zhGuide.slice(0, 60));
const itGuide = toText((await get('/how-it-works', 'it')).body);
check('it: the guide body is translated', itGuide.includes('Guida') || itGuide.includes('passaggio'), itGuide.slice(0, 60));
// Amharic has no verified entry for the new keys, so it must fall back honestly.
const amGuide = toText((await get('/how-it-works', 'am')).body);
check('am: the guide falls back to English rather than an invented translation', amGuide.includes('Browse freely'), amGuide.slice(0, 60));
const amKeys = [...amGuide.matchAll(/\b(?:how|nav|footer|language)\.[a-zA-Z]+/g)].map((m) => m[0]);
check('am: no raw translation key is printed', amKeys.length === 0, amKeys.slice(0, 3).join(','));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('FAILING:');
  for (const f of failed) console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  process.exitCode = 1;
}
