'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/listings', label: 'My listings' },
  { href: '/dashboard/inquiries', label: 'Inquiries' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/collective-orders', label: 'Group selling' },
  { href: '/dashboard/profile', label: 'Public profile' },
  { href: '/dashboard/settings', label: 'Settings' }
];

export function SellerNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href));

  return (
    <nav aria-label="Selling dashboard" className="border-b border-ink-100 bg-white">
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
