import Link from 'next/link';
import { getSessionActor } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n';
import type { Role } from '@/lib/types';
import { BrandLogo } from './brand-logo';
import { LanguageNotice } from './language-notice';
import { LanguageSelector } from './language-selector';
import { OfflineStatus } from './offline-status';

const links = [
  { href: '/explore', key: 'nav.explore' },
  { href: '/products', key: 'nav.products' },
  { href: '/tourism', key: 'nav.tourism' },
  { href: '/producers', key: 'nav.sellers' },
  { href: '/collective-orders', key: 'nav.collective' },
  { href: '/how-it-works', key: 'nav.how' },
  { href: '/pricing-tool', key: 'nav.pricing' },
  { href: '/contact', key: 'nav.contact' }
] as const;

/** Landing area for each role — a buyer never sees a selling dashboard link. */
function areaFor(role: Role): { href: string; key: 'nav.adminArea' | 'nav.myInquiries' | 'nav.myDashboard' } {
  if (role === 'admin') return { href: '/admin', key: 'nav.adminArea' };
  if (role === 'buyer') return { href: '/buyer', key: 'nav.myInquiries' };
  return { href: '/dashboard', key: 'nav.myDashboard' };
}

export async function SiteHeader() {
  const actor = await getSessionActor();
  const settings = await getRepo().getSiteSettings();
  const lang = getLanguage();
  const t = getT();

  return (
    <>
      <a href="#main" className="skip-link">
        {t('common.skipToMain')}
      </a>
      {isDemoMode() && (
        <div role="status" className="bg-ochre-100 text-ochre-700 text-xs px-4 py-1.5 text-center">
          {t('common.demoBanner')}
        </div>
      )}
      <LanguageNotice />
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="shrink-0" aria-label={t('nav.homeAria', { siteName: settings.siteName })}>
            <BrandLogo className="h-12 w-auto md:h-14" priority />
          </Link>
          <nav aria-label={t('nav.primaryAria')} className="hidden md:flex ml-4 gap-1 flex-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-ink-700 hover:bg-clay-50 hover:text-clay-800"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <OfflineStatus />
            <LanguageSelector value={lang} />
            {actor ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href={areaFor(actor.role).href}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
                >
                  {t(areaFor(actor.role).key)}
                </Link>
                <form action="/api/session/signout" method="post">
                  <button
                    type="submit"
                    className="text-sm px-3 py-2 rounded-lg border border-ink-100 hover:bg-clay-50 font-semibold"
                  >
                    {t('nav.signOut')}
                  </button>
                </form>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/sign-in"
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 rounded-lg text-sm font-semibold accent-bg"
                >
                  {t('nav.createAccount')}
                </Link>
              </div>
            )}
          </div>
        </div>
        <MobileNav actorRole={actor?.role} t={t} />
      </header>
    </>
  );
}

function MobileNav({ actorRole, t }: { actorRole?: Role; t: Translator }) {
  const area = actorRole ? areaFor(actorRole) : undefined;
  return (
    <div className="md:hidden border-t border-ink-100">
      <nav aria-label={t('nav.primaryMobileAria')} className="mx-auto max-w-6xl px-2 py-2 grid grid-cols-3 gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-center px-2 py-2 rounded-lg text-sm font-semibold text-ink-700 hover:bg-clay-50"
          >
            {t(l.key)}
          </Link>
        ))}
        {area ? (
          <Link href={area.href} className="text-center px-2 py-2 rounded-lg text-sm font-semibold accent-bg">
            {t(area.key)}
          </Link>
        ) : (
          <>
            <Link href="/sign-in" className="text-center px-2 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50">
              {t('nav.signIn')}
            </Link>
            <Link
              href="/register"
              className="text-center px-2 py-2 rounded-lg text-sm font-semibold accent-bg"
            >
              {t('nav.register')}
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
