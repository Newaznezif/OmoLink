import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildSeed } from '../src/lib/demo-data';
import { listingTexts } from '../src/lib/i18n/catalog';
import { canSignInAsDemo } from '../src/lib/store';

/**
 * Guards on the real catalogue: the products, prices, sellers and photographs
 * transcribed from the notes producers supplied. That content is now public
 * facing, so a broken image path, an invented price or a leaked source document
 * is a defect a visitor would see.
 */

const PUBLIC_DIR = resolve(process.cwd(), 'public');
const seed = buildSeed();
const real = seed.listings.filter((l) => !l.isDemo);
const sample = seed.listings.filter((l) => l.isDemo);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const toUrl = (file: string) => '/' + relative(PUBLIC_DIR, file).replace(/\\/g, '/');
const imageSrcs = real.flatMap((l) => l.images.map((i) => i.src));
const referenced = new Set(imageSrcs);
const photosOnDisk = walk(join(PUBLIC_DIR, 'images', 'products')).map(toUrl);
const publicFiles = walk(PUBLIC_DIR).map(toUrl);

test('the catalogue carries the supplied products, not the old placeholders', () => {
  assert.equal(real.length, 21, '21 products and services were extracted from the producer notes');
  assert.ok(sample.length > 0, 'the labelled sample fixtures stay for the workflow tests');
  for (const listing of real) {
    assert.equal(listing.isDemo, false, `${listing.id} is real content and must not be tagged sample`);
    assert.equal(listing.verification, 'unverified', `${listing.id} has not been verified by anyone`);
    assert.equal(listing.published, true, listing.id);
    assert.ok(listing.title.length > 3, listing.id);
  }
});

test('prices are the whole-birr figures the producers quoted, in ETB', () => {
  for (const listing of real) {
    assert.equal(listing.unitPrice.currency, 'ETB', listing.id);
    assert.ok(listing.unitPrice.cents > 0, `${listing.id} carries no invented zero price`);
    assert.equal(listing.unitPrice.cents % 100, 0, `${listing.id} was quoted in whole birr`);
  }
  const cents = (id: string) => seed.listings.find((l) => l.id === id)!.unitPrice.cents;
  assert.equal(cents('lst_barabaso'), 30_000);
  assert.equal(cents('lst_kashi'), 300_000);
  assert.equal(cents('lst_chele_bracelet'), 20_000);
  assert.equal(cents('lst_kizo_lodge'), 350_000);
  assert.equal(cents('lst_alpha_omega_guest_house'), 60_000);
});

test('stock the producers did not record is shown as made to order, not as a number', () => {
  for (const listing of real) {
    assert.equal(listing.availability, 'made_to_order', `${listing.id} has no recorded stock count`);
    assert.equal(listing.availableQuantity, 0, `${listing.id} must not claim a quantity`);
    assert.equal(listing.minOrderQuantity, 1, listing.id);
    assert.ok(listing.pickupOptions.length > 0, `${listing.id} needs a line saying what is unknown`);
  }
});

test('every category and seller a listing names actually exists', () => {
  const categoryIds = new Set(seed.categories.map((c) => c.id));
  const profilesById = new Map(seed.profiles.map((p) => [p.id, p]));
  for (const listing of real) {
    assert.ok(categoryIds.has(listing.categoryId), `${listing.id} points at ${listing.categoryId}`);
    const seller = profilesById.get(listing.producerId);
    assert.ok(seller, `${listing.id} has a seller record`);
    assert.ok(seller!.role === 'producer' || seller!.role === 'coordinator', `${listing.id} is sold by a buying account`);
    assert.ok(seller!.categories.includes(listing.categoryId), `${listing.id} sits in a category its seller does not claim`);
  }
});

