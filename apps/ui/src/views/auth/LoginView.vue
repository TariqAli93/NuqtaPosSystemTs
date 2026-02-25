<template>
  <div class="login-wrapper w-100" style="max-width: 380px; margin: 0 auto">
    <div class="mb-8 text-right flex gap-4 items-center justify-items-start">
      <div class="auth-brand__logo w-1/5">
        <v-icon icon="mdi-shield-lock-outline" size="32" color="white" />
      </div>

      <div class="auth-brand__content w-4/5">
        <h1 class="text-h4 font-weight-bold mb-2 text-high-emphasis">{{ t('auth.loginTitle') }}</h1>
        <p class="text-body-1 text-medium-emphasis">{{ t('auth.loginSubtitle') }}</p>
      </div>
    </div>

    <v-form ref="loginFormRef" @submit.prevent="submit">
      <div class="mb-4">
        <label class="text-subtitle-2 font-weight-bold d-block mb-1 text-high-emphasis">{{
          t('auth.username')
        }}</label>
        <v-text-field
          v-model="username"
          variant="outlined"
          color="primary"
          prepend-inner-icon="mdi-account-outline"
          :rules="rules.username"
          hide-details="auto"
          required
        />
      </div>

      <div class="mb-6">
        <label class="text-subtitle-2 font-weight-bold d-block mb-1 text-high-emphasis">{{
          t('auth.password')
        }}</label>
        <v-text-field
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          variant="outlined"
          color="primary"
          prepend-inner-icon="mdi-lock-outline"
          :rules="rules.password"
          hide-details="auto"
          required
        >
          <template #append-inner>
            <v-btn
              icon
              variant="text"
              density="compact"
              @click="showPassword = !showPassword"
              class="mt-n1 text-medium-emphasis"
              tabindex="-1"
            >
              <v-icon size="20">{{
                showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'
              }}</v-icon>
            </v-btn>
          </template>
        </v-text-field>
      </div>

      <v-btn
        type="submit"
        color="primary"
        size="large"
        variant="flat"
        block
        class="text-button font-weight-bold mt-2"
        style="letter-spacing: 0.5px"
        :loading="authStore.loading"
        :disabled="authStore.loading || !username || !password"
      >
        {{ t('auth.loginAction') }}
      </v-btn>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';
import { notifyError } from '@/utils/notify';

interface ValidationRule {
  (v: string): boolean | string;
}

interface LoginForm {
  validate(): boolean;
  resetValidation(): void;
}

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref<string>('admin');
const password = ref<string>('admin123');
const showPassword = ref<boolean>(false);
const loginFormRef = ref<LoginForm>();

const rules: Record<string, ValidationRule[]> = {
  username: [(v: string) => !!v || t('validation.required')],
  password: [(v: string) => !!v || t('validation.required')],
};

async function submit(): Promise<void> {
  if (!loginFormRef.value?.validate()) return;

  try {
    await authStore.login({ username: username.value, password: password.value });
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirect);
  } catch (err: any) {
    console.error(mapErrorToArabic(err, 'errors.loginFailed'));
  }
}

watch(
  () => authStore.error,
  (value) => {
    if (!value) return;
    notifyError(value, { dedupeKey: 'auth-login-error' });
  }
);
</script>
<style scoped lang="scss">
.auth-brand__logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
}
</style>
