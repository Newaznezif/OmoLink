import type { TranslationSet } from './en';

/**
 * Amharic is deliberately a *small* set of high-confidence interface terms, not a
 * full translation. `amReviewPending` is what makes the UI say so: whenever
 * Amharic is active the page shows a draft notice, and everything without an
 * entry here renders in English instead of pretending to be translated.
 *
 * The whole file must be reviewed and corrected by competent Amharic speakers
 * before it is presented to anyone in a pilot. Contributions are welcomed in the
 * shape of this file — see the README section on translations.
 */
export const amReviewPending = true;

export const am: Partial<TranslationSet> = {
  'common.search': 'ፈልግ',
  'common.any': 'ሁሉም',
  'common.viewAll': 'ሁሉንም ይመልከቱ',
  'common.interfaceLanguage': 'ቋንቋ',

  'nav.explore': 'አስደሰት',
  'nav.products': 'ምርቶች',
  'nav.tourism': 'ቱሪዝም',
  'nav.sellers': 'ሻጮች',
  'nav.collective': 'ጋራ ትዕዛዞች',
  'nav.how': 'እንዴት እንደሚሰራ',
  'nav.contact': 'ያግኙን',
  'nav.signIn': 'ግባ',
  'nav.signOut': 'ውጣ',
  'nav.register': 'ተመዝገብ',
  'nav.createAccount': 'መለያ ፍጠር',

  'status.verified': 'ተረጋግጧል',
  'status.pending': 'በማረጋገጥ ላይ',
  'status.unverified': 'አልተረጋገጠም',
  'status.available': 'አለ',
  'status.unavailable': 'የለም',
  'status.sampleData': 'ናሙና መረጃ',

  'listing.descriptionTitle': 'መግለጫ',
  'listing.unitPrice': 'የነጠላ ዋጋ',

  'inquiry.inquire': 'ጠያቅ ላክ',
  'inquiry.submit': 'ጠያቅ ላክ',
  'inquiry.subtotal': 'ንዑስ ድምር',
  'inquiry.nameLabel': 'ስምዎ ወይም ድርጅትዎ',

  'filter.category': 'ምድብ',
  'filter.community': 'ማህበረሰብ',

  'auth.email': 'ኢሜይል',
  'auth.password': 'የይለፍ ቃል',

  'footer.privacy': 'ግላዊነት',
  'footer.community': 'ማህበረሰብ'
};