test('each real listing carries its own photographs, and every path resolves', () => {
  assert.equal(referenced.size, imageSrcs.length, 'a photograph is shared between two listings');
  for (const listing of real) {
    assert.ok(listing.images.length > 0, `${listing.id} has at least one image`);
    const ids = new Set(listing.images.map((i) => i.id));
    assert.equal(ids.size, listing.images.length, `${listing.id} reuses an image id`);
    for (const image of listing.images) {
      assert.ok(image.src.startsWith('/images/products/'), `${listing.id} uses ${image.src}, not a local product photo`);
      assert.ok(!/[A-Z]/.test(image.src), `${image.src} must be a lowercase, stable path`);
      assert.ok(existsSync(join(PUBLIC_DIR, image.src)), `${image.src} does not exist on disk`);
      assert.equal(image.isSample, false, `${image.src} is a real photograph, not a placeholder`);
      assert.equal(image.consentRecorded, true, image.src);
      assert.ok(image.alt.length >= 20, `${image.src} has no meaningful alt text`);
      assert.ok(!/\.docx?$/i.test(image.src), image.src);
    }
  }
  for (const listing of sample) {
    for (const image of listing.images) {
      assert.equal(image.isSample, true, `${listing.id} mixes real photographs and placeholders`);
    }
  }
});

test('nothing sits in public/ unreferenced, and no source document is served', () => {
  assert.deepEqual(photosOnDisk.filter((src) => !referenced.has(src)), [], 'orphan photographs in public/');
  assert.equal(photosOnDisk.length, 67);
  assert.deepEqual(publicFiles.filter((file) => /\.(docx?|odt|pdf|heic)$/i.test(file)), [], 'a document is published');
  assert.deepEqual(publicFiles.filter((file) => /(^|\/)Pictures\//.test(file)), [], 'the Pictures folder leaked into public/');
});

test('the extracted wording is the producers’ own and is never machine-translated', () => {
  const kashi = real.find((l) => l.id === 'lst_kashi')!;
  assert.ok(kashi.description.includes('kashi is worn by hamer women.'));
  assert.ok(kashi.description.includes('Made from: goat and bunny skin.'));
  const chele = real.find((l) => l.id === 'lst_chele_bracelet')!;
  assert.ok(chele.description.includes('Made of: beads, pumpkin seed and tongora (elastic).'));

  for (const lang of ['zh-Hans', 'it', 'am'] as const) {
    for (const listing of real) {
      const copy = listingTexts(lang, listing);
      assert.equal(copy.title.text, listing.title, `${listing.id} was rewritten for ${lang}`);
      assert.equal(copy.title.translated, false, `${listing.id} claims a translation nobody reviewed`);
      assert.equal(copy.description.text, listing.description, `${listing.id} description was rewritten for ${lang}`);
    }
  }
});

test('products that arrived without a seller name are held by a labelled placeholder', () => {
  const holding = seed.profiles.find((p) => p.id === 'prof_pilot_holding')!;
  assert.ok(holding.displayName.includes('producer not yet recorded'), holding.displayName);
  assert.ok(holding.shortBio.includes('no named seller'), holding.shortBio);
  const held = real.filter((l) => l.producerId === holding.id);
  assert.equal(held.length, 11, 'the products that reached us with no seller recorded');
  for (const listing of held) {
    assert.ok(listing.community.startsWith('Not recorded'), `${listing.id} claims a community nobody supplied`);
  }
});

test('a real person cannot be signed into through demo mode', () => {
  for (const profile of seed.profiles) {
    if (profile.isDemo) continue;
    assert.equal(canSignInAsDemo(profile.userId), false, `${profile.displayName} is a real account`);
  }
  assert.equal(canSignInAsDemo('demo_user_pilot_holding'), true, 'the holding account must be reachable to answer inquiries');
});

test('homepage promotion points at real listings that exist', () => {
  const byId = new Map(seed.listings.map((l) => [l.id, l]));
  const featured = [...seed.siteSettings.featuredProductIds, ...seed.siteSettings.featuredServiceIds];
  assert.ok(featured.length > 0);
  for (const id of featured) {
    const listing = byId.get(id);
    assert.ok(listing, `${id} is featured but does not exist`);
    assert.equal(listing!.featured, true, `${id} is in the homepage settings but not flagged`);
    assert.equal(listing!.isDemo, false, `${id} promotes a sample record over the real catalogue`);
  }
  for (const listing of seed.listings.filter((l) => l.featured)) {
    assert.ok(featured.includes(listing.id), `${listing.id} is flagged but not in the homepage settings`);
  }
  const producerIds = new Set(seed.profiles.map((p) => p.id));
  for (const id of seed.siteSettings.featuredProducerIds) assert.ok(producerIds.has(id), id);
});
