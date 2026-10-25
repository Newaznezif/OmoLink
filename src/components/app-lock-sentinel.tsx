'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * The two settings a phone can only *ask* for, carried out on the client:
 * re-lock when the window is hidden, and re-lock after a stretch of quiet.
 *
 * Asking is all this does. It posts to `/api/app-lock/lock`, which closes the server's
 * unlock window by rewriting the signed envelope; if that post never arrives — the app
 * was killed, the phone lost power, the script was never run — the envelope is still
 * bounded by `grant_minutes`, which the server decided and the browser cannot stretch.
 * Anything else would be a lock that only works while somebody is watching it.
 *
 * `keepalive` is what makes the hidden case have a chance: a tab that is backgrounded
 * is on its way to being frozen, and an ordinary fetch is the first thing dropped.
 */
export function AppLockSentinel({
  lockOnBackground,
  idleMinutes
}: {
  lockOnBackground: boolean;
  idleMinutes: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!lockOnBackground && idleMinutes <= 0) return;

    let lastActivity = Date.now();
    let closed = false;

    const touch = () => {
      lastActivity = Date.now();
    };

    async function relock() {
      if (closed) return;
      closed = true;
      await fetch('/api/app-lock/lock', { method: 'POST', keepalive: true }).catch(() => null);
      // Ask the worker to drop any account page it is still holding. It no longer
      // stores them by choice (see public/sw.js), but a phone that visited the
      // dashboard under the older worker still has that copy, and a locked session
      // should not be able to read it back while offline.
      navigator.serviceWorker?.controller?.postMessage({ type: 'omonettab:purge-account-cache' });
      const next = encodeURIComponent(`${pathname}${window.location.search}`);
      router.replace(`/unlock?next=${next}`);
      router.refresh();
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        if (lockOnBackground) void relock();
        return;
      }
      touch();
      if (idleMinutes > 0 && Date.now() - lastActivity >= idleMinutes * 60_000) void relock();
    }

    function onIdleTick() {
      if (idleMinutes > 0 && document.visibilityState === 'visible' && Date.now() - lastActivity >= idleMinutes * 60_000) {
        void relock();
      }
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch, { passive: true });
    const tick = window.setInterval(onIdleTick, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      window.clearInterval(tick);
    };
  }, [idleMinutes, lockOnBackground, pathname, router]);

  return null;
}
