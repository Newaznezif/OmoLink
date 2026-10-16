import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 font-bold text-clay-800">
            <span aria-hidden className="w-8 h-8 rounded-lg bg-clay-700 text-white grid place-items-center font-black">
              O
            </span>
            OmoLink
          </div>
          <p className="mt-2 text-sm text-ink-700">
            A community-centred marketplace prototype for South Omo Zone. Currently running in demo mode with sample data
            only.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">Explore</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/products" className="hover:underline">Products</Link></li>
            <li><Link href="/tourism" className="hover:underline">Tourism services</Link></li>
            <li><Link href="/collective-orders" className="hover:underline">Collective orders</Link></li>
            <li><Link href="/pricing-tool" className="hover:underline">Pricing tool</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">Community</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/how-it-works" className="hover:underline">How it works</Link></li>
            <li><Link href="/community-guidelines" className="hover:underline">Community guidelines</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
            <li><Link href="/offline" className="hover:underline">Offline use</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-2">Contact</h3>
          <p className="text-sm text-ink-700">
            Community coordinator: <span className="font-mono">(placeholder — not a real contact)</span>
          </p>
          <p className="text-sm text-ink-700 mt-2">
            Accessibility feedback: <span className="font-mono">(placeholder)</span>
          </p>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 text-xs text-ink-500 flex flex-wrap gap-4">
          <span>© {new Date().getFullYear()} OmoLink prototype.</span>
          <span>Sample data — not a live marketplace.</span>
          <span>Verification and payment workflows are pending pilot design.</span>
        </div>
      </div>
    </footer>
  );
}
