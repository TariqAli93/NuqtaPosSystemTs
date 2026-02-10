import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import router from '../app/router';
import { authClient, registerUnauthorizedHandler } from '../ipc';
import type { FirstUserInput, UserPublic } from '../types/domain';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserPublic | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null
  );
  const permissions = ref<string[]>(
    localStorage.getItem('permissions')
      ? JSON.parse(localStorage.getItem('permissions') as string)
      : []
  );
  const token = ref<string | null>(localStorage.getItem('token'));
  const isAuthenticated = ref(false);
  const isFirstRun = ref(true);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isLoggingOut = ref(false);

  const currentUser = computed(() =>
    user.value ? { ...user.value, permissions: permissions.value } : null
  );

  if (typeof window !== 'undefined') {
    registerUnauthorizedHandler(() => {
      if (token.value || user.value) {
        logout('session_expired');
        router.replace({
          name: 'Login',
          query: { redirect: router.currentRoute.value.fullPath },
        });
      }
    });
  }

  async function checkInitialSetup() {
    loading.value = true;
    error.value = null;
    try {
      const result = await authClient.checkInitialSetup();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      isFirstRun.value = result.data.isFirstRun;
      return result;
    } catch (err: any) {
      error.value = err.message || 'Failed to check setup status';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: { username: string; password: string }) {
    loading.value = true;
    error.value = null;
    try {
      const result = await authClient.login(credentials);
      if (!result.ok) {
        throw new Error(result.error.message);
      }

      user.value = result.data.user;
      permissions.value = result.data.permissions || [];
      token.value = result.data.accessToken;
      isAuthenticated.value = true;

      localStorage.setItem('token', result.data.accessToken);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      localStorage.setItem('permissions', JSON.stringify(result.data.permissions || []));

      startSessionCheck();

      return result;
    } catch (err: any) {
      error.value = err.message || 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createFirstUser(userData: FirstUserInput) {
    loading.value = true;
    error.value = null;
    try {
      const result = await authClient.createFirstUser(userData);
      if (!result.ok) {
        throw new Error(result.error.message);
      }

      user.value = result.data.user;
      permissions.value = result.data.permissions || [];
      token.value = result.data.accessToken;
      isAuthenticated.value = true;
      isFirstRun.value = false;

      localStorage.setItem('token', result.data.accessToken);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      localStorage.setItem('permissions', JSON.stringify(result.data.permissions || []));

      startSessionCheck();

      return result;
    } catch (err: any) {
      error.value = err.message || 'Setup failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function ensureAuthenticated(): Promise<boolean> {
    if (!token.value) {
      isAuthenticated.value = false;
      return false;
    }

    try {
      const result = await authClient.getCurrentUser();
      if (result.ok) {
        user.value = result.data.user;
        permissions.value = result.data.permissions || [];
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('permissions', JSON.stringify(result.data.permissions || []));
        isAuthenticated.value = true;
        return true;
      }
    } catch (err) {
      // Fall through to logout
    }

    logout('invalid_token');
    isAuthenticated.value = false;
    return false;
  }

  let sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

  function startSessionCheck(intervalMs = 60_000) {
    stopSessionCheck();
    sessionCheckInterval = setInterval(async () => {
      if (!token.value) return;
      try {
        const result = await authClient.getCurrentUser();
        if (!result.ok) {
          logout('session_check_failed');
          router.replace({
            name: 'Login',
            query: { redirect: router.currentRoute.value.fullPath },
          });
        }
      } catch {
        logout('session_check_error');
        router.replace({
          name: 'Login',
          query: { redirect: router.currentRoute.value.fullPath },
        });
      }
    }, intervalMs);
  }

  function stopSessionCheck() {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  }

  async function validateToken(token: string): Promise<boolean> {
    try {
      const result = await authClient.validateToken({ token });
      return result.ok;
    } catch (err) {
      return false;
    }
  }

  function logout(reason?: string) {
    if (isLoggingOut.value) return;
    isLoggingOut.value = true;

    try {
      stopSessionCheck();

      if (reason) {
        console.log(`[Auth] Logout: ${reason}`);
      }

      void authClient.logout();

      user.value = null;
      permissions.value = [];
      token.value = null;
      isAuthenticated.value = false;
      error.value = null;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
    } finally {
      isLoggingOut.value = false;
    }
  }

  return {
    user,
    permissions,
    token,
    currentUser,
    isAuthenticated,
    isFirstRun,
    loading,
    error,
    checkInitialSetup,
    login,
    createFirstUser,
    ensureAuthenticated,
    logout,
    validateToken,
    startSessionCheck,
    stopSessionCheck,
  };
});
