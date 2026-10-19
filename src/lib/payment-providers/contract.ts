import 'server-only';
import { PaymentConfigurationError } from '../payments';
import type { PaymentProviderId, CurrencyCode } from '../types';
import type { PaymentStatus } from '../types';
import type { ProviderStatus } from '../payments';

/**
 * Re-exported so existing importers keep one address for it. The class itself is
 * defined in ../payments.ts, where the repositories can reach it without loading
 * anything marked server-only.
 */
export { PaymentConfigurationError };

/**
 * The boundary between the inquiry workflow and whatever money-mover is wired up.
 *
 * Nothing outside this folder may know a provider's field names, so a second
 * provider is a new module plus one entry in `resolvePaymentProvider()`, not a
 * change to the workflow. Both implementations are server-only: the secret key
 * never reaches the browser.
 */

export type CheckoutRequest = {
  /** Our payment reference; the provider echoes it back as merchant_reference. */
  reference: string;
  amountCents: number;
  currency: CurrencyCode;
  description: string;
  buyerName: string;
  buyerContact: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  providerReference?: string;
  /** ISO timestamp the provider says its checkout window closes, if it says. */
  expiresAt?: string;
};

export type ProviderVerification = {
  status: ProviderStatus;
  /** Reported amount in the provider's major units, exactly as returned. */
  amount: unknown;
  currency: unknown;
  providerReference?: string;
  paymentMethod?: string;
  feeCents?: number;
};

export type PaymentProvider = {
  id: PaymentProviderId;
  /**
   * False for the demo simulator. `live === false` is what the UI checks before
   * it prints a "simulated payment" label, so a demonstration can never be
   * mistaken for money that moved.
   */
  live: boolean;
  initiate(request: CheckoutRequest): Promise<CheckoutResult>;
  verify(merchantReference: string): Promise<ProviderVerification>;
};

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

/** Status our records use, kept here so provider modules do not import each other. */
export type { PaymentStatus };
