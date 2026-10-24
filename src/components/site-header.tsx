import { getSessionActor } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { Role } from '@/lib/types';
import { SiteNav, type SiteNavAuth, type SiteNavLink } from './site-nav';

/**
 * The public navigation. The seller directory is not a menu entry here: a buyer
 * reaches a producer through a listing, and a seller reaches their own area
 * through the account action below, which is chosen from the session role.
 */
const links: { href: string; key: 'nav.explore' | 'nav.products' | 'nav.tourism' | 'nav.collective' | 'nav.guide' | 'nav.team' | 'nav.pricing' | 'nav.contact' }[] = [
  { href: '/explore', key: 'nav.explore' },
  { href: '/products', key: 'nav.products' },
  { href: '/tourism', key: 'nav.tourism' },
  { href: '/collective-orders', key: 'nav.collective' },
  { href: '/how-it-works', key: 'nav.guide' },
  { href: '/team', key: 'nav.team' },
  { href: '/pricing-tool', key: 'nav.pricing' },
  { href: '/contact', key: 'nav.contact' }
];

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

  const navLinks: SiteNavLink[] = links.map((l) => ({ href: l.href, label: t(l.key) }));
  const auth: SiteNavAuth = actor
    ? {
        kind: 'signedIn',
        areaHref: areaFor(actor.role).href,
        areaLabel: t(areaFor(actor.role).key),
        signOutLabel: t('nav.signOut')
      }
    : {
        kind: 'signedOut',
        signInLabel: t('nav.signIn'),
        createAccountLabel: t('nav.createAccount'),
        registerLabel: t('nav.register')
      };

  return (
    <>
      <a href="#main" className="skip-link">
        {t('common.skipToMain')}
      </a>
      <SiteNav
        links={navLinks}
        lang={lang}
        auth={auth}
        labels={{
          menu: t('nav.menu'),
          primary: t('nav.primaryAria'),
          mobilePrimary: t('nav.primaryMobileAria'),
          homeAria: t('nav.homeAria', { siteName: settings.siteName })
        }}
      />
    </>
  );
}
