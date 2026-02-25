<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="mb-6" border="bottom">
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('settings.title') }}</div>
          <div class="text-sm">{{ t('settings.subtitle') }}</div>
        </v-app-bar-title>
      </v-app-bar>

      <v-card class="win-card" flat>
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="system">إعدادات النظام</v-tab>
          <v-tab value="pos">نقطة البيع</v-tab>
          <v-tab value="accounting">المحاسبة</v-tab>
          <v-tab value="barcode">الباركود</v-tab>
          <v-tab v-if="canManageUsers" value="users">المستخدمين</v-tab>
        </v-tabs>

        <v-divider />

        <v-window v-model="activeTab">
          <v-window-item value="system">
            <v-card-text>
              <SystemSettingsTab />
            </v-card-text>
          </v-window-item>

          <v-window-item value="pos">
            <v-card-text>
              <PosSettingsTab />
            </v-card-text>
          </v-window-item>

          <v-window-item value="accounting">
            <v-card-text>
              <AccountingSettingsTab />
            </v-card-text>
          </v-window-item>

          <v-window-item value="barcode">
            <v-card-text>
              <BarcodeSettingsTab />
            </v-card-text>
          </v-window-item>

          <v-window-item v-if="canManageUsers" value="users">
            <v-card-text>
              <UsersTab />
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { t } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';
import * as uiAccess from '../../auth/uiAccess';
import SystemSettingsTab from '@/components/settings/SystemSettingsTab.vue';
import PosSettingsTab from '@/components/settings/PosSettingsTab.vue';
import AccountingSettingsTab from '@/components/settings/AccountingSettingsTab.vue';
import BarcodeSettingsTab from '@/components/settings/BarcodeSettingsTab.vue';
import UsersTab from '@/components/settings/UsersTab.vue';

type SettingsTab = 'system' | 'pos' | 'accounting' | 'barcode' | 'users';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref<SettingsTab>('system');

const canManageUsers = computed(() => {
  const role = authStore.user?.role;
  if (!role) return false;
  if (uiAccess.canManageUsers(role)) return true;

  return authStore.permissions.some((permission) =>
    ['users:read', 'users:create', 'users:update', 'users:delete'].includes(permission)
  );
});

const validTabs: SettingsTab[] = ['system', 'pos', 'accounting', 'barcode', 'users'];

function normalizeQueryTab(value: unknown): SettingsTab {
  if (typeof value === 'string' && validTabs.includes(value as SettingsTab)) {
    return value as SettingsTab;
  }
  return 'system';
}

function resolveAllowedTab(tab: SettingsTab): SettingsTab {
  if (tab === 'users' && !canManageUsers.value) return 'system';
  return tab;
}

async function syncTabFromRoute(): Promise<void> {
  const queryValue = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab;
  const requestedTab = normalizeQueryTab(queryValue);
  const allowedTab = resolveAllowedTab(requestedTab);

  if (activeTab.value !== allowedTab) {
    activeTab.value = allowedTab;
  }

  if (queryValue !== allowedTab) {
    await router.replace({
      query: {
        ...route.query,
        tab: allowedTab,
      },
    });
  }
}

watch(
  [() => route.query.tab, canManageUsers],
  () => {
    void syncTabFromRoute();
  },
  { immediate: true }
);

watch(activeTab, (tab) => {
  const allowedTab = resolveAllowedTab(tab);
  if (tab !== allowedTab) {
    activeTab.value = allowedTab;
    return;
  }

  const queryValue = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab;
  if (queryValue !== allowedTab) {
    void router.replace({
      query: {
        ...route.query,
        tab: allowedTab,
      },
    });
  }
});
</script>
