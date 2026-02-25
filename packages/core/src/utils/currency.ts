/**
 * Enforce money precision by currency.
 * IQD is integer-only and must not be silently rounded.
 */
export function roundByCurrency(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a finite number');
  }
  if (currency === 'IQD' && !Number.isInteger(amount)) {
    throw new Error('IQD amounts must be integers');
  }
  return amount;
}
