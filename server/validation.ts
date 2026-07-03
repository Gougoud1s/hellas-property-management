// Pure, dependency-free validators shared by the API routes. Kept separate from
// the Express routers so they can be unit-tested without importing express.

// Hard bounds for a single common-charges payment. Viva's floor is €0.30;
// anything above the ceiling is almost certainly a tampered/erroneous request.
export const MIN_AMOUNT = 0.5;
export const MAX_AMOUNT = 50000;

/**
 * Validates a client-supplied money amount (S5). The client is never trusted to
 * send a well-formed or in-range value: we require a finite positive number with
 * at most two decimals, within sane bounds, and return it normalised to cents.
 */
export function validateAmount(raw: unknown): { cents: number; euros: number } | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < MIN_AMOUNT || value > MAX_AMOUNT) return null;
  const cents = Math.round(value * 100);
  // Reject sub-cent precision that Math.round would silently swallow.
  if (Math.abs(value * 100 - cents) > 1e-6) return null;
  return { cents, euros: cents / 100 };
}
