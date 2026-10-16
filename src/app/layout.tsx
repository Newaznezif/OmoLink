import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar';

export const metadata: Metadata = {
  title: {
    default: 'OmoLink — Connecting South Omo producers to wider markets',
    template: '%s · OmoLink'
  },
  description:
    'A community-centred marketplace prototype for South Omo Zone, Ethiopia. Sample data only in this build.',
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#733e1c',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
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
