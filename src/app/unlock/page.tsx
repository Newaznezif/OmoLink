import { redirect } from 'next/navigation';
import { getSessionActor, safeNext } from '@/lib/session';
import { getLanguage, getT } from '@/lib/i18n/server';
import { coolDown, usableDoors } from '@/lib/app-lock/state';
import { UNLOCK_PATH, readAccountLockSettings } from '@/lib/app-lock/gate';
import { appLockAvailable } from '@/lib/app-lock/store';
import { Card, CardBody, Section } from '@/components/ui';
import { UnlockForm } from '@/components/unlock-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return { title: t('unlock.metaTitle'), description: t('unlock.metaDescription') };
}

/**
 * The door. What this screen decides nothing about: it displays, and the server decides.
 * Whether an unlock window is open is answered by the signed envelope in
 * `src/middleware.ts` and by `requireArea()`, so rendering this page for somebody whose
 * session is already unlocked would be a cosmetic accident, not a security state — and
 * the redirects below are exactly what stops that accident.
 *
 * The three ways there is nothing to unlock are kept separate because they are three
 * different facts about the deployment, and each one is what the visitor needs to know:
 * nobody is signed in, this deployment cannot verify a step-up at all, or the account
 * never asked for a lock.
 *
 * A fourth way is not a redirect: the account's settings could not be read. This is the
 * one page that can say that honestly, so it does — and it keeps the sign-out form,
 * because a database that is not answering must never become a room with no door out.
 */
export default async function UnlockPage({ searchParams }: { searchParams: { next?: string } }) {
  const t = getT();
  const lang = getLanguage();
  const next = safeNext(searchParams.next) ?? '/';

  const actor = await getSessionActor();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!appLockAvailable()) redirect(next);

  const read = await readAccountLockSettings(actor.userId);
  if (read.status === 'error') return <StoreUnavailable next={next} />;

  // `absent` — migration 0008 never applied — is the one failure allowed to mean there is
  // no lock to open here.
  const settings = read.status === 'ok' ? read.settings : undefined;
  if (!settings?.enabled) redirect(next);

  const doors = usableDoors(settings);
  const waiting = coolDown(settings.lockedUntil, Date.now());

  return (
    <Section eyebrow={t('unlock.eyebrow')} title={t('unlock.title')} description={t('unlock.description')}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
        <Card>
          <CardBody>
            <UnlockForm
              lang={lang}
              next={next}
              doors={doors}
              retryAfterSeconds={waiting.retryAfterSeconds}
              grantMinutes={settings.grantMinutes}
            />
          </CardBody>
        </Card>

        <RecoveryCard />
      </div>
    </Section>
  );
}

function RecoveryCard() {
  const t = getT();
  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="font-semibold text-ink-900">{t('unlock.recoveryTitle')}</h2>
        <p className="text-sm text-ink-700">{t('unlock.recoveryBody')}</p>
        <form action="/api/session/signout" method="post">
          <button type="submit" className="text-sm font-semibold underline text-clay-700 min-h-11">
            {t('unlock.signOutLink')}
          </button>
        </form>
        <p className="text-xs text-ink-500">{t('unlock.whatThisIs')}</p>
      </CardBody>
    </Card>
  );
}

/**
 * The screen standing at a door it cannot inspect. It says which part failed to answer,
 * offers the same sign-out form as a recovery, and asks nothing of anyone's password —
 * because nothing was verified either way, and pretending otherwise would be the one
 * answer that is not true.
 */
function StoreUnavailable({ next }: { next: string }) {
  const t = getT();
  return (
    <Section eyebrow={t('unlock.eyebrow')} title={t('unlock.title')} description={t('unlock.description')}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold text-ink-900">{t('appLock.title')}</h2>
            <p className="text-sm text-ink-700">{t('appLock.storeUnavailable')}</p>
            <p className="text-xs text-ink-500">{t('appLock.unavailableTail')}</p>
            <a
              className="inline-flex min-h-11 items-center text-sm font-semibold underline text-clay-700"
              href={`${UNLOCK_PATH}?next=${encodeURIComponent(next)}`}
            >
              {t('unlock.tryAgain')}
            </a>
          </CardBody>
        </Card>

        <RecoveryCard />
      </div>
    </Section>
  );
}
