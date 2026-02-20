import { ref, computed, onMounted } from 'vue';
import { settingsClient } from '../ipc/settingsClient';
import type { CompanySettings } from '../types/domain';

const companySettings = ref<CompanySettings | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  IQD: 'د.ع',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  SAR: 'ر.س',
  AED: 'د.إ',
  EGP: 'ج.م',
  JOD: 'د.ا',
  KWD: 'د.ك',
};

/**
 * Composable for accessing the single source of truth for currency.
 * This enforces that all prices, totals, and monetary calculations use
 * only the default currency defined in CompanySettings.
 */
export function useCurrency() {
  const fetchCompanySettings = async () => {
    if (companySettings.value) return; // Already loaded

    isLoading.value = true;
    error.value = null;

    try {
      const result = await settingsClient.getCompany();
      if (result.ok && result.data) {
        companySettings.value = result.data;
      } else if (!result.ok) {
        error.value = result.error?.message || 'Failed to load company settings';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  const currency = computed(() => companySettings.value?.currency || 'USD');
  const currencySymbol = computed(() => CURRENCY_SYMBOLS[currency.value] || currency.value);
  const lowStockThreshold = computed(() => companySettings.value?.lowStockThreshold ?? 5);

  /**
   * Formats a number as currency using the system's single currency.
   * @param amount - The numeric amount to format
   * @param options - Optional formatting options
   */
  const formatCurrency = (
    amount: number,
    options?: { showSymbol?: boolean; decimals?: number }
  ): string => {
    const { showSymbol = true, decimals = 0 } = options || {};
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return showSymbol ? `${currencySymbol.value} ${formatted}` : formatted;
  };

  /**
   * Check if a product's stock is at or below the low stock threshold.
   */
  const isLowStock = (stock: number): boolean => {
    return stock > 0 && stock <= lowStockThreshold.value;
  };

  /**
   * Check if a product is out of stock.
   */
  const isOutOfStock = (stock: number): boolean => {
    return stock <= 0;
  };

  // Auto-fetch on mount when composable is first used
  onMounted(() => {
    fetchCompanySettings();
  });

  return {
    companySettings: computed(() => companySettings.value),
    currency,
    currencySymbol,
    lowStockThreshold,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    formatCurrency,
    isLowStock,
    isOutOfStock,
    refetch: fetchCompanySettings,
  };
}
