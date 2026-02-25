/**
 * Shared accounting display helpers.
 * Extracted from FinanceInventoryWorkspaceView to avoid duplicating
 * account-type labels across views.
 */

export function useAccountingHelpers() {
  function accountTypeLabel(value: string): string {
    if (value === 'asset') return 'اصول';
    if (value === 'liability') return 'التزامات';
    if (value === 'equity') return 'حقوق ملكية';
    if (value === 'revenue') return 'إيرادات';
    if (value === 'expense') return 'مصاريف';
    return value;
  }

  function accountTypeColor(value: string): string {
    if (value === 'asset') return 'primary';
    if (value === 'liability') return 'error';
    if (value === 'equity') return 'info';
    if (value === 'revenue') return 'success';
    if (value === 'expense') return 'warning';
    return 'default';
  }

  return {
    accountTypeLabel,
    accountTypeColor,
  };
}
