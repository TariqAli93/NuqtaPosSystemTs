<template>
  <v-app>
    <v-main class="setup-layout">
      <div class="setup-container">
        <!-- Header -->
        <div class="setup-header">
          <h1 class="text-h4 font-weight-bold">{{ t('setup.title') }}</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">{{ t('setup.subtitle') }}</p>
        </div>

        <!-- Error alert -->
        <v-alert
          v-if="formError"
          type="error"
          variant="tonal"
          class="mb-4"
          density="compact"
          closable
          @click:close="formError = null"
        >
          {{ formError }}
        </v-alert>

        <!-- Stepper -->
        <v-stepper v-model="currentStep" :items="stepItems" flat class="setup-stepper" alt-labels>
          <!-- Step 1: Company Info -->
          <template #item.1>
            <v-card flat class="pa-4">
              <v-card-title class="text-h6 px-0">{{ t('setup.step1') }}</v-card-title>
              <v-form ref="step1FormRef">
                <v-row>
                  <v-col cols="12" sm="12" class="mb-2">
                    <v-text-field
                      v-model="company.name"
                      :label="t('setup.companyName')"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-domain"
                    />
                  </v-col>

                  <v-col cols="12" sm="12" class="mb-2">
                    <v-text-field
                      v-model="company.address"
                      :label="t('setup.companyAddress')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-map-marker-outline"
                    />
                  </v-col>

                  <v-col cols="12" sm="12" md="6" class="mb-2">
                    <v-text-field
                      v-model="company.phone"
                      :label="t('setup.companyPhone')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-phone-outline"
                    />
                  </v-col>

                  <v-col cols="12" sm="12" md="6" class="mb-2">
                    <v-text-field
                      v-model="company.phone2"
                      :label="t('setup.companyPhone2')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-phone-outline"
                    />
                  </v-col>

                  <v-col cols="12" sm="12" class="mb-2">
                    <v-text-field
                      v-model="company.email"
                      :label="t('setup.companyEmail')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-email-outline"
                    />
                  </v-col>

                  <v-col cols="6" class="mb-2">
                    <v-text-field
                      v-model="company.taxId"
                      :label="t('setup.companyTaxId')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-file-document-outline"
                    />
                  </v-col>
                  <v-col cols="6" class="mb-2">
                    <v-select
                      v-model="company.currency"
                      :label="t('setup.companyCurrency')"
                      :items="currencies"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-currency-usd"
                    />
                  </v-col>

                  <v-col cols="12" class="mb-2">
                    <v-text-field
                      v-model.number="company.lowStockThreshold"
                      :label="t('setup.lowStockThreshold')"
                      type="number"
                      :min="0"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-package-variant-closed"
                    />
                  </v-col>
                </v-row>
              </v-form>

              <v-card-actions class="px-0 pt-4">
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="flat"
                  size="large"
                  @click="goToStep2"
                  :disabled="!company.name"
                >
                  {{ t('setup.next') }}
                  <v-icon end>mdi-arrow-left</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </template>

          <!-- Step 2: Admin User -->
          <template #item.2>
            <v-card flat class="pa-4">
              <v-card-title class="text-h6 px-0">{{ t('setup.step2') }}</v-card-title>
              <p class="text-body-2 text-medium-emphasis mb-4">{{ t('setup.adminHint') }}</p>
              <v-form ref="step2FormRef">
                <v-text-field
                  v-model="admin.fullName"
                  :label="t('auth.fullName')"
                  :rules="[rules.required, rules.minLength3]"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account-outline"
                  class="mb-2"
                />
                <v-text-field
                  v-model="admin.username"
                  :label="t('auth.username')"
                  :rules="[rules.required, rules.minLength3, rules.alphanumeric]"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-at"
                  dir="ltr"
                  class="mb-2"
                />
                <v-text-field
                  v-model="admin.password"
                  :label="t('auth.password')"
                  :type="showPassword ? 'text' : 'password'"
                  :rules="[rules.required, rules.minLength6]"
                  :hint="t('auth.passwordHint')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-lock-outline"
                  dir="ltr"
                  class="mb-2"
                >
                  <template #append-inner>
                    <v-icon size="20" class="cursor-pointer" @click="showPassword = !showPassword">
                      {{ showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}
                    </v-icon>
                  </template>
                </v-text-field>
                <v-text-field
                  v-model="admin.phone"
                  :label="t('auth.phone')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-phone-outline"
                  class="mb-2"
                />

                <!-- Role badge (non-editable) -->
                <v-chip color="primary" variant="tonal" class="mb-4">
                  <v-icon start>mdi-shield-account</v-icon>
                  {{ t('users.admin') }}
                </v-chip>
              </v-form>

              <v-card-actions class="px-0 pt-4">
                <v-btn variant="text" @click="currentStep = 1">
                  <v-icon start>mdi-arrow-right</v-icon>
                  {{ t('setup.back') }}
                </v-btn>
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="flat"
                  size="large"
                  @click="submitSetup"
                  :loading="authStore.loading"
                  :disabled="authStore.loading || !isStep2Valid"
                >
                  <v-icon start>mdi-check</v-icon>
                  {{ t('setup.finish') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </template>
        </v-stepper>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { t, mapErrorToArabic } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';

const authStore = useAuthStore();
const router = useRouter();

const currentStep = ref(1);
const showPassword = ref(false);
const formError = ref<string | null>(null);
const step1FormRef = ref<{ validate(): boolean } | null>(null);
const step2FormRef = ref<{ validate(): boolean } | null>(null);

const company = reactive({
  name: '',
  address: '',
  phone: '',
  phone2: '',
  email: '',
  taxId: '',
  currency: 'IQD',
  lowStockThreshold: 5,
});

const admin = reactive({
  fullName: '',
  username: '',
  password: '',
  phone: '',
});

const currencies = ['IQD', 'USD', 'EUR', 'SAR', 'AED', 'KWD', 'TRY'];

const stepItems = computed(() => [
  { value: 1, title: t('setup.step1') },
  { value: 2, title: t('setup.step2') },
]);

const isStep2Valid = computed(
  () =>
    admin.fullName.trim().length >= 3 &&
    admin.username.trim().length >= 3 &&
    admin.password.length >= 6
);

const rules = {
  required: (v: string) => !!v || t('validation.required'),
  minLength3: (v: string) =>
    (v && v.trim().length >= 3) || t('validation.minLength').replace('{min}', '3'),
  minLength6: (v: string) =>
    (v && v.length >= 6) || t('validation.minLength').replace('{min}', '6'),
  alphanumeric: (v: string) => /^[a-zA-Z0-9_]+$/.test(v) || t('validation.invalid'),
};

function goToStep2() {
  if (step1FormRef.value && !step1FormRef.value.validate()) return;
  if (!company.name.trim()) return;
  currentStep.value = 2;
}

async function submitSetup() {
  formError.value = null;
  if (step2FormRef.value && !step2FormRef.value.validate()) return;

  try {
    await authStore.initializeApp({
      admin: {
        username: admin.username.trim(),
        password: admin.password,
        fullName: admin.fullName.trim(),
        phone: admin.phone || undefined,
      },
      companySettings: {
        name: company.name.trim(),
        address: company.address || null,
        phone: company.phone || null,
        phone2: company.phone2 || null,
        email: company.email || null,
        taxId: company.taxId || null,
        logo: null,
        currency: company.currency,
        lowStockThreshold: company.lowStockThreshold,
      },
    });

    // Success — redirect to login
    await router.replace({ name: 'Login' });
  } catch (err: any) {
    formError.value = mapErrorToArabic(err, 'errors.initializeFailed');
    console.error('[Setup] Initialization failed:', err);
  }
}
</script>

<style scoped>
.setup-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}

.setup-container {
  width: 100%;
  max-width: 640px;
  padding: 24px;
}

.setup-header {
  text-align: center;
  margin-bottom: 24px;
  color: #fff;
}

.setup-stepper {
  border-radius: 16px !important;
  overflow: hidden;
}
</style>
