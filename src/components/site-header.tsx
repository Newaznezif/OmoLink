import Link from 'next/link';
import { getSession, getSessionProfile } from '@/lib/session';
import { isDemoMode } from '@/lib/store';
import { LanguageSelector } from './language-selector';
import { OfflineStatus } from './offline-status';

const links = [
  { href: '/explore', label: 'Explore' },
  { href: '/products', label: 'Products' },
  { href: '/tourism', label: 'Tourism' },
  { href: '/collective-orders', label: 'Collective orders' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing-tool', label: 'Pricing tool' }
];

export async function SiteHeader() {
  const session = getSession();
  const profile = session ? await getSessionProfile() : undefined;

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      {isDemoMode() && (
        <div role="status" className="bg-ochre-100 text-ochre-700 text-xs md:text-sm px-4 py-2 text-center font-semibold">
          Demo mode — sample data only. No real transactions, no verified producers, no SMS/payments wired up yet.
        </div>
      )}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-clay-800" aria-label="OmoLink home">
            <span aria-hidden className="w-9 h-9 rounded-lg bg-clay-700 text-white grid place-items-center font-black">
              O
            </span>
            <span className="text-lg">OmoLink</span>
          </Link>
          <nav aria-label="Primary" className="hidden md:flex ml-4 gap-1 flex-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-ink-700 hover:bg-clay-50 hover:text-clay-800"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <OfflineStatus />
            <LanguageSelector />
            {profile ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href={profile.id.startsWith('prof_admin') ? '/admin' : '/dashboard'}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
                >
                  Dashboard
                </Link>
                <form action="/api/session/signout" method="post">
                  <button
                    type="submit"
                    className="text-sm px-3 py-2 rounded-lg border border-ink-100 hover:bg-clay-50 font-semibold"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/sign-in"
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-clay-700 text-white hover:bg-clay-800"
                >
                  Register as producer
                </Link>
              </div>
            )}
          </div>
        </div>
        <MobileNav />
      </header>
    </>
  );
}

function MobileNav() {
  return (
    <div className="md:hidden border-t border-ink-100">
      <nav aria-label="Primary mobile" className="mx-auto max-w-6xl px-2 py-2 grid grid-cols-3 gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-center px-2 py-2 rounded-lg text-sm font-semibold text-ink-700 hover:bg-clay-50"
          >
            {l.label}
          </Link>
        ))}
        <Link href="/sign-in" className="text-center px-2 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50">
          Sign in
        </Link>
        <Link
          href="/register"
          className="text-center px-2 py-2 rounded-lg text-sm font-semibold bg-clay-700 text-white hover:bg-clay-800"
        >
          Register
        </Link>
      </nav>
    </div>
  );
}
