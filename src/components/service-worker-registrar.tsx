'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker so the app shell and visited pages can be read
 * offline. Production only: dev chunk URLs stay the same while their contents
 * change, so a cached copy would quietly serve yesterday’s code back to the
 * developer. It waits for the load event only if the page is still loading: by
 * the time React hydrates on a slow connection that event has often fired
 * already, and a listener alone would leave the worker unregistered.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        // Online use is unaffected; only the offline shell is missing.
        console.warn('Offline shell unavailable: the service worker did not register.', error);
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
