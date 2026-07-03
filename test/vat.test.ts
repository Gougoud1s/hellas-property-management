import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidGreekVat, formatVat, vatDigits, normalizeVat } from '../src/lib/vat';

test('accepts a checksum-valid Greek VAT (with and without EL prefix)', () => {
  // 094014201 is a real, checksum-valid ΑΦΜ.
  assert.equal(isValidGreekVat('094014201'), true);
  assert.equal(isValidGreekVat('EL094014201'), true);
  assert.equal(isValidGreekVat(' el 094014201 '), true);
});

test('rejects malformed or checksum-invalid VATs', () => {
  assert.equal(isValidGreekVat('123456789'), false, 'bad checksum');
  assert.equal(isValidGreekVat('000000000'), false, 'all zeros');
  assert.equal(isValidGreekVat('12345'), false, 'too short');
  assert.equal(isValidGreekVat('EL12345678X'), false, 'non-digit');
  assert.equal(isValidGreekVat(''), false);
});

test('vatDigits extracts the 9-digit core or empty', () => {
  assert.equal(vatDigits('EL094014201'), '094014201');
  assert.equal(vatDigits('094014201'), '094014201');
  assert.equal(vatDigits('abc'), '');
});

test('formatVat canonicalises to EL + 9 digits', () => {
  assert.equal(formatVat('094014201'), 'EL094014201');
  assert.equal(formatVat('el 094014201'), 'EL094014201');
  // Non-conforming input is normalised but not fabricated into a VAT.
  assert.equal(formatVat('foo'), 'FOO');
});

test('normalizeVat strips whitespace and upper-cases', () => {
  assert.equal(normalizeVat(' el094 014 201 '), 'EL094014201');
});
