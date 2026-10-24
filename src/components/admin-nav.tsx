'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';

const tabs: { href: string; key: TranslationKey }[] = [
  { href: '/admin', key: 'nav.overview' },
  { href: '/admin/users', key: 'nav.accounts' },
  { href: '/admin/roles', key: 'nav.roles' },
  { href: '/admin/listings', key: 'nav.listings' },
  { href: '/admin/categories', key: 'nav.categories' },
  { href: '/admin/verifications', key: 'nav.verifications' },
  { href: '/admin/reviews', key: 'nav.reviews' },
  { href: '/admin/reports', key: 'nav.reports' },
  { href: '/admin/orders', key: 'nav.arrangements' },
  { href: '/admin/payments', key: 'nav.payments' },
  { href: '/admin/business-reports', key: 'nav.businessReports' },
  { href: '/admin/messages', key: 'nav.messages' },
  { href: '/admin/opportunities', key: 'nav.groupOrders' },
  { href: '/admin/homepage', key: 'nav.homepage' },
  { href: '/admin/settings', key: 'nav.settings' },
  { href: '/admin/analytics', key: 'nav.activity' },
  { href: '/admin/audit-logs', key: 'nav.auditLog' }
];

export function AdminNav({ lang }: { lang: LanguageCode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <nav aria-label={t(lang, 'nav.administrationAria')} className="border-b border-ink-100 bg-white">
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
