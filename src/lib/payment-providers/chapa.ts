import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { centsToMajorUnits, isProviderStatus, majorUnitsToCents } from '../payments';
import { PaymentConfigurationError, PaymentProviderError } from './contract';
import type { CheckoutRequest, CheckoutResult, PaymentProvider, ProviderVerification } from './contract';

/**
 * Chapa, the hosted-checkout provider documented at docs.chapa.global.
 *
 * Only what that documentation states is used here:
 *   POST https://api.chapa.global/v2/payments/hosted
 *     body  { amount, currency, merchant_reference, phone_number? }
 *     reply { status, message, data: { checkout_url, created_at, expires_at } }
 *   GET  https://api.chapa.global/v2/payments/{reference}/verify
 *     reply data { chapa_reference, merchant_reference, amount, currency, status,
 *                  payment_method, service_fee, customer, created_at, updated_at }
 *     documented status values: success | pending | failed | cancelled |
 *                               incomplete | blocked
 *   webhook header x-chapa-signature = HMAC-SHA256(key = webhook secret,
 *                                                  message = raw request body)
 *
 * Deliberately NOT used, because the documentation does not state them: a
 * `redirect_url` / return-link field, the internal shape of `customer`, and any
 * refund endpoint. A buyer who comes back from the hosted page is answered by
 * re-running the documented verify call, which is also why a redirect on its own
 * cannot mark anything paid.
 */

const BASE_URL = 'https://api.chapa.global';
const REQUEST_TIMEOUT_MS = 12_000;

function secretKey(): string {
  const key = (process.env.CHAPA_SECRET_KEY ?? '').trim();
  if (!key) {
    throw new PaymentConfigurationError(
      'Chapa is configured as the payment provider but CHAPA_SECRET_KEY is not set, so no payment can be taken. ' +
        'Set the provider secret key in the deployment environment. This build will not fall back to simulated payments.'
    );
  }
  return key;
}

function webhookSecret(): string {
  const secret = (process.env.CHAPA_WEBHOOK_SECRET ?? '').trim();
  if (!secret) {
    throw new PaymentConfigurationError('CHAPA_WEBHOOK_SECRET is not set, so incoming payment notifications cannot be authenticated.');
  }
  return secret;
}

async function callChapa(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new PaymentProviderError('The payment provider could not be reached. No payment has been recorded as paid.');
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PaymentProviderError(`The payment provider returned a response that is not readable (HTTP ${response.status}).`);
  }
  const body = (payload ?? {}) as Record<string, unknown>;
  if (!response.ok || body.status === false) {
    const detail = typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
    throw new PaymentProviderError(`The payment provider refused the request: ${detail}`);
  }
  return body;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const chapaProvider: PaymentProvider = {
  id: 'chapa',
  live: true,

  async initiate(request: CheckoutRequest): Promise<CheckoutResult> {
    // The amount is rebuilt from persisted integer cents; nothing in this payload
    // can be influenced by a browser.
    const amount = Number(centsToMajorUnits(request.amountCents));
    if (!Number.isFinite(amount) || amount <= 0) throw new PaymentProviderError('Refusing to charge a zero or unreadable amount.');

    const payload: Record<string, unknown> = {
      amount,
      currency: request.currency,
      merchant_reference: request.reference
    };
    // phone_number is documented as conditionally required. We only send it when
    // what the buyer left looks like a phone number, and never invent one.
    if (/^[+?\d][\d\s-]{6,19}$/.test(request.buyerContact.trim())) payload.phone_number = request.buyerContact.replace(/\s+/g, '');

    const body = await callChapa('/v2/payments/hosted', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = asRecord(body.data);
    const checkoutUrl = text(data.checkout_url);
    if (!checkoutUrl || !/^https:\/\//.test(checkoutUrl)) {
      throw new PaymentProviderError('The payment provider did not return a usable checkout address, so no payment was started.');
    }
    return {
      checkoutUrl,
      providerReference: text(data.chapa_reference),
      expiresAt: text(data.expires_at)
    };
  },

  async verify(merchantReference: string): Promise<ProviderVerification> {
    const reference = merchantReference.trim();
    if (!reference) throw new PaymentProviderError('No payment reference to verify.');
    const body = await callChapa(`/v2/payments/${encodeURIComponent(reference)}/verify`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' }
    });
    const data = asRecord(body.data);
    const status = text(data.status);
    if (!isProviderStatus(status)) {
      throw new PaymentProviderError('The payment provider reported a status this build does not understand, so nothing was marked paid.');
    }
    const feeCents = data.service_fee === undefined || data.service_fee === null ? undefined : majorUnitsToCents(data.service_fee);
    return {
      status,
      amount: data.amount,
      currency: data.currency,
      providerReference: text(data.chapa_reference),
      paymentMethod: text(data.payment_method),
      feeCents: feeCents === null ? undefined : feeCents
    };
  }
};

/**
 * Authenticates an incoming provider notification against the raw request body.
 *
 * The documentation fixes the algorithm — HMAC-SHA256 keyed with the webhook
 * secret over the raw body — but does not state the encoding of the digest, so
 * both the hexadecimal and the base64 rendering of the same digest are accepted.
 * Confirming which one the live service sends is the first task of a real
 * provider test; until then this handler is exercised only with locally generated
 * signatures, and no claim is made that production webhooks have been received.
 */
export function verifyChapaWebhook(rawBody: string, signatureHeader: string | undefined): boolean {
  const provided = (signatureHeader ?? '').trim();
  if (!provided) return false;
  const secret = webhookSecret();
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const candidates = [digest.toString('hex'), digest.toString('base64'), `sha256=${digest.toString('hex')}`];
  const normalized = provided.toLowerCase();
  return candidates.some((candidate) => {
    const expected = candidate.toLowerCase();
    if (expected.length !== normalized.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
  });
}

/** The merchant reference a signed notification refers to; our own field name. */
export function webhookMerchantReference(parsedBody: unknown): string | undefined {
  const data = asRecord(asRecord(parsedBody).data);
  const candidate = text(data.merchant_reference) ?? text(asRecord(parsedBody).merchant_reference);
  return candidate;
}
