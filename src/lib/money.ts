import type { Money } from './types';

/** Format integer cents as an ETB amount string with two decimals. No floats. */
export function formatMoney(money: Money): string {
  const sign = money.cents < 0 ? '-' : '';
  const abs = Math.abs(money.cents);
  const etb = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${sign}${groupThousands(etb)}.${cents} ${money.currency}`;
}

export function formatMoneyCompact(money: Money): string {
  const abs = Math.abs(money.cents);
  if (abs % 100 === 0) {
    return `${groupThousands(Math.floor(abs / 100))} ${money.currency}`;
  }
  return formatMoney(money);
}

function groupThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function etbToCents(etb: number): number {
  if (!Number.isFinite(etb)) throw new Error('Invalid ETB value');
  return Math.round(etb * 100);
}

export function multiplyUnitPrice(unitCents: number, qty: number): number {
  if (!Number.isInteger(unitCents)) throw new Error('unitCents must be integer');
  if (!Number.isFinite(qty) || qty < 0) throw new Error('qty invalid');
  // Multiply in integer space, round half-up.
  return Math.round(unitCents * qty);
}

export function parseDecimalAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  const cents = Number(whole) * 100 + Number(fracPadded);
  if (!Number.isFinite(cents)) return null;
  return cents;
}
