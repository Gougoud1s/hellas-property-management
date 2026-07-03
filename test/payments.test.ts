import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAmount } from '../server/validation';

test('accepts well-formed amounts and normalises to cents', () => {
  assert.deepEqual(validateAmount(124.5), { cents: 12450, euros: 124.5 });
  assert.deepEqual(validateAmount('99.99'), { cents: 9999, euros: 99.99 });
  assert.deepEqual(validateAmount(0.5), { cents: 50, euros: 0.5 });
});

test('rejects out-of-range, non-finite, and malformed amounts (S5)', () => {
  assert.equal(validateAmount(0), null, 'below minimum');
  assert.equal(validateAmount(0.49), null, 'below Viva floor');
  assert.equal(validateAmount(-100), null, 'negative');
  assert.equal(validateAmount(50000.01), null, 'above ceiling');
  assert.equal(validateAmount(Number.POSITIVE_INFINITY), null, 'infinite');
  assert.equal(validateAmount(NaN), null, 'NaN');
  assert.equal(validateAmount('abc'), null, 'non-numeric string');
  assert.equal(validateAmount(1.005), null, 'sub-cent precision');
  assert.equal(validateAmount(undefined), null);
  assert.equal(validateAmount(null), null);
});
