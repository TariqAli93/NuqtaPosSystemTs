import { defineStore } from 'pinia';
import { reactive, ref, computed } from 'vue';
import { settingsClient } from '../ipc';
import type { SettingsCurrencyResponse, CompanySettingsInput } from '../types/domain';
import type { ApiResult } from '../ipc';

/**
 * Factory for initial state — keeps a single place for resetting and tests.
 */
function initialState() {
  let selected = null;
  try {
    selected = localStorage.getItem('selectedPrinter') || (null as string | null);
  } catch (e) {
    // localStorage may be unavailable in some test/SSR environments — swallow.
    selected = null;
  }

  return {
    values: {} as Record<string, string | null>,
    loading: false,
    error: null as string | null,
    appVersion: null as string | null,
    printers: [] as Array<unknown>,
    selectedPrinter: selected as string | null,
  };
}

export const useSettingsStore = defineStore('settings', () => {
  // state
  const state = reactive(initialState());

  // debug helper (no-op in production)
  const debug = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.debug('[settingsStore]', ...args);
  };

  // helpers
  function setError(msg: string | null) {
    state.error = msg;
  }

  function setLoading(flag = false) {
    state.loading = flag;
  }

  function setValue(key: string, val: string | null) {
    // write-through setter for reactive map
    state.values[key] = val;
  }

  // Public actions (keep names unchanged to preserve behavior)
  async function fetchSetting(key: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsClient.get(key);
      if (result.ok) setValue(key, result.data);
      else setError(result.error?.message ?? 'Unknown error');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { ok: false, error: { code: 'FETCH_FAILED', message } } as ApiResult<null>;
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsClient.set(key, value);
      if (result.ok) setValue(key, value);
      else setError(result.error?.message ?? 'Unknown error');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { ok: false, error: { code: 'SAVE_FAILED', message } } as ApiResult<null>;
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrencySettings(): Promise<ApiResult<SettingsCurrencyResponse>> {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsClient.getCurrency();
      if (!result.ok) setError(result.error?.message ?? 'Unknown error');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return {
        ok: false,
        error: { code: 'FETCH_FAILED', message },
      } as ApiResult<SettingsCurrencyResponse>;
    } finally {
      setLoading(false);
    }
  }

  // placeholder / kept for API compatibility — implementation lives in the view for now
  async function fetchCompanySettings() {
    // intentionally left as no-op (original store had empty function)
    return {
      ok: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' },
    } as ApiResult<null>;
  }

  async function saveCompanySettings(
    payload: CompanySettingsInput
  ): Promise<ApiResult<{ ok: true }>> {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsClient.setCompany(payload);
      if (!result.ok) setError(result.error?.message ?? 'Unknown error');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { ok: false, error: { code: 'SAVE_FAILED', message } } as ApiResult<{ ok: true }>;
    } finally {
      setLoading(false);
    }
  }

  async function fetchAppVersion() {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsClient.getAppVersion();
      if (result.ok) state.appVersion = result.data.version;
      else setError(result.error?.message ?? 'Unknown error');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { ok: false, error: { code: 'FETCH_FAILED', message } } as ApiResult<null>;
    } finally {
      setLoading(false);
    }
  }

  async function fetchPrinters(): Promise<ApiResult<{ printers: Array<unknown> }>> {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsClient.getPrinters();
      if (!result.ok) {
        setError(result.error?.message ?? 'Unknown error');
        return {
          ok: false,
          error: result.error,
          data: { printers: [] },
        } as any;
      }

      state.printers = result.data.printers;

      // persist a lightweight serializable copy (safe for persisted-state plugin)
      try {
        localStorage.setItem('printers', JSON.stringify(state.printers));
      } catch (e) {
        debug('failed to persist printers to localStorage', e);
      }

      return {
        ok: true,
        data: { printers: state.printers },
      } as any;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return {
        ok: false,
        error: { code: 'FETCH_FAILED', message },
        data: { printers: [] },
      } as any;
    } finally {
      setLoading(false);
    }
  }

  function saveSelectedPrinter(printerName: string | null) {
    state.selectedPrinter = printerName;
    try {
      if (printerName) localStorage.setItem('selectedPrinter', printerName);
      else localStorage.removeItem('selectedPrinter');
    } catch (e) {
      debug('failed to persist selected printer to localStorage', e);
    }
  }

  function reset() {
    const s = initialState();
    state.values = s.values;
    state.loading = s.loading;
    state.error = s.error;
    state.appVersion = s.appVersion;
    state.printers = s.printers;
    state.selectedPrinter = s.selectedPrinter;
  }

  // expose state + actions (public API preserved)
  return {
    // state
    values: state.values,
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    appVersion: computed(() => state.appVersion),
    printers: computed(() => state.printers),
    selectedPrinter: computed(() => state.selectedPrinter),

    // actions
    fetchSetting,
    saveSetting,
    fetchCompanySettings,
    saveCompanySettings,
    fetchCurrencySettings,
    fetchAppVersion,
    fetchPrinters,
    saveSelectedPrinter,

    // utilities
    reset,
  };
});
