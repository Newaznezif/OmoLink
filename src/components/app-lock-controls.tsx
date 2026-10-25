'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import { LOCK_PASSWORD_MIN, usableDoors, type AppLockSettings, type LockMethod } from '@/lib/app-lock/state';
import { Badge, Button, Card, CardBody, Field, Input, Select } from './ui';

export type LockCredentialRow = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const GRANT_CHOICES = [5, 15, 30, 60, 180, 720];
const IDLE_CHOICES = [0, 1, 5, 15, 30, 60];

/**
 * The account's lock, edited one decision at a time — the shape the theme and language
 * settings already use, because a long form with its save button off the bottom of a
 * phone screen is how a security setting ends up half-applied.
 *
 * The settings and the device list are the server's, not this component's: every write
 * is followed by a re-read, so what is shown afterwards is what the database holds.
 * A refusal (turning the lock on with no door behind it, removing the last enrolled
 * device) comes back as text, and the switch stays exactly where the server left it.
 *
 * `stepUp` says whether a verified step-up opened this session, which is the second way
 * the server accepts a password replacement or removal. It is display only: the settings
 * endpoint reads the same fact out of the signed envelope, and nothing this component
 * sends can put it there.
 */
export function AppLockControls({
  lang,
  settings,
  credentials,
  stepUp
}: {
  lang: LanguageCode;
  settings: AppLockSettings;
  credentials: LockCredentialRow[];
  stepUp: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Only the *drafts* are local state: what is in the input boxes before it is saved.
  const [grant, setGrant] = useState(String(settings.grantMinutes));
  const [idle, setIdle] = useState(String(settings.idleMinutes));
  const [onBackground, setOnBackground] = useState(settings.lockOnBackground);
  const [label, setLabel] = useState(() => t(lang, 'appLock.deviceDefaultLabel'));
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [deviceSupported, setDeviceSupported] = useState(false);

  useEffect(() => {
    setDeviceSupported(Boolean(window.PublicKeyCredential) && window.isSecureContext);
  }, []);

  // When the server's answer arrives it wins over the draft, so a value the deployment
  // clamped (a 900-minute grant reduced to 720) is shown as the number that was stored.
  useEffect(() => setGrant(String(settings.grantMinutes)), [settings.grantMinutes]);
  useEffect(() => setIdle(String(settings.idleMinutes)), [settings.idleMinutes]);
  useEffect(() => setOnBackground(settings.lockOnBackground), [settings.lockOnBackground]);
  useEffect(() => {
    setError(null);
  }, [settings.enabled, settings.method, settings.hasPassword, settings.credentialCount]);

  const doors = usableDoors(settings);

  async function postJson(path: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    const res = await fetch(path, init).catch(() => null);
    if (!res) return null;
    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
  }

  /** Reports what came back, then asks the server what it actually holds. */
  function settle(result: Record<string, unknown> | null, successKey?: TranslationKey) {
    if (!result) {
      setError(t(lang, 'appLock.networkFailed'));
      setNotice(null);
      return;
    }
    if (typeof result.error === 'string') {
      setError(result.error);
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(successKey ? t(lang, successKey) : null);
    router.refresh();
  }

  function patch(body: Record<string, unknown>, successKey?: TranslationKey) {
    if (pending) return;
    startTransition(async () => {
      const result = await postJson('/api/app-lock/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      settle(result, successKey);
    });
  }

  function enroll() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const options = await postJson('/api/app-lock/enroll/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label })
      });
      if (!options) {
        setError(t(lang, 'appLock.networkFailed'));
        return;
      }
      if (typeof options.error === 'string') {
        setError(options.error);
        return;
      }
      let response;
      try {
        response = await startRegistration(options.options as Parameters<typeof startRegistration>[0]);
      } catch {
        setError(t(lang, 'appLock.enrollCancelled'));
        return;
      }
      if (!response) return;
      const verified = await postJson('/api/app-lock/enroll/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response, label })
      });
      settle(verified, 'appLock.deviceAdded');
    });
  }

  function removeDevice(id: string) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await postJson('/api/app-lock/credentials', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id })
      });
      settle(result, 'appLock.deviceRemoved');
    });
  }

  function lockNow() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/app-lock/lock', { method: 'POST' }).catch(() => null);
      if (!res) {
        setError(t(lang, 'appLock.networkFailed'));
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        setError(typeof json.error === 'string' ? json.error : t(lang, 'appLock.failed'));
        return;
      }
      setError(null);
      // Nothing is navigated by hand. `refresh` re-renders this page on the server, and
      // the server is where the lock lives: `requireArea` sees the closed window and
      // sends the visitor to the unlock screen itself. A client-side jump would be a
      // curtain, and the point of this button is that it is not one.
      setNotice(t(lang, 'appLock.lockedNow'));
      router.refresh();
    });
  }

  /**
   * The second proof the server accepts for a password change: this device, checked now.
   *
   * It is the ordinary unlock ceremony — the server's challenge, the platform's assertion,
   * the server's verification — run from the settings page instead of the unlock screen.
   * Nothing here is invented for this button: the answer arrives as the same signed
   * envelope, marked as a step-up by the server, and the reload is what makes the page
   * know it.
   */
  function confirmWithDevice() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const challenge = await postJson('/api/app-lock/unlock/options', { method: 'get' });
      if (!challenge) {
        setError(t(lang, 'appLock.networkFailed'));
        return;
      }
      if (typeof challenge.error === 'string') {
        setError(challenge.error);
        return;
      }
      if (challenge.available !== true) {
        setError(t(lang, 'unlock.deviceUnavailable'));
        return;
      }
      let assertion;
      try {
        assertion = await startAuthentication(challenge.options as Parameters<typeof startAuthentication>[0]);
      } catch {
        setError(t(lang, 'unlock.deviceCancelled'));
        return;
      }
      const verified = await postJson('/api/app-lock/unlock', {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method: 'webauthn', assertion })
      });
      if (!verified || typeof verified.error === 'string') {
        setError(typeof verified?.error === 'string' ? verified.error : t(lang, 'appLock.failed'));
        return;
      }
      // The provenance lives in the cookie the server just wrote, so the page asks the
      // server what it now knows rather than assuming it.
      setNotice(t(lang, 'appLock.stepUpProven'));
      router.refresh();
    });
  }

  const methodOptions: { value: LockMethod; labelKey: TranslationKey }[] = [
    { value: 'either', labelKey: 'appLock.methodEither' },
    { value: 'webauthn', labelKey: 'appLock.methodWebauthn' },
    { value: 'password', labelKey: 'appLock.methodPassword' }
  ];

  // Which proof this session can offer for the one action that needs one: the current
  // password, or a step-up the server recorded. `either` is what the endpoint accepts.
  const needsPasswordProof = settings.hasPassword && !stepUp;
  const canConfirmDevice = doors.webauthn && deviceSupported;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={settings.enabled ? 'success' : 'neutral'}>
          {t(lang, settings.enabled ? 'appLock.badgeOn' : 'appLock.badgeOff')}
        </Badge>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={settings.enabled}
            disabled={pending}
            onChange={(event) => patch({ enabled: event.target.checked }, 'appLock.saved')}
          />
          {t(lang, 'appLock.enableLabel')}
        </label>
      </div>
      <p className="text-sm text-ink-700">{t(lang, 'appLock.enableHint')}</p>

      <Field label={t(lang, 'appLock.methodLabel')} htmlFor="app-lock-method" hint={t(lang, 'appLock.methodHint')}>
        <Select id="app-lock-method" value={settings.method} disabled={pending} onChange={(event) => patch({ method: event.target.value })}>
          {methodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(lang, option.labelKey)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t(lang, 'appLock.grantLabel')} htmlFor="app-lock-grant" hint={t(lang, 'appLock.grantHint')}>
          <Select id="app-lock-grant" value={grant} disabled={pending} onChange={(event) => setGrant(event.target.value)}>
            {GRANT_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t(lang, 'appLock.minutesCount', { count: minutes })}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t(lang, 'appLock.idleLabel')} htmlFor="app-lock-idle" hint={t(lang, 'appLock.idleHint')}>
          <Select id="app-lock-idle" value={idle} disabled={pending} onChange={(event) => setIdle(event.target.value)}>
            {IDLE_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? t(lang, 'appLock.idleNever') : t(lang, 'appLock.minutesCount', { count: minutes })}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5"
          checked={onBackground}
          disabled={pending}
          onChange={(event) => setOnBackground(event.target.checked)}
        />
        <span>
          <span className="font-semibold text-ink-900">{t(lang, 'appLock.backgroundLabel')}</span>
          <span className="block text-xs text-ink-500 mt-0.5">{t(lang, 'appLock.backgroundHint')}</span>
        </span>
      </label>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => patch({ grantMinutes: Number(grant), idleMinutes: Number(idle), lockOnBackground: onBackground }, 'appLock.saved')}
      >
        {t(lang, 'appLock.saveTimings')}
      </Button>

      <Card>
        <CardBody className="space-y-3">
          <h3 className="font-semibold text-ink-900">{t(lang, 'appLock.devicesTitle')}</h3>
          <p className="text-sm text-ink-700">{t(lang, 'appLock.devicesBody')}</p>

          {credentials.length === 0 ? (
            <p className="text-sm text-ink-500">{t(lang, 'appLock.devicesEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {credentials.map((credential) => (
                <li key={credential.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-ink-900">{credential.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-ink-500">
                      {credential.lastUsedAt
                        ? t(lang, 'appLock.deviceLastUsed', { when: new Date(credential.lastUsedAt).toLocaleDateString() })
                        : t(lang, 'appLock.deviceNeverUsed')}
                    </span>
                    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => removeDevice(credential.id)}>
                      {t(lang, 'appLock.removeDevice')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {deviceSupported ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[12rem]">
                <Field label={t(lang, 'appLock.deviceLabel')} htmlFor="app-lock-device-label" hint={t(lang, 'appLock.deviceLabelHint')}>
                  <Input id="app-lock-device-label" value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} disabled={pending} />
                </Field>
              </div>
              <Button type="button" size="sm" disabled={pending || !label.trim()} onClick={enroll}>
                {t(lang, 'appLock.enrollButton')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ochre-700">{t(lang, 'appLock.enrollUnsupported')}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h3 className="font-semibold text-ink-900">{t(lang, 'appLock.passwordTitle')}</h3>
          <p className="text-sm text-ink-700">
            {settings.hasPassword ? t(lang, 'appLock.passwordStored') : t(lang, 'appLock.passwordNone')}
          </p>

          {needsPasswordProof ? (
            <Field label={t(lang, 'appLock.passwordCurrent')} htmlFor="app-lock-current" hint={t(lang, 'appLock.passwordProofHint')}>
              <Input
                id="app-lock-current"
                type="password"
                value={currentPassword}
                autoComplete="off"
                maxLength={128}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={pending}
              />
            </Field>
          ) : null}

          {settings.hasPassword && stepUp ? <p className="text-sm text-moss-700">{t(lang, 'appLock.stepUpProven')}</p> : null}

          {settings.hasPassword && !stepUp && canConfirmDevice ? (
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={confirmWithDevice}>
              {t(lang, 'appLock.confirmWithDevice')}
            </Button>
          ) : null}

          <Field label={t(lang, 'appLock.passwordNew')} htmlFor="app-lock-new" hint={t(lang, 'appLock.passwordHint')}>
            <Input
              id="app-lock-new"
              type="password"
              value={password}
              autoComplete="new-password"
              minLength={LOCK_PASSWORD_MIN}
              maxLength={128}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || password.length < LOCK_PASSWORD_MIN || (needsPasswordProof && !currentPassword)}
              onClick={() => {
                const body: Record<string, unknown> = { password };
                if (needsPasswordProof) body.currentPassword = currentPassword;
                setPassword('');
                setCurrentPassword('');
                patch(
                  body,
                  settings.hasPassword ? 'appLock.passwordChanged' : 'appLock.passwordStoredNow'
                );
              }}
            >
              {t(lang, settings.hasPassword ? 'appLock.passwordChangeButton' : 'appLock.passwordSetButton')}
            </Button>
            {settings.hasPassword ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending || (needsPasswordProof && !currentPassword)}
                onClick={() => {
                  const body: Record<string, unknown> = { clearPassword: true };
                  if (needsPasswordProof) body.currentPassword = currentPassword;
                  setCurrentPassword('');
                  patch(body, 'appLock.passwordRemoved');
                }}
              >
                {t(lang, 'appLock.passwordRemoveButton')}
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Button type="button" variant="danger" size="sm" disabled={pending || !settings.enabled} onClick={lockNow}>
        {t(lang, 'appLock.lockNow')}
      </Button>

      {notice ? (
        <p role="status" aria-live="polite" className="text-sm text-moss-700">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" aria-live="assertive" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-ink-500">{t(lang, 'appLock.honestNote')}</p>
    </div>
  );
}
