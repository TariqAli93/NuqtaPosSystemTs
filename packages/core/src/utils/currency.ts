/**
 * Round amount based on currency
 * For IQD: round to nearest multiple of 250 (smallest denomination)
 * For USD: round to nearest integer
 */
export function roundByCurrency(amount: number, currency: string): number {
  if (currency === 'IQD') {
    // Round to nearest multiple of 250
    return Math.ceil(amount / 250) * 250;
  } else {
    // For USD and other currencies, round to nearest integer
    return Math.ceil(amount);
  }
}
