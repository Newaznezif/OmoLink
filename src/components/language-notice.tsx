import { getLanguage } from '@/lib/i18n/server';
import { CATALOG_LANGUAGES, CATALOG_REVIEWED } from '@/lib/i18n/catalog';
import { coverageFor, languageStatus, t } from '@/lib/i18n';
import { languageOption } from '@/lib/language';

/**
 * Says out loud what the current language can and cannot do, so an incomplete
 * dictionary is never presented as a finished translation. The claims are
 * computed from the dictionaries themselves, not typed in by hand.
 */
export function LanguageNotice() {
  const lang = getLanguage();
  if (lang === 'en') return null;

  const { reviewPending } = coverageFor(lang);
  const name = languageOption(lang).native;
  const status = languageStatus(lang);
  const messages: string[] = [];

  if (status === 'not_available') {
    messages.push(t(lang, 'language.notice.none', { language: name }));
  } else if (status === 'partial') {
    messages.push(t(lang, 'language.notice.draft', { language: name }));
  } else if (reviewPending) {
    messages.push(t(lang, 'language.notice.unreviewed', { language: name }));
  }

  if (!CATALOG_REVIEWED && CATALOG_LANGUAGES.includes(lang)) {
    messages.push(t(lang, 'language.notice.catalog', { language: name }));
  }

  // Even a complete dictionary only covers the public marketplace.
  messages.push(t(lang, 'language.notice.areas', { language: name }));

  return (
    <div className="bg-clay-50 text-clay-800 text-xs md:text-sm px-4 py-2 border-b border-ink-100">
      <p className="mx-auto max-w-6xl">{messages.join(' ')}</p>
    </div>
  );
}
