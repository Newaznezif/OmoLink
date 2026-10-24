// Real-catalogue verification suite (demo mode, read-only).
//   npm run build && npm run start
//   SMOKE_BASE=http://localhost:3000 node tests/http/catalogue-smoke.mjs
//
// Every check here is about content a visitor can see: the products producers
// supplied, their own photographs, their own wording, and the guarantee that no
// source document is reachable through the site.
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const body = res.status < 400 ? await res.text() : '';
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, location: res.headers.get('location'), body, type };
}

// Strips scripts and styles: the RSC flight payload legitimately repeats data
// that is not rendered, so only visible text is scanned.
function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

const CATALOGUE = [
  { id: 'lst_fota_menswear', title: 'Fota (menswear)', price: '1,200.00 ETB', phrase: 'worn by the hamer men', seller: 'Mr. Getachew Kafa', image: '/images/products/fota-men/fota-men-01-img-4516.jpg' },
  { id: 'lst_fota_womenswear', title: 'Fota (womenswear)', price: '1,200.00 ETB', phrase: 'wrapping it around the waist', seller: 'Mr. Getachew Kafa', image: '/images/products/fota-women/fota-women-01-img-4397-2.jpg' },
  { id: 'lst_barabaso', title: 'Barabaso', price: '300.00 ETB', phrase: 'firm grip making it practical', seller: 'Mr. Getachew Kafa', image: '/images/products/barabaso/barabaso-01-img-4407-3.jpg' },
  { id: 'lst_kashi', title: 'Kashi', price: '3,000.00 ETB', phrase: 'goat and bunny skin', seller: 'Mrs. Gado Gofa', image: '/images/products/kashi/kashi-01-img-4339.jpg' },
  { id: 'lst_borde', title: 'Borde', price: '100.00 ETB', phrase: 'Corn and Sorghum', seller: 'Mrs. Tate', image: '/images/products/borde/borde-01-img-4418-3.jpg' },
  { id: 'lst_kuri', title: 'Kuri', price: '2,000.00 ETB', phrase: 'medicinal factor', seller: 'OmoNetTab pilot holding account', image: '/images/products/kuri/kuri-01-img-4372-2.jpg' },
  { id: 'lst_chele_bracelet', title: 'Chele (beaded bracelet)', price: '200.00 ETB', phrase: 'pumpkin seed and tongora', seller: 'Mrs. Gado Gofa', image: '/images/products/chele-bracelet/chele-bracelet-01-img-4193-2.jpg' },
  { id: 'lst_shikini_necklace', title: 'Shikini (beaded necklace)', price: '200.00 ETB', phrase: 'beads and thread', seller: 'Mrs. Gado Gofa', image: '/images/products/shikini-necklace/shikini-necklace-01-img-4266.jpg' },
  { id: 'lst_artifact_hamer_boy', title: 'Hamer boy (handmade artifact)', price: '2,500.00 ETB', phrase: 'standing people watching', seller: 'OmoNetTab pilot holding account', image: '/images/products/artifact-hamer-boy/artifact-hamer-boy-01-img-4172-2.jpg' },
  { id: 'lst_artifact_mursi_woman', title: 'Mursi woman (handmade artifact)', price: '2,500.00 ETB', phrase: 'lower lip plate', seller: 'OmoNetTab pilot holding account', image: '/images/products/artifact-mursi-woman/artifact-mursi-woman-01-img-4152-3.jpg' },
  { id: 'lst_artifact_nyangatom_elder', title: 'Nyangatom elder (handmade artifact)', price: '2,500.00 ETB', phrase: 'dressed up for a special occasion', seller: 'OmoNetTab pilot holding account', image: '/images/products/artifact-nyangatom-elder/artifact-nyangatom-elder-01-img-4168.jpg' },
  { id: 'lst_artifact_tsemay_woman', title: 'Tsemay woman (handmade artifact)', price: '2,500.00 ETB', phrase: 'traditional attire', seller: 'OmoNetTab pilot holding account', image: '/images/products/artifact-tsemay-woman/artifact-tsemay-woman-01-img-4156-2.jpg' },
  { id: 'lst_artifact_tsemay_first_wife', title: 'Tsemay first wife (handmade artifact)', price: '2,500.00 ETB', phrase: 'this tsemay woman is the first wife', seller: 'OmoNetTab pilot holding account', image: '/images/products/artifact-tsemay-first-wife/artifact-tsemay-first-wife-01-img-4162-2.jpg' },
  { id: 'lst_big_shorka', title: 'Big shorka', price: '1,000.00 ETB', phrase: 'used to drink coffee, milk, water', seller: 'OmoNetTab pilot holding account', image: '/images/products/cutlery-big-shorka/cutlery-big-shorka-01-img-4312.jpg' },
  { id: 'lst_small_shorka', title: 'Small shorka', price: '1,000.00 ETB', phrase: 'Made from: pumpkin', seller: 'OmoNetTab pilot holding account', image: '/images/products/cutlery-small-shorka/cutlery-small-shorka-01-img-4316.jpg' },
  { id: 'lst_gebete', title: 'Gebete', price: '2,500.00 ETB', phrase: 'platter used to serve food', seller: 'OmoNetTab pilot holding account', image: '/images/products/cutlery-gebete/cutlery-gebete-01-img-4329.jpg' },
  { id: 'lst_gungulo', title: 'Gungulo', price: '300.00 ETB', phrase: 'spoon coffee', seller: 'OmoNetTab pilot holding account', image: '/images/products/cutlery-gungulo/cutlery-gungulo-01-img-4304-2.jpg' },
  { id: 'lst_kali', title: 'Kali', price: '500.00 ETB', phrase: 'spoon used to eat different kinds of food', seller: 'OmoNetTab pilot holding account', image: '/images/products/cutlery-kali/cutlery-kali-01-img-4326.jpg' },
  { id: 'lst_alpha_omega_guest_house', title: 'Alpha and Omega Guest House', price: '600.00 ETB', phrase: 'Can host 6 cars', seller: 'Alpha and Omega Guest House', image: '/images/products/alpha-omega-guest-house/alpha-omega-guest-house-01-img-4468-2.jpg' },
  { id: 'lst_kizo_lodge', title: 'Kizo Lodge', price: '3,500.00 ETB', phrase: 'Can host 20 cars', seller: 'Kizo Lodge', image: '/images/products/kizo-lodge/kizo-lodge-01-img-4482-4.jpg' },
  { id: 'lst_selhadin_pension', title: 'Selhadin Pension', price: '700.00 ETB', phrase: 'Can host 5 cars', seller: 'Selhadin Pension', image: '/images/products/selhadin-pension/selhadin-pension-01-img-4431-3.jpg' }
];

