import Link from 'next/link';
import { getRepo } from '@/lib/repo';
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
  { href: '/team', key: 'nav.team' },
  { href: '/community-guidelines', key: 'footer.guidelines' },
  { href: '/privacy', key: 'footer.privacy' },
  { href: '/offline', key: 'footer.offline' },
  { href: '/contact', key: 'nav.contact' }
];

/**
 * Only the two accounts the project supplied are listed here, and the accessible
 * name repeats the identifier rather than asserting who owns it. Instagram and
 * Facebook are absent because no official profile was given.
 */
const socialLinks: { href: string; key: TranslationKey; ariaKey: TranslationKey; path: string }[] = [
  {
    href: 'https://www.linkedin.com/in/newaz-nezif-285439262',
    key: 'footer.social.linkedin',
    ariaKey: 'footer.social.linkedinAria',
    path: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05A4.2 4.2 0 0 1 17.5 8.7c3.2 0 3.8 2 3.8 4.8V21h-4v-6.3c0-1.5-.3-2.6-1.7-2.6-1.4 0-1.9 1.1-1.9 2.5V21h-3.7V9Z'
  },
  {
    href: 'https://t.me/n53e65w27a07z',
    key: 'footer.social.telegram',
    ariaKey: 'footer.social.telegramAria',
    path: 'M21.5 4.3 2.9 11.4c-.9.3-.9 1.5 0 1.8l4.6 1.5 1.8 5.4c.2.7 1.1.9 1.6.3l2.5-2.6 4.6 3.4c.6.4 1.4.1 1.6-.6l3-15.1c.2-.9-.7-1.6-1.5-1.2ZM9 14.6l8.2-5.9c.3-.2.6.2.4.4l-6.5 6.1-.3 3.1-.1-3.7L20 7.6c.4-.3.1-.7-.3-.5L9 14.6Z'
  }
];

export async function SiteFooter() {
  const settings = await getRepo().getSiteSettings();
  const t = getT();

  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <BrandLogo className="h-16 w-auto md:h-24" />
          <p className="mt-3 text-sm text-ink-700">{settings.tagline}</p>
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
          <ul className="mt-3 flex flex-wrap gap-2">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(link.ariaKey)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-2.5 py-2 text-xs font-semibold text-ink-700 hover:bg-clay-50"
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="w-4 h-4" fill="currentColor">
                    <path d={link.path} />
                  </svg>
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
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
          <span>{t('footer.workflowNote')}</span>
          {settings.footerNote && <span>{settings.footerNote}</span>}
        </div>
      </div>
    </footer>
  );
}
