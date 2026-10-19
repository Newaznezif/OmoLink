import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import { BrandLogo } from './brand-logo';

const exploreLinks: { href: string; key: TranslationKey }[] = [
  { href: '/products', key: 'nav.products' },
  { href: '/tourism', key: 'footer.tourismServices' },
  { href: '/collective-orders', key: 'nav.collective' },
  { href: '/pricing-tool', key: 'nav.pricing' },
  { href: '/impact', key: 'footer.impact' }
];

const communityLinks: { href: string; key: TranslationKey }[] = [
  { href: '/how-it-works', key: 'nav.how' },
  { href: '/community-guidelines', key: 'footer.guidelines' },
  { href: '/privacy', key: 'footer.privacy' },
  { href: '/offline', key: 'footer.offline' },
  { href: '/contact', key: 'nav.contact' }
];

export async function SiteFooter() {
  const settings = await getRepo().getSiteSettings();
  const demo = isDemoMode();
  const t = getT();

  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <BrandLogo className="h-16 w-auto md:h-24" />
          <p className="mt-3 text-sm text-ink-700">
            {demo ? t('footer.demoModeNote') : t('footer.liveModeNote')}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">{t('nav.explore')}</h3>
          <ul className="space-y-1 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">{t('footer.community')}</h3>
          <ul className="space-y-1 text-sm">
            {communityLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">{t('nav.contact')}</h3>
          {settings.contactEmail ? (
            <p className="text-sm text-ink-700">
              <a href={`mailto:${settings.contactEmail}`} className="underline font-semibold">
                {settings.contactEmail}
              </a>
            </p>
          ) : (
            <p className="text-sm text-ink-700">
              {t('footer.contactLead')}
              <Link href="/contact" className="underline font-semibold">
                {t('footer.contactFormLink')}
              </Link>
              {t('footer.contactTail')}
            </p>
          )}
          {settings.contactPhone && <p className="text-sm text-ink-700 mt-2">{settings.contactPhone}</p>}
          {settings.addressNote && <p className="text-sm text-ink-700 mt-2">{settings.addressNote}</p>}
          {settings.socialLinks.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {settings.socialLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} className="hover:underline" rel="me noopener" target="_blank">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 text-xs text-ink-500 flex flex-wrap gap-4">
          <span>{t('footer.copyright', { year: new Date().getFullYear(), siteName: settings.siteName })}</span>
          {demo && <span>{t('footer.sampleDataNote')}</span>}
          <span>{t('footer.workflowNote')}</span>
          {settings.footerNote && <span>{settings.footerNote}</span>}
        </div>
      </div>
    </footer>
  );
}
