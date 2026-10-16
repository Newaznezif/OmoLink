import type { LanguageCode } from './types';

/**
 * OmoLink UI strings. Only English is complete. Amharic is a partial draft and
 * is clearly labelled review-pending in the UI. Hamer, Dasenech and Tsamai
 * have no verified translations yet — we surface that honestly rather than
 * fabricate text.
 */
export type TranslationSet = Record<string, string>;

const en: TranslationSet = {
  'nav.explore': 'Explore',
  'nav.products': 'Products',
  'nav.tourism': 'Tourism',
  'nav.collective': 'Collective orders',
  'nav.how': 'How it works',
  'nav.pricing': 'Pricing tool',
  'nav.dashboard': 'Dashboard',
  'nav.admin': 'Admin',
  'nav.signIn': 'Sign in',
  'nav.register': 'Register as producer',
  'brand.tagline': "Connecting South Omo's local producers to wider markets.",
  'hero.searchPlaceholder': 'Search products, services, producers…',
  'demo.banner': 'Demo mode — sample data, no real transactions.',
  'listing.inquire': 'Send inquiry',
  'listing.quantity': 'Quantity',
  'listing.subtotal': 'Estimated subtotal',
  'common.verified': 'Verified',
  'common.pending': 'Pending review',
  'common.unverified': 'Unverified'
};

const am: TranslationSet = {
  // Intentionally minimal. Amharic copy must be reviewed by competent speakers
  // before being published. We fall back to English for anything missing.
  '_status': 'review_pending'
};

export const translations: Record<LanguageCode, TranslationSet> = {
  en,
  am,
  hamer: {},
  dag: {},
  tsamai: {}
};

export const languageLabels: Record<
  LanguageCode,
  { english: string; native: string; status: 'complete' | 'partial' | 'not_available' }
> = {
  en: { english: 'English', native: 'English', status: 'complete' },
  am: { english: 'Amharic', native: 'አማርኛ', status: 'partial' },
  hamer: { english: 'Hamer', native: 'Hamer', status: 'not_available' },
  dag: { english: 'Dasenech', native: 'Dasenech', status: 'not_available' },
  tsamai: { english: 'Tsamai', native: 'Tsamai', status: 'not_available' }
};

export function t(lang: LanguageCode, key: string): string {
  const set = translations[lang] ?? translations.en;
  const value = set[key];
  if (value && !value.startsWith('review_pending')) return value;
  return translations.en[key] ?? key;
}
