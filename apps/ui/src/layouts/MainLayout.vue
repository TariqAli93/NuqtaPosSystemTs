<template>
  <v-app class="win-shell">
    <slot name="nav">
      <v-navigation-drawer app permanent class="win-sidebar" width="280">
        <div class="pa-8">
          <div class="win-title mb-1">{{ t('app.name') }}</div>
          <div class="win-subtitle">{{ t('app.workspace') }}</div>
        </div>
        <v-divider />
        <v-list nav density="comfortable" class="py-4">
          <v-list-item
            exact
            to="/dashboard"
            prepend-icon="mdi-view-dashboard-outline"
            :title="t('nav.dashboard')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/pos"
            prepend-icon="mdi-point-of-sale"
            :title="t('nav.pos')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/customers"
            prepend-icon="mdi-account-group-outline"
            :title="t('nav.customers')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/products"
            prepend-icon="mdi-package-variant"
            :title="t('nav.products')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/sales"
            prepend-icon="mdi-receipt-text-outline"
            :title="t('nav.sales')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/categories"
            prepend-icon="mdi-shape-outline"
            :title="t('nav.categories')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/settings"
            prepend-icon="mdi-cog-outline"
            :title="t('nav.settings')"
            class="mb-1"
          />
          <v-list-item
            exact
            to="/about"
            prepend-icon="mdi-information-outline"
            :title="t('nav.about')"
            class="mb-1"
          />
        </v-list>
        <div class="mt-auto pa-6">
          <div class="win-card win-card--padded" style="border-radius: 12px">
            <div class="text-caption text-medium-emphasis mb-1">{{ t('layout.status') }}</div>
            <div class="text-body-2 font-weight-medium">{{ t('layout.connectedDb') }}</div>
          </div>
        </div>
      </v-navigation-drawer>
    </slot>

    <div class="d-flex flex-column flex-grow-1">
      <slot name="header">
        <v-app-bar flat height="64" class="win-command-bar border-r-0">
          <v-toolbar-title class="text-subtitle-1">{{ t('layout.workspace') }}</v-toolbar-title>
          <v-spacer />
          <v-menu v-model="showAlerts" offset-y>
            <template #activator="{ props }">
              <v-btn variant="text" class="win-ghost-btn" v-bind="props">
                <v-icon> mdi-bell-outline </v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item>
                <v-list-item-title>{{ t('layout.noNotifications') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn variant="text" class="win-ghost-btn">
            <v-icon> mdi-help-circle-outline </v-icon>
          </v-btn>
          <v-btn variant="text" class="win-ghost-btn" @click="toggleTheme">
            <v-icon> mdi-theme-light-dark </v-icon>
          </v-btn>

          <v-menu>
            <template #activator="{ props }">
              <v-btn
                variant="text"
                class="win-ghost-btn"
                v-bind="props"
                prepend-icon="mdi-account-circle-outline"
              >
                {{ authStore.user?.fullName ?? t('common.none') }}
              </v-btn>
            </template>
            <v-list nav density="comfortable">
              <v-list-item to="/profile" prepend-icon="mdi-account-outline">
                <v-list-item-title>{{ t('common.profile') }}</v-list-item-title>
              </v-list-item>

              <v-divider class="my-4" />

              <v-list-item @click="logout" prepend-icon="mdi-logout">
                <v-list-item-title>{{ t('common.logout') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-app-bar>
      </slot>

      <v-main class="win-content">
        <v-container fluid>
          <slot>
            <router-view />
          </slot>
        </v-container>
      </v-main>

      <slot name="footer">
        <div class="win-footer">{{ t('layout.footerReady') }}</div>
      </slot>
    </div>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { useVuetifyStore } from '@/stores/vuetify';
import { ref } from 'vue';
import { t } from '@/i18n/t';

const authStore = useAuthStore();
const router = useRouter();
const { toggleTheme } = useVuetifyStore();

const logout = () => {
  authStore.logout();
  router.push('/auth/login');
};

const showAlerts = ref(false);
</script>
