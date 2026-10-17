'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/buyer', label: 'Overview' },
  { href: '/buyer/inquiries', label: 'Inquiries' },
  { href: '/buyer/orders', label: 'Orders' },
  { href: '/buyer/bookings', label: 'Bookings' },
  { href: '/buyer/profile', label: 'My profile' },
  { href: '/buyer/settings', label: 'Settings' }
];

export function BuyerNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/buyer' ? pathname === '/buyer' : pathname.startsWith(href));

  return (
    <nav aria-label="My account" className="border-b border-ink-100 bg-white">
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
