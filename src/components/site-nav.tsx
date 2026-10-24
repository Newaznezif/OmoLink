'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import type { LanguageCode } from '@/lib/types';
import { BrandLogo } from './brand-logo';
import { LanguageSelector } from './language-selector';

export type SiteNavLink = { href: string; label: string };

export type SiteNavAuth =
  | { kind: 'signedIn'; areaHref: string; areaLabel: string; signOutLabel: string }
  | { kind: 'signedOut'; signInLabel: string; createAccountLabel: string; registerLabel: string };

/**
 * The header bar and its menu. Below `xl` the links collapse into a disclosed
 * panel because eight entries plus the language selector and the account actions
 * do not fit a tablet row without clipping; above it they sit inline.
 */
export function SiteNav({
  links,
  lang,
  auth,
  labels
}: {
  links: SiteNavLink[];
  lang: LanguageCode;
  auth: SiteNavAuth;
  labels: { menu: string; primary: string; mobilePrimary: string; homeAria: string };
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-ink-100">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-1.5 min-h-16 flex flex-wrap items-center gap-2 md:gap-4">
        <Link href="/" className="shrink-0" aria-label={labels.homeAria}>
          <BrandLogo className="h-11 w-auto md:h-12" priority />
        </Link>
        <nav aria-label={labels.primary} className="hidden xl:flex ml-2 gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-2.5 py-2 rounded-lg text-sm font-semibold text-ink-700 hover:bg-clay-50 hover:text-clay-800"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <LanguageSelector value={lang} />
          {auth.kind === 'signedIn' ? (
            <div className="hidden xl:flex items-center gap-2">
              <Link
                href={auth.areaHref}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
              >
                {auth.areaLabel}
              </Link>
              <form action="/api/session/signout" method="post">
                <button
                  type="submit"
                  className="text-sm px-3 py-2 rounded-lg border border-ink-100 hover:bg-clay-50 font-semibold min-h-11"
                >
                  {auth.signOutLabel}
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-2">
              <Link
                href="/sign-in"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
              >
                {auth.signInLabel}
              </Link>
              <Link href="/register" className="px-3 py-2 rounded-lg text-sm font-semibold accent-bg">
                {auth.createAccountLabel}
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="xl:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-100 text-sm font-semibold min-h-11"
          >
            <span aria-hidden className="w-4 text-base leading-none">
              {open ? '×' : '≡'}
            </span>
            {labels.menu}
          </button>
        </div>
      </div>
      <div id={panelId} className={open ? 'xl:hidden border-t border-ink-100' : 'hidden xl:hidden'}>
        <nav aria-label={labels.mobilePrimary} className="mx-auto max-w-6xl px-2 py-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-center px-2 py-3 rounded-lg text-sm font-semibold text-ink-700 hover:bg-clay-50"
            >
              {l.label}
            </Link>
          ))}
          {auth.kind === 'signedIn' ? (
            <div className="flex flex-col gap-1">
              <Link
                href={auth.areaHref}
                onClick={() => setOpen(false)}
                className="text-center px-2 py-3 rounded-lg text-sm font-semibold accent-bg"
              >
                {auth.areaLabel}
              </Link>
              <form action="/api/session/signout" method="post">
                <button
                  type="submit"
                  className="w-full text-center px-2 py-3 rounded-lg text-sm font-semibold border border-ink-100 hover:bg-clay-50"
                >
                  {auth.signOutLabel}
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="text-center px-2 py-3 rounded-lg text-sm font-semibold text-clay-800 hover:bg-clay-50"
              >
                {auth.signInLabel}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="text-center px-2 py-3 rounded-lg text-sm font-semibold accent-bg"
              >
                {auth.registerLabel}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
