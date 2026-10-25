import { currentLock, readAccountLockSettings } from '@/lib/app-lock/gate';
import { appLockAvailable } from '@/lib/app-lock/store';
import { AppLockSentinel } from './app-lock-sentinel';

/**
 * Decides on the server whether an account area needs the background/idle watcher, and
 * hands the client only the two numbers it is allowed to act on.
 *
 * The envelope answers the expensive question first: `off` means this session carries no
 * lock requirement at all, so the settings are never read for the many accounts that
 * never turned the feature on. That is a performance choice, not a trust one — the
 * client cannot make the watcher appear by asking, because relocking is a POST the
 * server answers by rewriting the signed envelope, and the window expires on its own
 * whether or not any script is running to notice.
 *
 * When the settings cannot be read the watcher is left out, which costs nothing in
 * security: this component only *asks early*. The bound that actually holds is the
 * server-signed unlock window, and the page it is on has already been admitted by
 * `requireArea()`, which fails closed.
 */
export async function AppLockWatch({ userId }: { userId: string }) {
  if (!appLockAvailable()) return null;

  const lock = await currentLock();
  if (lock.verdict === 'off') return null;

  const read = await readAccountLockSettings(userId);
  if (read.status !== 'ok') return null;
  const settings = read.settings;
  if (!settings.enabled) return null;
  if (!settings.lockOnBackground && settings.idleMinutes <= 0) return null;

  return <AppLockSentinel lockOnBackground={settings.lockOnBackground} idleMinutes={settings.idleMinutes} />;
}