const GALLERIES = {
  lst_chele_bracelet: 15,
  lst_shikini_necklace: 3,
  lst_kashi: 3,
  lst_fota_womenswear: 3,
  lst_gebete: 3,
  lst_kali: 3
};

// ---------- 1. every real listing renders its own page ----------
const pages = new Map();
for (const item of CATALOGUE) {
  const res = await get(`/listings/${item.id}`);
  pages.set(item.id, res);
  const text = visible(res.body);
  // Everything above "Related listings" is this listing’s own content; the
  // related row below it legitimately carries the labelled sample fixtures.
  const own = text.split(/Related listings/)[0];
  check(`${item.id}: page renders`, res.status === 200, `status=${res.status}`);
  check(`${item.id}: shows its own title`, own.includes(item.title), item.title);
  check(`${item.id}: shows the producer’s own wording`, own.includes(item.phrase), item.phrase);
  check(`${item.id}: shows the price as quoted`, own.includes(item.price), own.match(/[\d,]+\.\d\d ETB/)?.[0] ?? 'no price found');
  check(`${item.id}: names its seller`, text.includes(item.seller), item.seller);
  // A real listing must not carry the per-record sample badge, while the
  // site-wide demo banner (header/footer) must stay exactly where it is.
  check(`${item.id}: its own page is not tagged as a sample record`, !own.includes('This record is sample data used for demonstration'), 'a real listing carries the sample badge');
  check(`${item.id}: says stock was not recorded`, own.includes('Stock was not recorded') || own.includes('Availability was not recorded'), 'no fallback wording');
  check(`${item.id}: primary photograph is referenced`, text.includes(item.image), item.image);
}

