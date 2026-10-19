/** Deterministic id for reproducible demo data. Random ids for new records. */
export function makeId(prefix: string): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${rand}`;
}

/** Human-friendly inquiry reference like OL-2026-4F3A */
export function makeReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `OL-${year}-${suffix}`;
}

/**
 * Payment reference, also the merchant_reference a provider echoes back and the
 * receipt number printed on a PDF. Longer than an inquiry reference because it is
 * the one value a provider may use to identify us across systems.
 */
export function makePaymentReference(): string {
  const year = new Date().getFullYear();
  const suffix = makeId('PAY').slice(4).toUpperCase();
  return `PAY-${year}-${suffix}`;
}

