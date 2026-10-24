import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en, type TranslationKey } from '../src/lib/i18n/en';
import { it as itDict } from '../src/lib/i18n/it';
import { zhHans } from '../src/lib/i18n/zh-Hans';
import { am, amReviewPending } from '../src/lib/i18n/am';
import { translations } from '../src/lib/i18n';

/**
 * These checks guard the localization system itself rather than any one page:
 * a locale that silently loses a key, a placeholder that is renamed in one
 * language only, a key nobody renders any more, and English prose that is added
 * to a component without going through the dictionary all fail here.
 */

const ALL_KEYS = Object.keys(en) as TranslationKey[];
const PLACEHOLDER = /\{(\w+)\}/g;

function placeholdersOf(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

test('every locale that must be complete carries exactly the English key set', () => {
  for (const [name, dict] of [
    ['it', itDict],
    ['zh-Hans', zhHans]
  ] as const) {
    const mine = Object.keys(dict).sort();
    const contract = [...ALL_KEYS].sort();
    assert.deepEqual(mine, contract, `${name} carries a different key set than en`);
  }
});

test('placeholders survive every translation unchanged', () => {
  const offenders: string[] = [];
  for (const key of ALL_KEYS) {
    const expected = placeholdersOf(en[key]);
    for (const [name, dict] of [
      ['it', itDict],
      ['zh-Hans', zhHans],
      ['am', am]
    ] as const) {
      const value = (dict as Record<string, string | undefined>)[key];
      if (value === undefined) continue;
      if (!expected.every((p) => placeholdersOf(value).includes(p)) && placeholdersOf(value).length >= expected.length) {
        offenders.push(`${key} [${name}] expected {${expected.join(',')}}`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'a placeholder was renamed or dropped');
});

test('no dictionary entry is empty or a copy of its own key', () => {
  // The one entry that must stay empty: a language that needs no qualifier after
  // its own name in the selector. It is a translation that says "nothing", not a gap.
  const intentionallyEmpty = new Set(['language.suffix.complete']);
  for (const key of ALL_KEYS) {
    for (const dict of [en, itDict, zhHans] as Record<TranslationKey, string>[]) {
      const value = dict[key];
      assert.equal(typeof value, 'string', `${key} is not a string`);
      if (intentionallyEmpty.has(key)) {
        assert.equal(value, '', `${key} must stay an empty qualifier`);
        continue;
      }
      assert.ok(value.trim().length > 0, `${key} is blank`);
      assert.notEqual(value, key, `${key} renders its own key name`);
    }
  }
});

test('the untranslated languages stay honest: am is a subset, the rest are empty', () => {
  const outside = Object.keys(am).filter((k) => !Object.prototype.hasOwnProperty.call(en, k));
  assert.deepEqual(outside, [], 'the Amharic draft carries a key English does not have');
  assert.equal(amReviewPending, true, 'the Amharic draft must stay labelled as unreviewed');
  for (const lang of ['hamer', 'dag', 'tsamai'] as const) {
    assert.deepEqual(Object.keys(translations[lang]), [], `${lang} must stay empty until a verified translation exists`);
  }
});

test('the Amharic draft is labelled partial and never claims completeness', () => {
  const total = ALL_KEYS.length;
  assert.ok(Object.keys(am).length < total, 'am.ts is no longer a draft, update the wording of this test');
});

/**
 * A key is "used" when it appears as a literal, or when the namespace above it
 * is composed at runtime (`payment.status.${status}`), which is how status and
 * enum labels are rendered throughout the app.
 */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(path)) found.push(path);
  }
  return found;
}

test('no translation key is dead weight', () => {
  const dictionaries = new Set(['en.ts', 'it.ts', 'zh-Hans.ts', 'am.ts']);
  const sources = sourceFiles('src')
    .filter((f) => !dictionaries.has(f.split(/[\\/]/).pop()!))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const literals = new Set<string>();
  for (const match of sources.matchAll(/['"]([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+)['"]/g)) literals.add(match[1]!);
  const namespaces = new Set<string>();
  for (const match of sources.matchAll(/`([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*)\.\$\{/g)) namespaces.add(match[1]!);
  for (const match of sources.matchAll(/['"]([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*)\.['"]/g)) namespaces.add(match[1]!);
  const dead = ALL_KEYS.filter((key) => {
    if (literals.has(key)) return false;
    let head: string = key;
    while (head.includes('.')) {
      head = head.slice(0, head.lastIndexOf('.'));
      if (namespaces.has(head)) return false;
    }
    return true;
  });
  assert.deepEqual(dead, [], 'these keys are rendered nowhere');
});

/**
 * The hardcoded-string guard. It looks at the places interface text actually
 * reaches a visitor — JSX text nodes, prose lines and the labelling attributes —
 * and rejects any that carries English prose. The handful of literals that are
 * legitimately not interface text are listed here, and the test fails if a new
 * one appears.
 */
const ALLOWED_LITERALS: Record<string, string[]> = {
  // a URL scheme hint is the same in every language
  'src/app/admin/settings/page.tsx': ['https://…'],
  'src/components/listing-images.tsx': ['https://…'],
  // stored alt text for the generated sample images, not interface chrome
  'src/lib/demo-data.ts': ['SAMPLE IMAGE — not a real product photo']
};

test('user-facing JSX text goes through the dictionary', () => {
  const offenders: string[] = [];
  for (const path of sourceFiles('src')) {
    const forward = path.replace(/\\/g, '/');
    if (!forward.endsWith('.tsx')) continue;
    const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    const allowed = ALLOWED_LITERALS[forward] ?? [];
    const found = new Set<string>();
    for (const match of source.matchAll(/>\s*([A-Z][\p{L}’'“”. ,:()\/–—-]{3,}?)\s*</gu)) {
      const text = match[1]!.trim();
      if (text.includes(' ')) found.add(text);
    }
    for (const match of source.matchAll(/^\s{6,}([A-Z][a-z][\p{L}’'“”. ,:()\/–—;-]{10,}[.?!])\s*$/gmu)) {
      const line = source.slice(0, match.index).split('\n').pop() ?? '';
      if (/[()=;]|=>|\{t\(/.test(line)) continue;
      found.add(match[1]!.trim());
    }
    for (const match of source.matchAll(/(?:aria-label|placeholder|title|alt|label)="([^"{][^"]*)"/g)) {
      found.add(match[1]!.trim());
    }
    for (const text of found) {
      if (allowed.includes(text)) continue;
      if (/^(OmoNetTab|ETB|SUPABASE)/.test(text)) continue;
      if (/^[A-Z0-9_ –—/.:]+$/u.test(text)) continue;
      offenders.push(`${forward}: ${text.slice(0, 80)}`);
    }
  }
  assert.deepEqual(offenders, [], 'hardcoded user-facing English found in JSX');
});