// Positive control for the check above: the labelled sample fixtures still
// carry their own badge. The site-wide "running in demo mode" footer banner was
// removed on purpose, so it must be gone while the disclosure that governs this
// page — an inquiry is not a payment — stays.
const fixturePage = visible((await get('/listings/lst_forest_honey')).body);
check('the sample fixture is still tagged as a sample record', fixturePage.includes('This record is sample data used for demonstration'), 'sample tag disappeared');
const kashiText = visible(pages.get('lst_kashi').body);
check('the site-wide demo-mode banner is gone from a listing page', !/Running in demo mode/i.test(kashiText), 'the banner is still printed');
check('the listing still says an inquiry is not a payment', kashiText.includes('Nothing here is a payment.'), 'the payment disclosure was removed');

// ---------- 2. no two products share a description or a gallery ----------
// The producer notes for the big and the small shorka were word-for-word
// identical, so that one collision is the data, not a template bug.
const described = new Map();
for (const item of CATALOGUE) {
  const text = pages.get(item.id)?.body.match(/<p class="whitespace-pre-line[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '';
  described.set(item.id, text);
  check(`${item.id}: description is rendered`, text.length > 80, `length=${text.length}`);
}
const byText = new Map();
for (const [id, text] of described) byText.set(text, [...(byText.get(text) ?? []), id]);
const collisions = [...byText.values()].filter((ids) => ids.length > 1);
check(
  'no two different products show the same description',
  collisions.length === 1 && collisions[0].length === 2 && collisions[0].includes('lst_big_shorka') && collisions[0].includes('lst_small_shorka'),
  JSON.stringify(collisions)
);
check('the two shorka sizes stay separate listings', visible(pages.get('lst_big_shorka').body).includes('Big shorka') && visible(pages.get('lst_small_shorka').body).includes('Small shorka'), 'shorka sizes merged');
for (const [id, count] of Object.entries(GALLERIES)) {
  const hits = [...pages.get(id).body.matchAll(/\/images\/products\//g)].length;
  check(`${id}: gallery carries ${count} photographs`, hits >= count, `srcs=${hits}`);
}

// ---------- 3. every photograph is served ----------
const srcs = new Set();
for (const res of pages.values()) {
  for (const match of res.body.matchAll(/\/images\/products\/[A-Za-z0-9._\/-]+\.jpg/g)) srcs.add(match[0]);
}
check('listing pages reference the full photograph set', srcs.size === 67, `${srcs.size} distinct photographs`);
let served = 0;
let badType = 0;
for (const src of srcs) {
  const res = await fetch(`${BASE}${src}`);
  if (res.ok) served += 1;
  if (!/image\/jpeg/.test(res.headers.get('content-type') ?? '')) badType += 1;
}
check('every photograph returns 200', served === srcs.size, `${served}/${srcs.size}`);
check('every photograph is served as JPEG', badType === 0, `${badType} with a wrong content type`);

// ---------- 4. source documents are unreachable ----------
for (const path of ['/Pictures', '/Pictures/Clothing/menswear', '/images/products/Pictures', '/Documents', '/source', '/supabase/seed.sql']) {
  let res = await get(path);
  // Next redirects a trailing-slash guess to the bare path; follow that once.
  if (res.status === 308 || res.status === 307) res = await get(res.location ?? path.replace(/\/$/, ''));
  check(`${path} is not published`, res.status === 404, `status=${res.status}`);
}
const docxProbe = await get('/images/products/lst_kashi.docx');
check('a guessed document path inside the image tree is a 404', docxProbe.status === 404, `status=${docxProbe.status}`);
const listingText = [...pages.values()].map((r) => visible(r.body)).join(' ');
check('no listing links to a document', !/\.docx?/i.test(listingText), 'a document link is present');

// ---------- 5. browse, category filters and search ----------
const products = await get('/products');
check('/products lists the real catalogue', products.status === 200 && visible(products.body).includes('Chele (beaded bracelet)'), `status=${products.status}`);
check('/products still labels the sample fixtures', visible(products.body).includes('Sample forest honey'), 'sample tag row missing');
const textiles = await get('/products?category=cat_textile');
const textileText = visible(textiles.body);
check('the textile filter shows the clothing', textileText.includes('Barabaso') && textileText.includes('Kashi'), 'clothing missing from its category');
check('the textile filter excludes jewellery', !textileText.includes('Chele (beaded bracelet)'), 'jewellery leaked into textiles');
const handicraft = visible((await get('/products?category=cat_handicraft')).body);
check('the handicraft filter shows woodwork and jewellery', handicraft.includes('Gebete') && handicraft.includes('Shikini'), 'handicraft items missing');
const tourism = visible((await get('/tourism?category=cat_tourism')).body);
check('the accommodation listings appear under tourism', tourism.includes('Kizo Lodge') && tourism.includes('Selhadin Pension'), 'lodges missing');
const search = visible((await get('/products?q=barabaso')).body);
check('search finds a product by its own name', search.includes('Barabaso'), 'no result');
const sellerSearch = visible((await get('/products?q=Gado%20Gofa')).body);
check('search finds products by seller name', sellerSearch.includes('Kashi'), 'seller search failed');
const priceFilter = visible((await get('/products?min=2000')).body);
check('the price filter still works on real prices', priceFilter.includes('Kashi') && !priceFilter.includes('Barabaso'), 'price filter wrong');
const emptyCategory = await get('/products?category=cat_other');
check('a category no supplied product belongs to still renders, not an error', emptyCategory.status === 200, `status=${emptyCategory.status}`);
const dairyOnly = visible((await get('/products?category=cat_dairy')).body);
check('a category with only a labelled fixture shows no real product', dairyOnly.includes('Sample clarified butter') && !dairyOnly.includes('Kashi'), 'category filter leaked real products');

// ---------- 6. homepage and producer pages ----------
const home = visible((await get('/')).body);
check('the homepage features real products', home.includes('Kashi') && home.includes('Chele'), 'featured products missing');
check('the homepage no longer claims everything is sample data', !home.includes('nothing here represents a real product'), 'stale hero copy');
check('the homepage names real sellers', home.includes('Mrs. Gado Gofa'), 'featured producer missing');
const sellerPage = visible((await get('/producers/prof_gado_gofa')).body);
check('a seller page lists their own products', sellerPage.includes('Kashi') && sellerPage.includes('Chele'), 'seller catalogue missing');
check('a seller page publishes the phone as supplied', sellerPage.includes('0919219830'), 'phone not shown');
const guide = visible((await get('/producers/prof_chufo_adey')).body);
check('a seller with no documented price is stated, not invented', guide.includes('No published listings yet'), 'guide page wrong');
const directory = visible((await get('/producers')).body);
check('the seller directory lists the pilot sellers', directory.includes('Kizo Lodge') && directory.includes('Mrs. Tate'), 'directory missing sellers');

// ---------- 7. the language selector leaves producer wording alone ----------
for (const lang of ['zh-Hans', 'it', 'am']) {
  const res = await fetch(`${BASE}/listings/lst_kashi`, { headers: { cookie: `omonettab_lang=${lang}` } });
  const text = visible(await res.text());
  check(`${lang}: the producer’s English wording is preserved`, text.includes('goat and bunny skin'), 'wording was rewritten');
  check(`${lang}: the interface around it is translated`, text.includes('价格') || text.includes('Prezzo') || text.includes('ዋጋ') || text.includes('Pricing and stock'), 'no translated chrome');
}

// ---------- 8. the inquiry path is open on a real listing ----------
const inquiry = await send('POST', '/api/inquiries', undefined, {
  listingId: 'lst_chele_bracelet',
  buyerName: 'Catalogue smoke',
  buyerContact: '+251 900 000 222',
  quantity: 1,
  preference: 'pickup',
  message: 'One bracelet to check the inquiry path.'
});
check('an inquiry on a real listing is accepted', inquiry.status === 201, `status=${inquiry.status} ${inquiry.json?.error ?? ''}`);

async function send(method, path, cookie, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} checks passed.`);
if (failures.length) {
  console.log('FAILED:');
  for (const f of failures) console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  process.exit(1);
}
