import 'server-only';
import { isDemoMode } from '../store';
import { chapaProvider } from './chapa';
import { demoPaymentProvider } from './demo';
import { PaymentConfigurationError } from './contract';
import type { PaymentProvider } from './contract';

export { PaymentConfigurationError, PaymentProviderError } from './contract';
export type { PaymentProvider, CheckoutRequest, CheckoutResult, ProviderVerification } from './contract';

/**
 * Which money-mover this build will use.
 *
 * demo mode   -> the clearly-labelled simulator, and nothing else.
 * supabase    -> the configured live provider. If it is not configured, this
 *                throws instead of returning the simulator, because quietly
 *                pretending a demo payment is real is the failure mode that
 *                would make the whole feature untrustworthy.
 *
 * Adding a provider means adding a module here and one case below; the inquiry
 * workflow never learns provider specifics.
 */
export function resolvePaymentProvider(): PaymentProvider {
  if (isDemoMode()) return demoPaymentProvider;

  const requested = (process.env.PAYMENT_PROVIDER ?? 'chapa').trim().toLowerCase();
  if (requested === 'chapa') return chapaProvider;
  if (requested === 'demo_simulated') {
    throw new PaymentConfigurationError(
      'PAYMENT_PROVIDER is set to the demo simulator while DATA_MODE is not demo. Simulated payments only exist in demo mode.'
    );
  }
  throw new PaymentConfigurationError(
    `PAYMENT_PROVIDER="${requested}" is not a provider this build implements. Supported value: chapa.`
  );
}

/** Short description of the live configuration, for an administrator to read. */
export function paymentProviderStatus(): { mode: 'demo' | 'live'; provider: string; configured: boolean; detail: string } {
  if (isDemoMode()) {
    return {
      mode: 'demo',
      provider: 'demo_simulated',
      configured: true,
      detail: 'Demo mode: payments are simulated here and every record is labelled as such. No money moves.'
    };
  }
  const requested = (process.env.PAYMENT_PROVIDER ?? 'chapa').trim().toLowerCase();
  if (requested !== 'chapa') {
    return { mode: 'live', provider: requested, configured: false, detail: `PAYMENT_PROVIDER="${requested}" is not implemented in this build.` };
  }
  const hasSecret = Boolean((process.env.CHAPA_SECRET_KEY ?? '').trim());
  const hasWebhook = Boolean((process.env.CHAPA_WEBHOOK_SECRET ?? '').trim());
  const missing = [
    hasSecret ? null : 'CHAPA_SECRET_KEY',
    hasWebhook ? null : 'CHAPA_WEBHOOK_SECRET'
  ].filter(Boolean);
  return {
    mode: 'live',
    provider: 'chapa',
    configured: missing.length === 0,
    detail: missing.length
      ? `Chapa is selected but ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not set, so payment is unavailable.`
      : 'Chapa is selected and its server-side keys are present. Live payments still require a test transaction before anyone can claim they work.'
  };
}
