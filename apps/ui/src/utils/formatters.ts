/**
 * Shared formatting utilities — single source of truth.
 *
 * `formatDate`  — Arabic-Iraqi locale date string
 * `formatMoney` — number with thousands separator + currency suffix
 */

/**
 * Format a date string for display in Arabic-Iraqi locale.
 * Returns '—' for falsy/missing input.
 */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
}

/**
 * Format a monetary value with thousands separator.
 * Appends the hard-coded IQD symbol `د.ع` — for settings-aware formatting
 * prefer `useCurrency().formatCurrency()`.
 */
export function formatMoney(value: number): string {
  return `${(value || 0).toLocaleString('en-US')} د.ع`;
}
