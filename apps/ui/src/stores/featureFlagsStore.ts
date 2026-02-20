import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { setupClient, type AccountingSetupStatus } from '../ipc/setupClient';
import { settingsClient, type AllModuleSettings } from '../ipc/settingsClient';

export const useFeatureFlagsStore = defineStore('featureFlags', () => {
  const initialized = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const accountingEnabledDecision = ref<boolean | null>(null);
  const coaSeeded = ref(false);

  // ── Module toggle state ──
  const purchasesEnabled = ref(true);
  const ledgersEnabled = ref(true);
  const unitsEnabled = ref(true);
  const paymentsOnInvoicesEnabled = ref(true);
  const wizardCompleted = ref(false);

  const accountingEnabled = computed(() => accountingEnabledDecision.value === true);
  const accountingReady = computed(() => accountingEnabled.value && coaSeeded.value);
  const simpleMode = computed(() => accountingEnabledDecision.value === false);

  function applyStatus(status: AccountingSetupStatus): void {
    accountingEnabledDecision.value = status.enabled;
    coaSeeded.value = status.seeded;
    initialized.value = true;
    error.value = null;
  }

  function applyModuleSettings(data: AllModuleSettings): void {
    // Do NOT overwrite accountingEnabledDecision here — applyStatus is the
    // authoritative source (reads 'accounting.enabled' via setup:getAccountingSetupStatus).
    // Only apply the per-module toggles.
    purchasesEnabled.value = data.modules.purchasesEnabled;
    ledgersEnabled.value = data.modules.ledgersEnabled;
    unitsEnabled.value = data.modules.unitsEnabled;
    paymentsOnInvoicesEnabled.value = data.modules.paymentsOnInvoicesEnabled;
    wizardCompleted.value = data.wizardCompleted;
  }

  async function hydrate(force = false): Promise<void> {
    if (loading.value) return;
    if (initialized.value && !force) return;

    loading.value = true;

    // Fetch both accounting status and module settings in parallel
    const [acctResult, moduleResult] = await Promise.all([
      setupClient.getAccountingSetupStatus(),
      settingsClient.getModules(),
    ]);

    if (acctResult.ok) {
      applyStatus(acctResult.data);
    } else {
      error.value = acctResult.error.message;
      accountingEnabledDecision.value = true;
      coaSeeded.value = false;
      initialized.value = true;
    }

    if (moduleResult.ok) {
      applyModuleSettings(moduleResult.data);
    }

    loading.value = false;
  }

  return {
    initialized,
    loading,
    error,
    accountingEnabledDecision,
    accountingEnabled,
    accountingReady,
    simpleMode,
    coaSeeded,
    // Module toggles
    purchasesEnabled,
    ledgersEnabled,
    unitsEnabled,
    paymentsOnInvoicesEnabled,
    wizardCompleted,
    hydrate,
    applyStatus,
    applyModuleSettings,
  };
});
