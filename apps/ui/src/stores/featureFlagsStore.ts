import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { setupClient, type AccountingSetupStatus } from '../ipc/setupClient';

export const useFeatureFlagsStore = defineStore('featureFlags', () => {
  const initialized = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const accountingEnabledDecision = ref<boolean | null>(null);
  const coaSeeded = ref(false);

  const accountingEnabled = computed(() => accountingEnabledDecision.value === true);
  const accountingReady = computed(() => accountingEnabled.value && coaSeeded.value);
  const simpleMode = computed(() => accountingEnabledDecision.value === false);

  function applyStatus(status: AccountingSetupStatus): void {
    accountingEnabledDecision.value = status.enabled;
    coaSeeded.value = status.seeded;
    initialized.value = true;
    error.value = null;
  }

  async function hydrate(force = false): Promise<void> {
    if (loading.value) return;
    if (initialized.value && !force) return;

    loading.value = true;
    const result = await setupClient.getAccountingSetupStatus();
    if (result.ok) {
      applyStatus(result.data);
    } else {
      error.value = result.error.message;
      accountingEnabledDecision.value = true;
      coaSeeded.value = false;
      initialized.value = true;
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
    hydrate,
    applyStatus,
  };
});
