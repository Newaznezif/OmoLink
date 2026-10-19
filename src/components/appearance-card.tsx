import { getLanguage } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { getTheme } from '@/lib/theme-server';
import { resolveTheme } from '@/lib/theme';
import type { Profile } from '@/lib/types';
import { Card, CardBody } from './ui';
import { ThemeControl } from './theme-control';

/**
 * The appearance block used on every role's settings page.
 *
 * The value it shows is the account's own saved choice when the profile has one,
 * and the browser's cookie otherwise — so signing in on a fresh browser displays
 * the scheme the account asked for, not the default. A profile with no stored
 * theme is shown as the current device choice rather than silently rewritten to
 * light, because "never asked" and "asked for light" are different facts.
 */
export function AppearanceCard({ profile }: { profile?: Profile }) {
  const lang = getLanguage();
  const theme = resolveTheme({ accountTheme: profile?.theme, deviceTheme: getTheme() });

  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">{t(lang, 'settings.theme')}</h2>
        <p className="mt-2 text-sm text-ink-700">{t(lang, 'settings.themeIntro')}</p>
        <div className="mt-3">
          <ThemeControl lang={lang} value={theme} />
        </div>
      </CardBody>
    </Card>
  );
}
