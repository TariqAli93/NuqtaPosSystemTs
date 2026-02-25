<template>
  <v-container>
    <div class="win-page">
      <div>
        <div class="win-title">{{ t('profile.title') }}</div>
        <div class="win-subtitle">{{ t('profile.subtitle') }}</div>
      </div>

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
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { authClient } from '../../ipc';
import { mapErrorToArabic, mapRoleToArabic, t } from '../../i18n/t';
import { notifyError, notifySuccess, notifyWarn } from '@/utils/notify';

const authStore = useAuthStore();
const router = useRouter();

const passwordDialog = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const saving = ref(false);

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
  currentPassword.value = '';
  newPassword.value = '';
  passwordDialog.value = true;
}

async function changePassword() {
  if (!authStore.user?.username) {
    notifyWarn(t('common.notAvailable'));
    return;
  }

  if (!currentPassword.value.trim() || !newPassword.value.trim()) {
    notifyWarn(t('errors.invalidData'));
    return;
  }

  saving.value = true;

  const result = await authClient.changePassword({
    username: authStore.user.username,
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
  });

  if (!result.ok) {
    notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
  } else {
    passwordDialog.value = false;
    notifySuccess(t('profile.passwordChanged'));
  }

  saving.value = false;
}
</script>
