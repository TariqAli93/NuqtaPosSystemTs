<template>
  <v-container>
    <div class="win-page">
      <div>
        <div class="win-title">{{ t('profile.title') }}</div>
        <div class="win-subtitle">{{ t('profile.subtitle') }}</div>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-card class="win-card win-card--padded" flat>
        <v-list>
          <v-list-item
            :title="t('common.fullName')"
            :subtitle="authStore.user?.fullName ?? t('common.none')"
          />
          <v-list-item
            :title="t('profile.username')"
            :subtitle="authStore.user?.username ?? t('common.none')"
          />
          <v-list-item
            :title="t('profile.role')"
            :subtitle="mapRoleToArabic(authStore.user?.role)"
          />
          <v-list-item
            :title="t('profile.lastLogin')"
            :subtitle="formatLastLogin(authStore.user?.lastLoginAt)"
          />
        </v-list>

        <div class="d-flex ga-2 mt-4">
          <v-btn color="error" variant="flat" @click="logout">
            {{ t('profile.logout') }}
          </v-btn>
          <v-btn
            variant="outlined"
            @click="openPasswordDialog"
            :disabled="!authStore.user?.username"
          >
            {{ t('profile.changePassword') }}
          </v-btn>
        </div>
      </v-card>

      <v-dialog v-model="passwordDialog" max-width="520">
        <v-card rounded="lg" class="pa-6">
          <v-card-title class="text-h6 pa-0">{{ t('profile.changePassword') }}</v-card-title>
          <v-card-text class="pa-0 mt-4">
            <v-form class="d-flex flex-column ga-4" @submit.prevent="changePassword">
              <v-text-field
                v-model="currentPassword"
                :label="t('profile.currentPassword')"
                type="password"
                required
              />
              <v-text-field
                v-model="newPassword"
                :label="t('profile.newPassword')"
                type="password"
                required
              />
            </v-form>
          </v-card-text>
          <v-card-actions class="pa-0 mt-6 justify-end ga-2">
            <v-btn variant="text" @click="passwordDialog = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" :loading="saving" @click="changePassword">
              {{ t('common.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="successOpen" color="success" timeout="2000">
        {{ t('profile.passwordChanged') }}
      </v-snackbar>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { authClient } from '../../ipc';
import { mapErrorToArabic, mapRoleToArabic, t } from '../../i18n/t';

const authStore = useAuthStore();
const router = useRouter();

const passwordDialog = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const saving = ref(false);
const successOpen = ref(false);
const error = ref<string | null>(null);

function formatLastLogin(value?: string | null): string {
  if (!value) return t('common.none');

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('common.none');

  return date.toLocaleString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function logout() {
  authStore.logout();
  router.push('/auth/login');
}

function openPasswordDialog() {
  if (!authStore.user?.username) return;
  error.value = null;
  currentPassword.value = '';
  newPassword.value = '';
  passwordDialog.value = true;
}

async function changePassword() {
  if (!authStore.user?.username) {
    error.value = t('common.notAvailable');
    return;
  }

  if (!currentPassword.value.trim() || !newPassword.value.trim()) {
    error.value = t('errors.invalidData');
    return;
  }

  saving.value = true;
  error.value = null;

  const result = await authClient.changePassword({
    username: authStore.user.username,
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
  });

  if (!result.ok) {
    error.value = mapErrorToArabic(result.error, 'errors.saveFailed');
  } else {
    passwordDialog.value = false;
    successOpen.value = true;
  }

  saving.value = false;
}
</script>
