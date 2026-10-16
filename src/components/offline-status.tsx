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
        'hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ' +
        (online ? 'bg-moss-50 text-moss-700 border-moss-100' : 'bg-ochre-50 text-ochre-700 border-ochre-100')
      }
    >
      <span aria-hidden className="w-2 h-2 rounded-full bg-current" />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
