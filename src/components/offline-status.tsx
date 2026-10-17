'use client';

import { useEffect, useState } from 'react';

export function OfflineStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online === null) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      title={online ? 'Connected to the network.' : 'You are offline. Cached listings remain readable; drafts are saved locally.'}
      className={
        // The offline warning has to survive a small screen — a phone is the
        // device most likely to lose connectivity — while the calm online chip
        // can stay desktop-only.
        'items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ' +
        (online ? 'hidden md:inline-flex bg-moss-50 text-moss-700 border-moss-100' : 'inline-flex bg-ochre-50 text-ochre-700 border-ochre-100')
      }
    >
      <span aria-hidden className="w-2 h-2 rounded-full bg-current" />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
