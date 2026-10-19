import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  LANGUAGE_OPTIONS,
  documentLangFor,
  isLanguageCode,
  languageOption,
  safeLanguageCode
} from '../src/lib/language';
import { SUPPORTED_LANGUAGES, type Category, type LanguageCode, type Listing } from '../src/lib/types';
import { REVIEW_PENDING_LANGUAGES, coverageFor, languageStatus, languageSuffixKey, t, translations } from '../src/lib/i18n';
import { en, type TranslationKey } from '../src/lib/i18n/en';
import { CATALOG_REVIEWED, categoryTexts, listingTexts } from '../src/lib/i18n/catalog';

const ALL_KEYS = Object.keys(en) as TranslationKey[];

test('the preference is stored in a cookie, not only in the browser', () => {
  assert.equal(LANGUAGE_COOKIE, 'omonettab_lang');
  assert.equal(DEFAULT_LANGUAGE, 'en');
});

test('an unknown or forged language value falls back to English', () => {
  for (const value of ['', 'fr', 'EN', 'en-US', 'drop table', '汉', 'zz', undefined, null, 42, ['en']]) {
    assert.equal(safeLanguageCode(value), 'en', `expected ${String(value)} to fall back`);
  }
  assert.equal(isLanguageCode('zh-Hans'), true);
  assert.equal(isLanguageCode('zh'), false);
});

test('seven languages are offered and every one is selectable', () => {
  assert.deepEqual([...SUPPORTED_LANGUAGES].sort(), [...LANGUAGE_OPTIONS.map((o) => o.code)].sort());
  assert.equal(LANGUAGE_OPTIONS.length, 7);
  assert.deepEqual(
    LANGUAGE_OPTIONS.map((o) => o.code),
    ['en', 'am', 'zh-Hans', 'it', 'hamer', 'dag', 'tsamai']
  );
  // A dead option would be a broken button: nothing in the registry may be
  // marked unselectable, and each code needs a display name.
  for (const option of LANGUAGE_OPTIONS) {
    assert.ok(option.native.length > 0);
    assert.ok(option.english.length > 0);
  }
});

test('no BCP 47 tag is invented for Hamer, Dasenech or Tsamai', () => {
  // Their pages are genuinely English, so that is what is announced.
  for (const code of ['hamer', 'dag', 'tsamai'] as LanguageCode[]) {
    assert.equal(documentLangFor(code), 'en');
  }
  assert.equal(documentLangFor('en'), 'en');
  assert.equal(documentLangFor('am'), 'am');
  assert.equal(documentLangFor('zh-Hans'), 'zh-Hans');
  assert.equal(documentLangFor('it'), 'it');
  assert.equal(
    LANGUAGE_OPTIONS.every((o) => o.rtl === false),
    true,
    'no offered language is right-to-left'
  );
  assert.equal(languageOption('hamer').documentLang, 'en');
});

test('English, Chinese and Italian cover every interface key', () => {
  for (const code of ['en', 'zh-Hans', 'it'] as LanguageCode[]) {
    const coverage = coverageFor(code);
    assert.equal(coverage.translated, coverage.total, `${code} should cover every key`);
    assert.equal(coverage.ratio, 1);
    assert.equal(languageStatus(code), 'complete');
  }
  for (const key of ALL_KEYS) {
    assert.ok(t('zh-Hans', key).length > 0 || key === 'language.suffix.complete');
    assert.ok(t('it', key).length > 0 || key === 'language.suffix.complete');
  }
});

test('Amharic is reported as a partial draft, never as finished', () => {
  const coverage = coverageFor('am');
  assert.ok(coverage.translated > 0, 'Amharic carries some reviewed terms');
  assert.ok(coverage.translated < coverage.total);
  assert.equal(languageStatus('am'), 'partial');
  assert.equal(coverage.reviewPending, true);
  assert.equal(languageSuffixKey('am'), 'language.suffix.draft');
});

