'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

const tabs: { href: string; key: TranslationKey }[] = [
  { href: '/dashboard', key: 'nav.overview' },
  { href: '/dashboard/listings', key: 'nav.myListings' },
  { href: '/dashboard/inquiries', key: 'nav.inquiries' },
  { href: '/dashboard/orders', key: 'nav.orders' },
  { href: '/dashboard/collective-orders', key: 'nav.groupSelling' },
  { href: '/dashboard/profile', key: 'nav.publicProfile' },
  { href: '/dashboard/settings', key: 'nav.settings' }
];

export function SellerNav({ lang }: { lang: LanguageCode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href));

  return (
    <nav aria-label={t(lang, 'nav.sellingDashboardAria')} className="border-b border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 flex gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive(tab.href) ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
              isActive(tab.href) ? 'bg-clay-50 text-clay-800' : 'text-ink-700 hover:bg-clay-50'
            }`}
          >
            {t(lang, tab.key)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
