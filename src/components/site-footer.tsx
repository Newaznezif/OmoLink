import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';

export async function SiteFooter() {
  const settings = await getRepo().getSiteSettings();
  const demo = isDemoMode();

  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 font-bold text-clay-800">
            <span aria-hidden className="w-8 h-8 rounded-lg bg-clay-700 text-white grid place-items-center font-black">
              {settings.siteName.slice(0, 1).toUpperCase()}
            </span>
            {settings.siteName}
          </div>
          <p className="mt-2 text-sm text-ink-700">{settings.tagline}</p>
          <p className="mt-2 text-sm text-ink-700">
            {demo
              ? 'Currently running in demo mode with sample data only.'
              : 'Connected to a Supabase project; records shown are real data entered by accounts on this instance.'}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">Explore</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/products" className="hover:underline">Products</Link></li>
            <li><Link href="/tourism" className="hover:underline">Tourism services</Link></li>
            <li><Link href="/collective-orders" className="hover:underline">Collective orders</Link></li>
            <li><Link href="/pricing-tool" className="hover:underline">Pricing tool</Link></li>
            <li><Link href="/impact" className="hover:underline">Impact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">Community</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/how-it-works" className="hover:underline">How it works</Link></li>
            <li><Link href="/community-guidelines" className="hover:underline">Community guidelines</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
            <li><Link href="/offline" className="hover:underline">Offline use</Link></li>
            <li><Link href="/contact" className="hover:underline">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">Contact</h3>
          {settings.contactEmail ? (
            <p className="text-sm text-ink-700">
              <a href={`mailto:${settings.contactEmail}`} className="underline font-semibold">
                {settings.contactEmail}
              </a>
            </p>
          ) : (
            <p className="text-sm text-ink-700">
              Use the <Link href="/contact" className="underline font-semibold">contact form</Link> — messages reach an
              administrator of this instance.
            </p>
          )}
          {settings.contactPhone && <p className="text-sm text-ink-700 mt-2">{settings.contactPhone}</p>}
          {settings.addressNote && <p className="text-sm text-ink-700 mt-2">{settings.addressNote}</p>}
          {settings.socialLinks.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {settings.socialLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} className="hover:underline" rel="me noopener" target="_blank">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 text-xs text-ink-500 flex flex-wrap gap-4">
          <span>© {new Date().getFullYear()} {settings.siteName}.</span>
          {demo && <span>Sample data — not a live marketplace.</span>}
          <span>Verification and payment workflows are pending pilot design.</span>
          {settings.footerNote && <span>{settings.footerNote}</span>}
        </div>
      </div>
    </footer>
  );
}
