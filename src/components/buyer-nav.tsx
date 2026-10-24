'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

const tabs: { href: string; key: TranslationKey }[] = [
  { href: '/buyer', key: 'nav.overview' },
  { href: '/buyer/inquiries', key: 'nav.inquiries' },
  { href: '/buyer/orders', key: 'nav.orders' },
  { href: '/buyer/bookings', key: 'nav.bookings' },
  { href: '/buyer/profile', key: 'nav.myProfile' },
  { href: '/buyer/settings', key: 'nav.settings' }
];

export function BuyerNav({ lang }: { lang: LanguageCode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/buyer' ? pathname === '/buyer' : pathname.startsWith(href));

  return (
    <nav aria-label={t(lang, 'nav.myAccountAria')} className="border-b border-ink-100 bg-white">
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
