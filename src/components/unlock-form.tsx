'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { t, type TranslationKey } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/types';
import type { LockDoors } from '@/lib/app-lock/state';
import { Button, Field, Input } from './ui';

/**
 * The two doors, offered exactly as the server described them.
 *
 * `LockDoors` comes from `usableDoors()` on the server, which knows only what the
 * account actually configured — a password that exists, a device that is enrolled and
 * allowed by the method. Nothing here decides whether the lock opens: this component
 * sends an answer and reports what came back. A browser that edited this file, or the
 * response, would still have to produce a verified assertion or the right password,
 * because the check is in `src/app/api/app-lock/unlock/route.ts` and the artifact that
 * matters is a cookie this script cannot read or write.
 *
 * The WebAuthn branch is honest about what it is asking the platform to do. The device
 * may use a fingerprint, a face, or its passcode — that choice belongs to the operating
 * system, and no copy here promises a biometric it cannot guarantee.
 */
export function UnlockForm({
  lang,
  next,
  doors,
  retryAfterSeconds,
  grantMinutes
}: {
  lang: LanguageCode;
  next: string;
  doors: LockDoors;
  retryAfterSeconds: number;
  grantMinutes: number;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(retryAfterSeconds);
  const [deviceSupported, setDeviceSupported] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | null>(null);

  // Feature detection, not user-agent guessing: what the platform says it can do here.
  useEffect(() => {
    setDeviceSupported(Boolean(window.PublicKeyCredential) && window.isSecureContext);
  }, []);

  useEffect(() => {
    if (waiting <= 0) return;
    timer.current = window.setInterval(() => setWaiting((value) => Math.max(0, value - 1)), 1000);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [waiting]);

  function opened() {
    // The envelope is an httpOnly cookie, so the only way to see that it changed is to
    // ask the server again. `refresh` re-renders the account area with the new verdict.
    router.replace(next);
    router.refresh();
  }

  async function post(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string; retryAfterSeconds?: number }> {
    const res = await fetch('/api/app-lock/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => null);
    if (!res) return { error: t(lang, 'unlock.networkFailed') };
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; retryAfterSeconds?: number };
    return json;
  }

  function report(result: { ok?: boolean; error?: string; retryAfterSeconds?: number }) {
    if (result.ok) {
      setError(null);
      opened();
      return;
    }
    if (typeof result.retryAfterSeconds === 'number' && result.retryAfterSeconds > 0) setWaiting(result.retryAfterSeconds);
    setError(result.error ?? t(lang, 'unlock.failed'));
  }

  function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (pending || waiting > 0 || !password) return;
    startTransition(async () => report(await post({ method: 'password', password })));
  }

  async function useDevice() {
    if (pending || waiting > 0) return;
    setError(null);
    startTransition(async () => {
      const optionsResponse = await fetch('/api/app-lock/unlock/options', { method: 'GET' }).catch(() => null);
      if (!optionsResponse) {
        setError(t(lang, 'unlock.networkFailed'));
        return;
      }
      const payload = (await optionsResponse.json().catch(() => ({}))) as {
        available?: boolean;
        options?: Parameters<typeof startAuthentication>[0];
        error?: string;
      };
      if (!payload.available || !payload.options) {
        setError(payload.error ?? t(lang, 'unlock.deviceUnavailable'));
        return;
      }
      let assertion: Awaited<ReturnType<typeof startAuthentication>> | undefined;
      try {
        assertion = await startAuthentication(payload.options);
      } catch {
        // The platform itself said no: cancelled, timed out, or the person did not look
        // at the camera. That is not a failure to report as a wrong answer.
        setError(t(lang, 'unlock.deviceCancelled'));
        return;
      }
      if (!assertion) return;
      report(await post({ method: 'webauthn', assertion }));
    });
  }

  const noticeKey: TranslationKey | null = !doors.webauthn && !doors.password ? 'unlock.noDoor' : null;

  return (
    <div className="space-y-5">
      <p role="status" className="text-sm text-ink-700">
        {t(lang, 'unlock.windowHint', { minutes: grantMinutes })}
      </p>

      {noticeKey ? <p role="alert" className="text-sm text-red-700">{t(lang, noticeKey)}</p> : null}

      {doors.webauthn ? (
        <div className="space-y-2">
          <h2 className="font-semibold text-ink-900">{t(lang, 'unlock.deviceTitle')}</h2>
          <p className="text-sm text-ink-700">{t(lang, 'unlock.deviceBody')}</p>
          {deviceSupported ? (
            <Button type="button" onClick={useDevice} disabled={pending || waiting > 0}>
              {t(lang, 'unlock.deviceButton')}
            </Button>
          ) : (
            <p className="text-sm text-ochre-700">{t(lang, 'unlock.deviceUnsupported')}</p>
          )}
        </div>
      ) : null}

      {doors.password ? (
        <form onSubmit={submitPassword} className="space-y-2">
          <h2 className="font-semibold text-ink-900">{t(lang, 'unlock.passwordTitle')}</h2>
          <Field label={t(lang, 'unlock.passwordLabel')} htmlFor="lock-password" hint={t(lang, 'unlock.passwordHint')}>
            <Input
              id="lock-password"
              type="password"
              name="lock-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              inputMode="text"
              minLength={8}
              maxLength={128}
              disabled={pending || waiting > 0}
              invalid={Boolean(error)}
            />
          </Field>
          <Button type="submit" disabled={pending || waiting > 0 || !password}>
            {t(lang, 'unlock.passwordButton')}
          </Button>
        </form>
      ) : null}

      {waiting > 0 ? (
        <p role="alert" className="text-sm text-red-700">
          {t(lang, 'unlock.coolingDown', { seconds: waiting })}
        </p>
      ) : null}

      {error ? (
        <p role="alert" aria-live="assertive" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
