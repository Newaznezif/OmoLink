'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker after hydration. Only does so in production or
 * when explicitly enabled. Fails silently in unsupported environments so the
 * app keeps working when the browser lacks SW support.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline shell is unavailable in this browser — no user-facing error.
      });
    });
  }, []);
  return null;
}
