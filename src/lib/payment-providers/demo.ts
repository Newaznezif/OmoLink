import 'server-only';
import { PROVIDER_STATUS_TO_PAYMENT, type ProviderStatus } from '../payments';
import type { CheckoutRequest, CheckoutResult, PaymentProvider, ProviderVerification } from './contract';

/**
 * The demo-mode "provider". It exists so the whole inquiry → payment → receipt
 * path can be demonstrated and tested without money moving, and it is the only
 * implementation whose `live` flag is false.
 *
 * It is reachable only while DATA_MODE=demo. Every record it touches carries
 * `isDemo: true`, which is what the buyer, seller and administrator screens print
 * as "simulated payment", and the label cannot be turned off from the browser.
 *
 * The scenarios are deterministic: the demo checkout page offers exactly the four
 * outcomes below, each is recorded here keyed by our payment reference, and the
 * workflow then reads it back through the same `verify()` call a real provider is
 * checked with. So the code path under demonstration is the production path, not a
 * shortcut around it.
 */

export type DemoOutcome = 'success' | 'pending' | 'failed' | 'cancelled';

export const DEMO_OUTCOMES: DemoOutcome[] = ['success', 'pending', 'failed', 'cancelled'];

const CHECKOUT_WINDOW_MS = 15 * 60 * 1000;

type RecordedAttempt = {
  outcome: ProviderStatus;
  amount: unknown;
  currency: unknown;
};

/**
 * Module state standing in for the provider's servers.
 *
 * It hangs off `globalThis` for the same reason the demo store does (see
 * ./../../store.ts): in `next dev` each route compiles separately and a
 * module-level `Map` is rebuilt when a new route is touched, which would make a
 * checkout that was just opened suddenly unknown to its own verification call.
 * Like the rest of demo mode it is per-process and disappears on a cold restart.
 */
declare global {
  // eslint-disable-next-line no-var
  var __omolinkDemoPaymentAttempts: Map<string, RecordedAttempt> | undefined;
}

function attempts(): Map<string, RecordedAttempt> {
  if (!globalThis.__omolinkDemoPaymentAttempts) globalThis.__omolinkDemoPaymentAttempts = new Map();
  return globalThis.__omolinkDemoPaymentAttempts;
}

function key(reference: string): string {
  return reference.trim();
}

export const demoPaymentProvider: PaymentProvider = {
  id: 'demo_simulated',
  live: false,

  async initiate(request: CheckoutRequest): Promise<CheckoutResult> {
    const amountText = (Math.floor(request.amountCents) / 100).toFixed(2);
    attempts().set(key(request.reference), { outcome: 'pending', amount: amountText, currency: request.currency });
    return {
      checkoutUrl: `/pay/demo/${encodeURIComponent(request.reference)}`,
      providerReference: `DEMO-${key(request.reference)}`,
      expiresAt: new Date(Date.now() + CHECKOUT_WINDOW_MS).toISOString()
    };
  },

  async verify(merchantReference: string): Promise<ProviderVerification> {
    const attempt = attempts().get(key(merchantReference));
    if (!attempt) {
      // Mirrors a real provider: an unknown reference is an error, not a non-payment.
      throw new Error('The simulated provider has no record of that payment reference.');
    }
    return {
      status: attempt.outcome,
      amount: attempt.amount,
      currency: attempt.currency,
      providerReference: `DEMO-${key(merchantReference)}`,
      paymentMethod: 'Simulated (demo mode)'
    };
  }
};

/**
 * Called by the demo checkout page only. It is the simulator's equivalent of a
 * buyer finishing (or abandoning) payment on a hosted page.
 */
export function recordDemoOutcome(reference: string, outcome: DemoOutcome): void {
  const attempt = attempts().get(key(reference));
  if (!attempt) throw new Error('The simulated provider has no record of that payment reference.');
  attempts().set(key(reference), { ...attempt, outcome });
}

/** Test and demonstration helper: the status this outcome will produce. */
export function demoOutcomeStatus(outcome: DemoOutcome) {
  return PROVIDER_STATUS_TO_PAYMENT[outcome];
}

export function isDemoOutcome(value: unknown): value is DemoOutcome {
  return typeof value === 'string' && (DEMO_OUTCOMES as string[]).includes(value);
}

/** Used by the suite so a scenario never leaks into the next test run. */
export function clearDemoPaymentAttempts(): void {
  attempts().clear();
}
