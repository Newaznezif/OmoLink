import { isDemoMode } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { Actor } from '@/lib/session';
import type { LanguageCode } from '@/lib/types';

/**
 * Tells the person what kind of session they are in, and blocks nothing by
 * itself — authorization lives in requireRole() and in the repository.
 */
export function AccountBanner({ actor, lang }: { actor: Actor; lang: LanguageCode }) {
  return (
    <div className="space-y-3">
      {actor.status === 'suspended' && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>{t(lang, 'shell.suspendedLead')}</strong>
          {' '}
          {t(lang, 'shell.suspendedBody')}
          <a href="/contact" className="underline font-semibold">{t(lang, 'shell.contactPageLink')}</a>
          {t(lang, 'shell.suspendedTail')}
        </div>
      )}
      {isDemoMode() && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {t(lang, 'shell.demoModeNote')}
        </p>
      )}
    </div>
  );
}
