<template>
  <div class="z-10 w-full h-full flex flex-col items-center justify-center pa-4 grow">
    <div class="login-header w-full">
      <h2 class="text-2xl font-bold">{{ t('auth.loginTitle') }}</h2>
      <p class="text-sm font-medium">{{ t('auth.loginSubtitle') }}</p>
    </div>

    <v-alert v-if="formError" type="error" variant="tonal" class="mb-5 w-full" density="compact">
      {{ formError }}
    </v-alert>

    <v-form ref="loginFormRef" class="w-full" @submit.prevent="submit">
      <label class="login-label">{{ t('auth.username') }}</label>
      <v-text-field
        v-model="username"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-account-outline"
        :rules="rules.username"
        :hide-details="false"
        class="mb-1"
        required
      />

      <label class="login-label">{{ t('auth.password') }}</label>
      <v-text-field
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-lock-outline"
        :rules="rules.password"
        :hide-details="false"
        class="mb-1"
        required
      >
        <template #append-inner>
          <v-icon size="20" class="cursor-pointer" @click="showPassword = !showPassword">
            {{ showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}
          </v-icon>
        </template>
      </v-text-field>

      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        block
        size="large"
        class="login-btn mt-4"
        :loading="authStore.loading"
        :disabled="authStore.loading || !username || !password"
      >
        {{ t('auth.loginAction') }}
      </v-btn>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';

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
const localError = ref<string | null>(null);
const loginFormRef = ref<LoginForm>();

const formError = computed<string | null>(() => localError.value || authStore.error);

const rules: Record<string, ValidationRule[]> = {
  username: [(v: string) => !!v || t('validation.required')],
  password: [(v: string) => !!v || t('validation.required')],
};

async function submit(): Promise<void> {
  localError.value = null;
  if (!loginFormRef.value?.validate()) return;

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

<style scoped></style>
