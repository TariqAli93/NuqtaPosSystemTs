import { defineStore } from 'pinia';
import { ref } from 'vue';
import { settingsClient } from '../ipc';
import type { SettingsCurrencyResponse, CompanySettingsInput } from '../types/domain';
import type { ApiResult } from '../ipc';

export const useSettingsStore = defineStore('settings', () => {
  const values = ref<Record<string, string | null>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSetting(key: string) {
    loading.value = true;
    error.value = null;
    const result = await settingsClient.get(key);
    if (result.ok) {
      values.value[key] = result.data;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function saveSetting(key: string, value: string) {
    loading.value = true;
    error.value = null;
    const result = await settingsClient.set(key, value);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchCurrencySettings(): Promise<ApiResult<SettingsCurrencyResponse>> {
    loading.value = true;
    error.value = null;
    const result = await settingsClient.getCurrency();
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchCompanySettings() {}

  async function saveCompanySettings(
    payload: CompanySettingsInput
  ): Promise<ApiResult<{ ok: true }>> {
    loading.value = true;
    error.value = null;
    try {
      const result = await settingsClient.setCompany(payload);
      if (!result.ok) {
        error.value = result.error.message;
      }
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, error: { code: 'SAVE_FAILED', message: error.value } };
    } finally {
      loading.value = false;
    }
  }

  return {
    values,
    loading,
    error,
    fetchSetting,
    saveSetting,
    fetchCompanySettings,
    saveCompanySettings,
    fetchCurrencySettings,
  };
});
