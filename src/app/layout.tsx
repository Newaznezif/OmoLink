import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getRepo } from '@/lib/repo';
import { accentContrastColor } from '@/lib/settings';
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
  return {
    title: {
      default: `${settings.siteName} — ${settings.tagline}`,
      template: `%s · ${settings.siteName}`
    },
    description: settings.heroDescription,
    manifest: '/manifest.webmanifest'
  };
}

export const viewport: Viewport = {
  themeColor: '#733e1c',
  width: 'device-width',
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getRepo().getSiteSettings();
  return (
    <html lang="en">
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
