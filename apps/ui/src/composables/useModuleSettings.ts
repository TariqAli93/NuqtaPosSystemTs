import { ref, computed, readonly } from 'vue';
import { settingsClient, type AllModuleSettings, type ModuleSettings } from '../ipc/settingsClient';

/**
 * Singleton state — shared across all components that use this composable.
 * Loaded once at app startup and refreshed when settings change.
 */
const moduleSettings = ref<AllModuleSettings | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
let loaded = false;

/**
 * useModuleSettings — reactive module gating composable.
 *
 * Usage:
 *   const { modules, isAccountingEnabled, fetchModuleSettings } = useModuleSettings();
 *
 * The `modules` ref is shared globally so all components see the same state.
 * Call `fetchModuleSettings()` on app startup (e.g., in App.vue or router guard).
 */
export function useModuleSettings() {
  const fetchModuleSettings = async () => {
    if (loaded && moduleSettings.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const result = await settingsClient.getModules();
      if (result.ok && result.data) {
        moduleSettings.value = result.data;
        loaded = true;
      } else if (!result.ok) {
        error.value = result.error?.message || 'فشل تحميل إعدادات الوحدات';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'خطأ غير معروف';
    } finally {
      isLoading.value = false;
    }
  };

  /** Force refresh (e.g., after wizard completion or settings change) */
  const refresh = async () => {
    loaded = false;
    moduleSettings.value = null;
    await fetchModuleSettings();
  };

  // ── Computed boolean flags for gating ──

  const modules = computed<ModuleSettings>(
    () =>
      moduleSettings.value?.modules ?? {
        accountingEnabled: false,
        purchasesEnabled: true,
        ledgersEnabled: true,
        unitsEnabled: false,
        paymentsOnInvoicesEnabled: true,
      }
  );

  const isAccountingEnabled = computed(() => modules.value.accountingEnabled);
  const isPurchasesEnabled = computed(() => modules.value.purchasesEnabled);
  const isLedgersEnabled = computed(() => modules.value.ledgersEnabled);
  const isUnitsEnabled = computed(() => modules.value.unitsEnabled);
  const isPaymentsOnInvoicesEnabled = computed(() => modules.value.paymentsOnInvoicesEnabled);
  const isWizardCompleted = computed(() => moduleSettings.value?.wizardCompleted ?? false);

  const notifications = computed(
    () =>
      moduleSettings.value?.notifications ?? {
        lowStockThreshold: 5,
        expiryDays: 30,
        debtReminderCount: 3,
        debtReminderIntervalDays: 7,
      }
  );

  const invoice = computed(
    () =>
      moduleSettings.value?.invoice ?? {
        templateActiveId: 'default',
        prefix: 'INV',
        paperSize: 'thermal' as const,
        logo: '',
        footerNotes: '',
        layoutDirection: 'rtl' as const,
        showQr: false,
        showBarcode: false,
      }
  );

  return {
    // Raw data
    moduleSettings: readonly(moduleSettings),
    modules,
    notifications,
    invoice,

    // Convenient boolean flags
    isAccountingEnabled,
    isPurchasesEnabled,
    isLedgersEnabled,
    isUnitsEnabled,
    isPaymentsOnInvoicesEnabled,
    isWizardCompleted,

    // Loading state
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    fetchModuleSettings,
    refresh,
  };
}
