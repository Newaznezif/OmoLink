'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Accounts' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/verifications', label: 'Verifications' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/orders', label: 'Arrangements' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/business-reports', label: 'Business reports' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/opportunities', label: 'Group orders' },
  { href: '/admin/homepage', label: 'Homepage' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/analytics', label: 'Activity' },
  { href: '/admin/audit-logs', label: 'Audit log' }
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <nav aria-label="Administration" className="border-b border-ink-100 bg-white">
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
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
