import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestSellingPrice } from '../src/lib/pricing';
import { formatMoney, multiplyUnitPrice, parseDecimalAmount } from '../src/lib/money';

test('parseDecimalAmount returns integer cents and rejects more than two decimals', () => {
  assert.equal(parseDecimalAmount('12.34'), 1234);
  assert.equal(parseDecimalAmount('800'), 80000);
  assert.equal(parseDecimalAmount('1.234'), null);
  assert.equal(parseDecimalAmount('abc'), null);
  assert.equal(parseDecimalAmount(''), null);
});

test('unit price multiplication stays in integer space', () => {
  assert.equal(multiplyUnitPrice(6800, 10), 68000);
  assert.equal(formatMoney({ cents: 68000, currency: 'ETB' }), '680.00 ETB');
  assert.equal(formatMoney({ cents: 1250000, currency: 'ETB' }), '12,500.00 ETB');
});

test('markup on cost is reported separately from margin on selling price', () => {
  const result = suggestSellingPrice(80000, 25);
  assert.equal(result.totalCostCents, 80000);
  assert.equal(result.suggestedPriceCents, 100000);
  assert.equal(result.profitCents, 20000);
  assert.equal(result.marginPercent, 20);
});

test('zero cost does not divide by zero', () => {
  assert.deepEqual(suggestSellingPrice(0, 25), {
    totalCostCents: 0,
    suggestedPriceCents: 0,
    profitCents: 0,
    marginPercent: 0
  });
});

test('negative or fractional inputs are rejected', () => {
  assert.throws(() => suggestSellingPrice(-1, 10), /non-negative integer/);
  assert.throws(() => suggestSellingPrice(12.5, 10), /non-negative integer/);
  assert.throws(() => suggestSellingPrice(100, -1), /zero or greater/);
});
