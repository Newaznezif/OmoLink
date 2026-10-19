import { getT } from '@/lib/i18n/server';
import type { VerificationStatus } from '@/lib/types';
import { Badge } from './ui';

/**
 * Status wording lives here rather than in `ui.tsx` because it reads the request
 * cookie. `ui.tsx` is imported by client components, which must not pull
 * `next/headers` into the browser bundle.
 */
export function VerificationLabel({ status, isDemo = true }: { status: VerificationStatus; isDemo?: boolean }) {
  const t = getT();
  const map: Record<VerificationStatus, { tone: 'success' | 'warning' | 'neutral'; label: string; hint: string }> = {
    verified: { tone: 'success', label: t('status.verified'), hint: t('status.verifiedHint') },
    pending_review: { tone: 'warning', label: t('status.pending'), hint: t('status.pendingHint') },
    unverified: { tone: 'neutral', label: t('status.unverified'), hint: t('status.unverifiedHint') }
  };
  const s = map[status];
  return (
    <Badge
      tone={s.tone}
      title={isDemo ? `${s.hint}${t('status.demoSuffix')}` : s.hint}
    >
      {s.label}
      {isDemo && <span className="ml-1 opacity-70">{t('status.demoTag')}</span>}
    </Badge>
  );
}

export function SampleTag() {
  const t = getT();
  return (
    <Badge tone="info" title={t('status.sampleDataHint')}>
      {t('status.sampleData')}
    </Badge>
  );
}