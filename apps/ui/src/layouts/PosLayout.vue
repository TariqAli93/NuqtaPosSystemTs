<template>
  <v-app>
    <v-navigation-drawer location="bottom" rail rail-width="80" permanent>
      <div class="flex items-center justify-center h-full pa-3">
        <div>
          <v-btn
            variant="text"
            class="mx-2"
            size="large"
            v-for="item in primaryNav"
            :key="item.to"
            :to="item.to"
          >
            <template #prepend>
              <v-icon size="20">{{ item.icon }}</v-icon>
            </template>

            <template #default>
              <span class="text-caption">{{ item.label }}</span>
            </template>
          </v-btn>
        </div>

        <v-spacer />

        <div>
          <v-btn
            variant="text"
            class="mx-2"
            size="large"
            v-for="item in footerNav"
            :key="item.to"
            :to="item.to"
          >
            <template #prepend>
              <v-icon size="20">{{ item.icon }}</v-icon>
            </template>

            <template #default>
              <span class="text-caption">{{ item.label }}</span>
            </template>
          </v-btn>
        </div>
      </div>
      <!-- <v-list nav density="comfortable" class="flex">
        <v-list-item v-for="item in primaryNav" :key="item.to" :to="item.to">
          <div class="d-flex flex-column gap-4 py-4 align-center justify-center">
            <v-icon size="20">{{ item.icon }}</v-icon>
            <v-list-item-title>{{ item.label }}</v-list-item-title>
          </div>
        </v-list-item>
      </v-list> -->

      <!-- <template #append>
        <v-list nav density="comfortable">
          <v-list-item v-for="item in footerNav" :key="item.to" :to="item.to">
            <div class="d-flex flex-column gap-4 py-4 align-center justify-center">
              <v-icon size="20">{{ item.icon }}</v-icon>
              <v-list-item-title>{{ item.label }}</v-list-item-title>
            </div>
          </v-list-item>
        </v-list>
      </template> -->
    </v-navigation-drawer>

    <v-app-bar flat density="comfortable" height="56" border="b">
      <v-sheet class="d-flex align-center ga-4 px-6">
        <div>
          <div class="text-caption text-medium-emphasis">
            {{ currentDate }} <span class="mx-2">|</span> {{ currentUser }}
          </div>
        </div>
        <v-card class="d-flex align-center ga-2 px-3 py-1">
          <v-icon size="16">mdi-clock-outline</v-icon>
          <span class="text-caption">{{ t('pos.shift') }}:</span>
          <span class="text-caption">{{ shiftTime }}</span>
        </v-card>
      </v-sheet>

      <v-spacer />

      <v-chip :color="isOnline ? 'success' : 'error'" variant="tonal" size="small" class="mr-2">
        <v-icon start size="12">mdi-check-circle</v-icon>
        {{ onLineText }}
      </v-chip>

      <v-btn variant="text" class="win-ghost-btn" @click="toggleTheme">
        <v-icon> mdi-theme-light-dark </v-icon>
      </v-btn>

      <v-menu>
        <template #activator="{ props }">
          <v-btn variant="text" icon size="small" v-bind="props">
            <v-icon>mdi-account-circle</v-icon>
          </v-btn>
        </template>
        <v-list nav density="comfortable">
          <v-list-item to="/profile" prepend-icon="mdi-account-outline">
            <v-list-item-title>{{ t('nav.profile') }}</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item prepend-icon="mdi-logout" @click="logout">
            <v-list-item-title>{{ t('common.logout') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useVuetifyStore } from '@/stores/vuetify';
import { t } from '@/i18n/t';
import * as uiAccess from '@/auth/uiAccess';

const authStore = useAuthStore();
const router = useRouter();
const { toggleTheme } = useVuetifyStore();

const isOnline = ref(navigator.onLine);
const onLineText = ref(isOnline.value ? t('pos.online') : t('pos.offline'));

const currentUser = computed(() => authStore.user?.username ?? t('common.none'));
const currentDate = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'numeric',
    day: '2-digit',
    numberingSystem: 'latn',
  });
});

const shiftTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  });
});

const primaryNav = computed(() => {
  const role = authStore.user?.role;
  if (!role) return [];

  return [
    {
      to: '/pos',
      icon: 'mdi-point-of-sale',
      label: t('nav.pos'),
      visible: uiAccess.canCreateSales(role),
    },
    {
      to: '/products',
      icon: 'mdi-package-variant',
      label: t('nav.products'),
      visible: uiAccess.canManageProducts(role),
    },
    {
      to: '/workspace/finance?section=inventory',
      icon: 'mdi-warehouse',
      label: t('nav.inventory'),
      visible: uiAccess.canViewInventory(role),
    },
    {
      to: '/categories',
      icon: 'mdi-shape-outline',
      label: t('nav.categories'),
      visible: uiAccess.canManageProducts(role),
    },
    {
      to: '/purchases',
      icon: 'mdi-cart-arrow-down',
      label: t('nav.purchases'),
      visible: uiAccess.canManagePurchases(role),
    },
    {
      to: '/suppliers',
      icon: 'mdi-truck-delivery',
      label: t('nav.suppliers'),
      visible: uiAccess.canManageSuppliers(role),
    },
    {
      to: '/sales',
      icon: 'mdi-receipt-text',
      label: t('nav.sales'),
      visible: uiAccess.canCreateSales(role),
    },
    {
      to: '/customers',
      icon: 'mdi-account-group',
      label: t('nav.customers'),
      visible: uiAccess.canManageCustomers(role),
    },

    {
      to: '/users',
      icon: 'mdi-account-multiple-outline',
      label: t('nav.users'),
      visible: uiAccess.canManageUsers(role),
    },
    { to: '/dashboard', icon: 'mdi-chart-box', label: t('nav.dashboard'), visible: true },
  ].filter((item) => item.visible);
});

const footerNav = computed(() => {
  const role = authStore.user?.role;
  if (!role) return [];

  return [
    {
      to: '/settings',
      icon: 'mdi-cog',
      label: t('nav.settings'),
      visible: uiAccess.canManageSettings(role),
    },
    { to: '/about', icon: 'mdi-information-outline', label: t('nav.about'), visible: true },
  ].filter((item) => item.visible);
});

const logout = () => {
  authStore.logout();
  router.push('/auth/login');
};

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
  onLineText.value = isOnline.value ? t('pos.online') : t('pos.offline');
};

// Watch authentication status and logout if not authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (!isAuth) {
      logout();
    }
  }
);

onMounted(async () => {
  // Check authentication on mount
  if (!authStore.isAuthenticated) {
    logout();
    return;
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>
