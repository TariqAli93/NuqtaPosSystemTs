<template>
  <v-card class="pa-8 ds-card-elevated" width="500px" max-width="90vw" flat>
    <div class="text-center mb-6">
      <div class="text-h4 font-weight-bold mb-2">{{ t('auth.loginTitle') }}</div>
      <div class="text-body-2 text-medium-emphasis">{{ t('auth.loginSubtitle') }}</div>
    </div>

    <v-alert v-if="formError" type="error" variant="tonal" class="mb-6">
      {{ formError }}
    </v-alert>

    <v-form ref="loginFormRef" @submit.prevent="submit">
      <v-text-field
        v-model="username"
        :label="t('auth.username')"
        variant="outlined"
        prepend-inner-icon="mdi-account"
        :rules="rules.username"
        class="mb-2"
        :hide-details="false"
        required
      />

      <v-text-field
        v-model="password"
        :label="t('auth.password')"
        type="password"
        variant="outlined"
        prepend-inner-icon="mdi-lock"
        :rules="rules.password"
        class="mb-2"
        :hide-details="false"
        required
      />
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        block
        size="large"
        class="win-btn"
        :loading="authStore.loading"
        :disabled="authStore.loading || !username || !password"
      >
        {{ t('auth.loginAction') }}
      </v-btn>
    </v-form>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('admin');
const password = ref('Admin@123');
const localError = ref<string | null>(null);

const formError = computed(() => localError.value || authStore.error);

const rules = {
  username: [(v: string) => !!v || t('validation.required')],
  password: [(v: string) => !!v || t('validation.required')],
};

const loginFormRef = ref();

async function submit() {
  localError.value = null;
  if (!loginFormRef.value.validate()) return;

  try {
    await authStore.login({ username: username.value, password: password.value });
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirect);
  } catch (err: any) {
    localError.value = mapErrorToArabic(err, 'errors.loginFailed');
    console.error(err);
  }
}
</script>
