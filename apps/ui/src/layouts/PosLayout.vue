<template>
  <v-app>
    <v-navigation-drawer permanent rail rail-width="120">
      <v-list nav density="comfortable">
        <v-list-item v-for="item in primaryNav" :key="item.to" :to="item.to">
          <div class="d-flex flex-column gap-4 py-4 align-center justify-center">
            <v-icon size="20">{{ item.icon }}</v-icon>
            <v-list-item-title>{{ item.label }}</v-list-item-title>
          </div>
        </v-list-item>
      </v-list>

      <template #append>
        <v-list nav density="comfortable">
          <v-list-item v-for="item in footerNav" :key="item.to" :to="item.to">
            <div class="d-flex flex-column gap-4 py-4 align-center justify-center">
              <v-icon size="20">{{ item.icon }}</v-icon>
              <v-list-item-title>{{ item.label }}</v-list-item-title>
            </div>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-app-bar flat density="comfortable" height="56" border="b">
      <v-sheet class="d-flex align-center ga-4 px-6">
        <div>
          <div class="text-body-2 font-weight-medium">{{ t('app.posName') }}</div>
          <div class="text-caption text-medium-emphasis">{{ currentDate }} • {{ currentUser }}</div>
        </div>
        <v-sheet color="grey-lighten-4" rounded="md" class="d-flex align-center ga-2 px-3 py-1">
          <v-icon size="16">mdi-clock-outline</v-icon>
          <span class="text-caption font-weight-medium">{{ t('pos.shift') }}:</span>
          <span class="text-caption">{{ shiftTime }}</span>
        </v-sheet>
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

const currentUser = computed(() => authStore.user?.fullName ?? t('common.none'));
const currentDate = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('ar-IQ', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
});

const shiftTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
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
      to: '/categories',
      icon: 'mdi-shape-outline',
      label: t('nav.categories'),
      visible: uiAccess.canManageProducts(role),
    },
    {
      to: '/customers',
      icon: 'mdi-account-group',
      label: t('nav.customers'),
      visible: uiAccess.canManageCustomers(role),
    },
    {
      to: '/sales',
      icon: 'mdi-receipt-text',
      label: t('nav.sales'),
      visible: uiAccess.canCreateSales(role),
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
