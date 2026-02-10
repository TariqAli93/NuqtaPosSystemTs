<template>
  <v-container>
    <div class="win-page">
      <div>
        <div class="win-title">{{ t('auth.setupTitle') }}</div>
        <div class="win-subtitle">{{ t('auth.setupSubtitle') }}</div>
      </div>
      <v-card class="win-card win-card--padded" flat>
        <v-alert v-if="formError" type="error" variant="tonal" class="mb-4">
          {{ formError }}
        </v-alert>
        <v-form class="win-form" @submit.prevent="submit">
          <v-text-field v-model="fullName" :label="t('common.fullName')" required />
          <v-text-field v-model="username" :label="t('auth.username')" required />
          <v-text-field v-model="password" :label="t('auth.password')" type="password" required />
          <v-text-field v-model="phone" :label="t('auth.phone')" />
          <v-btn
            type="submit"
            color="primary"
            variant="flat"
            class="win-btn"
            :loading="authStore.loading"
          >
            {{ t('auth.createAdmin') }}
          </v-btn>
        </v-form>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';
import type { FirstUserInput } from '../../types/domain';

const authStore = useAuthStore();
const router = useRouter();

const fullName = ref('');
const username = ref('');
const password = ref('');
const phone = ref('');
const localError = ref<string | null>(null);

const formError = computed(() => localError.value || authStore.error);

async function submit() {
  localError.value = null;
  try {
    const payload: FirstUserInput = {
      fullName: fullName.value,
      username: username.value,
      password: password.value,
      phone: phone.value || null,
    };
    await authStore.createFirstUser(payload);
    await router.replace('/');
  } catch (err: any) {
    localError.value = mapErrorToArabic(err, 'errors.setupFailed');
    console.error(err);
  }
}
</script>
