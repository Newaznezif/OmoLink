import { getLanguage } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { isDemoMode } from '@/lib/store';
import { appLockConfigured } from '@/lib/app-lock/envelope';
import { readAccountLockSettings, sessionStepUp } from '@/lib/app-lock/gate';
import { appLockAvailable, listCredentials, lockClient } from '@/lib/app-lock/store';
import { Card, CardBody } from './ui';
import { AppLockControls } from './app-lock-controls';

/**
 * The app lock block on every role's settings page.
 *
 * When the lock cannot be offered, this says *which* requirement is missing rather than
 * hiding the subject: a deployment in demo mode, one with no `APP_LOCK_SECRET` to sign
 * envelopes with, and one whose tables have not been applied are three different things
 * an owner needs to hear about, and "there is no lock here" is not the same as a button
 * that quietly disappeared. A read that simply failed is a fourth thing, and it is said
 * as itself — not as an absent table, and not as an account with no lock.
 *
 * None of those cases is a defect in the rest of the app. Sign-in, roles, Row Level
 * Security and every other account area work exactly as they did before this feature
 * existed, which is the whole reason the lock is allowed to be optional.
 */
export async function AppLockCard({ userId }: { userId: string }) {
  const lang = getLanguage();

  if (!appLockAvailable()) {
    const reason = isDemoMode() ? 'appLock.unavailableDemo' : !appLockConfigured() ? 'appLock.unavailableSecret' : 'appLock.unavailableStore';
    return unavailable(reason);
  }

  const read = await readAccountLockSettings(userId);
  if (read.status === 'error') return unavailable('appLock.storeUnavailable');
  if (read.status === 'absent') return unavailable('appLock.unavailableStore');

  const client = lockClient();
  let credentials;
  try {
    credentials = await listCredentials(client, userId);
  } catch {
    // The devices could not be listed, which is a fact about this request, not about the
    // account. Saying so is better than the alternatives: an empty list that reads like
    // "you have enrolled nothing", or a page that stops rendering.
    return unavailable('appLock.storeUnavailable');
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="font-semibold text-ink-900">{t(lang, 'appLock.title')}</h2>
        <p className="text-sm text-ink-700">{t(lang, 'appLock.intro')}</p>
        <AppLockControls
          lang={lang}
          settings={read.settings}
          // Whether a verified step-up opened this session. The interface shows it as the
          // reason a password change is being accepted without the current one; the
          // server never takes the word for it, it reads the same signed envelope.
          stepUp={await sessionStepUp()}
          credentials={credentials.map((credential) => ({
            id: credential.id,
            label: credential.label,
            createdAt: credential.createdAt,
            lastUsedAt: credential.lastUsedAt
          }))}
        />
      </CardBody>
    </Card>
  );
}

/** Why the lock is not on this screen, in the owner's own language. */
function unavailable(reason: 'appLock.unavailableDemo' | 'appLock.unavailableSecret' | 'appLock.unavailableStore' | 'appLock.storeUnavailable') {
  const lang = getLanguage();
  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-ink-900">{t(lang, 'appLock.title')}</h2>
        <p className="mt-2 text-sm text-ink-700">{t(lang, reason)}</p>
        <p className="mt-2 text-xs text-ink-500">{t(lang, 'appLock.unavailableTail')}</p>
      </CardBody>
    </Card>
  );
}
