import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getRepo } from '@/lib/repo';
import { accentContrastColor } from '@/lib/settings';
import { documentLangFor, getLanguage } from '@/lib/i18n/server';
import { getTheme } from '@/lib/theme-server';
import { themeHtmlClass } from '@/lib/theme';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar';

export const dynamic = 'force-dynamic';

/**
 * Title and description come from the stored site settings so an administrator
 * can change them. Things that genuinely cannot be changed without a rebuild —
 * the favicon file, the Tailwind palette, the manifest — are documented as
 * build-time items in the README instead of being faked here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getRepo().getSiteSettings();
  const title = `${settings.siteName} — ${settings.tagline}`;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: {
      default: title,
      template: `%s · ${settings.siteName}`
    },
    description: settings.heroDescription,
    manifest: '/manifest.webmanifest',
    // Every icon is the real logo: the PNGs are fitted from
    // public/images/branding/logo.png and public/icon.svg embeds the same file.
    icons: {
      icon: [
        { url: '/icons/icon-32.png', type: 'image/png', sizes: '32x32' },
        { url: '/icons/icon-48.png', type: 'image/png', sizes: '48x48' },
        { url: '/icon.svg', type: 'image/svg+xml' }
      ],
      apple: [{ url: '/icons/icon-180.png', type: 'image/png', sizes: '180x180' }]
    },
    openGraph: {
      type: 'website',
      siteName: settings.siteName,
      title,
      description: settings.heroDescription,
      images: [{ url: '/images/branding/logo.png', width: 444, height: 328, alt: 'OmoNetTab — Connecting Cultures and Commerce' }]
    },
    twitter: {
      card: 'summary',
      title,
      description: settings.heroDescription,
      images: ['/images/branding/logo.png']
    }
  };
}

export const viewport: Viewport = {
  themeColor: '#733e1c',
  width: 'device-width',
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getRepo().getSiteSettings();
  // `documentLangFor` reports the language the text on the page is actually in:
  // the three languages with no dictionary are rendered in English and are
  // announced as English. None of the offered languages is right-to-left, so the
  // document direction is left at the browser default.
  const lang = documentLangFor(getLanguage());
  // The colour scheme is written into the very first byte of HTML, not applied by
  // a script afterwards, so a saved dark choice never flashes light on the way in.
  const theme = getTheme();
  return (
    <html lang={lang} className={themeHtmlClass(theme)}>
      <body
        className="min-h-screen flex flex-col"
        style={{
          ['--accent' as string]: settings.accentColor,
          ['--accent-contrast' as string]: accentContrastColor(settings.accentColor)
        }}
      >
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