test('the local languages are selectable with an empty, honestly labelled dictionary', () => {
  for (const code of ['hamer', 'dag', 'tsamai'] as LanguageCode[]) {
    assert.deepEqual(translations[code], {});
    assert.equal(coverageFor(code).translated, 0);
    assert.equal(languageStatus(code), 'not_available');
    assert.equal(languageSuffixKey(code), 'language.suffix.none');
    // Asking for wording must not fabricate any: it returns the English string.
    assert.equal(t(code, 'nav.products'), en['nav.products']);
  }
});

test('a complete dictionary is still flagged until a speaker reviews it', () => {
  assert.deepEqual([...REVIEW_PENDING_LANGUAGES].sort(), ['am', 'it', 'zh-Hans']);
  assert.equal(languageSuffixKey('zh-Hans'), 'language.suffix.unreviewed');
  assert.equal(languageSuffixKey('it'), 'language.suffix.unreviewed');
  assert.equal(coverageFor('zh-Hans').reviewPending, true);
  // English is the source language, so it is the only one not awaiting review.
  assert.equal(coverageFor('en').reviewPending, false);
  assert.equal(languageSuffixKey('en'), 'language.suffix.complete');
});

test('missing wording falls back to English instead of rendering a bare key', () => {
  const missingKey = ALL_KEYS.find((key) => translations.am[key] === undefined);
  assert.ok(missingKey, 'the Amharic draft must leave at least one key untranslated');
  assert.equal(t('am', missingKey), en[missingKey]);
  assert.equal(t('hamer', 'nav.products'), en['nav.products']);
  assert.ok(t('am', 'brand.tagline').length > 0);
});

test('placeholders are filled and an unmatched token is left visible', () => {
  assert.equal(t('en', 'listing.minOrder', { count: 6, unit: 'item' }), 'Min 6 item');
  assert.equal(t('en', 'listing.minOrder', { unit: 'kg' }), 'Min {count} kg');
  assert.equal(t('en', 'listing.minOrder'), 'Min {count} {unit}');
  assert.equal(t('zh-Hans', 'common.membersSample', { count: 4 }).includes('4'), true);
});

const demoCategory = {
  id: 'cat_handicraft',
  slug: 'handicraft',
  name: 'Handicraft',
  description: 'Baskets, jewellery, pottery, woodwork and other handmade items.'
} as Category;

const demoListing = {
  id: 'lst_basket_set',
  title: 'Sample handwoven storage basket set (3 sizes)',
  description: 'Sample listing text.'
} as Listing;

test('catalogue text keeps the producer wording when nothing is reviewed', () => {
  for (const code of ['en', 'am', 'hamer', 'dag', 'tsamai'] as LanguageCode[]) {
    const category = categoryTexts(code, demoCategory);
    assert.equal(category.name.text, demoCategory.name);
    assert.equal(category.name.translated, false);
    const listing = listingTexts(code, demoListing);
    assert.equal(listing.title.text, demoListing.title);
    assert.equal(listing.description.text, demoListing.description);
  }
});

test('a catalogue entry is used when it exists, and says it is unreviewed', () => {
  const zh = categoryTexts('zh-Hans', demoCategory);
  assert.notEqual(zh.name.text, demoCategory.name);
  assert.equal(zh.name.translated, true);
  const it = listingTexts('it', demoListing);
  assert.notEqual(it.title.text, demoListing.title);
  assert.equal(it.title.translated, true);
  // Nothing in this table has been checked by a speaker yet.
  assert.equal(CATALOG_REVIEWED, false);
});

test('a listing the catalogue has never heard of is shown exactly as published', () => {
  const unknown = { id: 'lst_9ff3a1', title: 'Real producer honey', description: 'Raw text' } as Listing;
  for (const code of ['zh-Hans', 'it'] as LanguageCode[]) {
    const copy = listingTexts(code, unknown);
    assert.equal(copy.title.text, 'Real producer honey');
    assert.equal(copy.title.translated, false);
    assert.equal(copy.description.text, 'Raw text');
  }
});
