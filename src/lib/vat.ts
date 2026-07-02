/**
 * Greek VAT (ΑΦΜ) helpers.
 *
 * A Greek VAT is 9 digits, optionally prefixed with the "EL" country code for
 * VIES. Validity is verified with the official ΑΦΜ modulo-11 checksum.
 */

/** Strips whitespace and upper-cases; keeps an optional leading EL prefix. */
export function normalizeVat(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/** Returns the 9-digit core (without the EL prefix), or '' if not 9 digits. */
export function vatDigits(input: string): string {
  let value = normalizeVat(input);
  if (value.startsWith('EL')) value = value.slice(2);
  return /^\d{9}$/.test(value) ? value : '';
}

/** Canonical stored form: "EL" + 9 digits (only when the digits are present). */
export function formatVat(input: string): string {
  const digits = vatDigits(input);
  return digits ? `EL${digits}` : normalizeVat(input);
}

/** Validates a Greek VAT/ΑΦΜ using the modulo-11 checksum. */
export function isValidGreekVat(input: string): boolean {
  const digits = vatDigits(input);
  if (!digits) return false;
  if (/^0+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    // Weights are 2^8 .. 2^1 for the first eight digits.
    sum += Number(digits[i]) * (1 << (8 - i));
  }
  const check = (sum % 11) % 10;
  return check === Number(digits[8]);
}
