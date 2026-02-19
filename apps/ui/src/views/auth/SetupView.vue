<template>
  <v-app>
    <v-main class="setup-layout">
      <div class="setup-container">
        <!-- Header -->
        <div class="setup-header">
          <v-icon size="36" color="primary" class="mb-3">mdi-cog-outline</v-icon>
          <h1 class="text-h5 font-weight-bold">{{ t('setup.title') }}</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">{{ t('setup.subtitle') }}</p>
          <v-chip
            v-if="setupIncompleteCount > 0"
            class="mt-3"
            color="warning"
            variant="tonal"
            size="small"
            prepend-icon="mdi-alert-circle-outline"
          >
            {{ t('setup.pendingSteps').replace('{count}', String(setupIncompleteCount)) }}
          </v-chip>
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
        <v-alert
          v-if="accountingMessage"
          type="success"
          variant="tonal"
          class="mb-4"
          density="compact"
          closable
          @click:close="accountingMessage = null"
        >
          {{ accountingMessage }}
        </v-alert>

        <!-- Stepper -->
        <v-stepper v-model="currentStep" :items="stepItems" flat class="setup-stepper" alt-labels>
          <!-- Step 1: Company Info -->
          <template #item.1>
            <v-card flat class="step-card">
              <v-card-title class="text-subtitle-1 font-weight-bold px-0 pb-4">{{
                t('setup.step1')
              }}</v-card-title>
              <v-form ref="step1FormRef">
                <v-row dense>
                  <v-col cols="12">
                    <v-text-field
                      v-model="company.name"
                      :label="t('setup.companyName')"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-domain"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="company.address"
                      :label="t('setup.companyAddress')"
                      prepend-inner-icon="mdi-map-marker-outline"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.phone"
                      :label="t('setup.companyPhone')"
                      prepend-inner-icon="mdi-phone-outline"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.phone2"
                      :label="t('setup.companyPhone2')"
                      prepend-inner-icon="mdi-phone-outline"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="company.email"
                      :label="t('setup.companyEmail')"
                      prepend-inner-icon="mdi-email-outline"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.taxId"
                      :label="t('setup.companyTaxId')"
                      prepend-inner-icon="mdi-file-document-outline"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="company.currency"
                      :label="t('setup.companyCurrency')"
                      :items="currencies"
                      prepend-inner-icon="mdi-currency-usd"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model.number="company.lowStockThreshold"
                      :label="t('setup.lowStockThreshold')"
                      type="number"
                      :min="0"
                      prepend-inner-icon="mdi-package-variant-closed"
                    />
                  </v-col>
                </v-row>
              </v-form>

              <v-card-actions class="px-0 pt-2">
                <v-spacer />
                <v-btn color="primary" @click="goToStep2" :disabled="!company.name">
                  {{ t('setup.next') }}
                  <v-icon end>mdi-arrow-left</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </template>

          <!-- Step 2: Admin User -->
          <template #item.2>
            <v-card flat class="step-card">
              <v-card-title class="text-subtitle-1 font-weight-bold px-0 pb-2">{{
                t('setup.step2')
              }}</v-card-title>
              <p class="text-body-2 text-medium-emphasis mb-4">{{ t('setup.adminHint') }}</p>
              <v-form ref="step2FormRef">
                <v-text-field
                  v-model="admin.fullName"
                  :label="t('auth.fullName')"
                  :rules="[rules.required, rules.minLength3]"
                  prepend-inner-icon="mdi-account-outline"
                  class="mb-1"
                />
                <v-text-field
                  v-model="admin.username"
                  :label="t('auth.username')"
                  :rules="[rules.required, rules.minLength3, rules.alphanumeric]"
                  prepend-inner-icon="mdi-at"
                  dir="ltr"
                  class="mb-1"
                />
                <v-text-field
                  v-model="admin.password"
                  :label="t('auth.password')"
                  :type="showPassword ? 'text' : 'password'"
                  :rules="[rules.required, rules.minLength6]"
                  :hint="t('auth.passwordHint')"
                  prepend-inner-icon="mdi-lock-outline"
                  dir="ltr"
                  class="mb-1"
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
                  prepend-inner-icon="mdi-phone-outline"
                  class="mb-1"
                />

                <!-- Role badge (non-editable) -->
                <v-chip color="primary" variant="tonal" class="mb-4">
                  <v-icon start>mdi-shield-account</v-icon>
                  {{ t('users.admin') }}
                </v-chip>
              </v-form>

              <v-divider class="my-4" />

              <v-card variant="tonal" class="accounting-card">
                <div class="accounting-header">
                  <div class="d-flex align-center ga-2">
                    <v-icon size="20" color="primary">mdi-book-open-page-variant-outline</v-icon>
                    <span class="text-subtitle-1 font-weight-bold">{{
                      t('setup.accountingTitle')
                    }}</span>
                  </div>
                  <v-switch
                    v-model="accountingEnabled"
                    color="primary"
                    density="compact"
                    hide-details
                    :label="
                      accountingEnabled ? t('setup.disableAccounting') : t('setup.enableAccounting')
                    "
                    @update:model-value="onAccountingDecisionChange"
                  />
                </div>
                <p class="text-body-2 text-medium-emphasis mb-4">{{ t('setup.accountingHint') }}</p>

                <v-alert
                  v-if="accountingEnabled === null"
                  type="warning"
                  variant="tonal"
                  class="mb-3"
                >
                  {{ t('setup.accountingDecisionRequired') }}
                </v-alert>

                <v-alert
                  v-else-if="accountingEnabled === false"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                >
                  {{ t('setup.accountingDisabledInfo') }}
                </v-alert>

                <template v-else>
                  <v-row dense>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="baseCurrency"
                        :items="currencies"
                        :label="t('setup.baseCurrency')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-combobox
                        v-model="accountingCodes.cashAccountCode"
                        :items="accountCodeOptions"
                        :label="t('setup.cashAccountCode')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-combobox
                        v-model="accountingCodes.inventoryAccountCode"
                        :items="accountCodeOptions"
                        :label="t('setup.inventoryAccountCode')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-combobox
                        v-model="accountingCodes.arAccountCode"
                        :items="accountCodeOptions"
                        :label="t('setup.arAccountCode')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-combobox
                        v-model="accountingCodes.apAccountCode"
                        :items="accountCodeOptions"
                        :label="t('setup.apAccountCode')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-combobox
                        v-model="accountingCodes.salesRevenueAccountCode"
                        :items="accountCodeOptions"
                        :label="t('setup.salesRevenueAccountCode')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-combobox
                        v-model="accountingCodes.cogsAccountCode"
                        :items="accountCodeOptions"
                        :label="t('setup.cogsAccountCode')"
                        variant="outlined"
                        density="comfortable"
                      />
                    </v-col>
                  </v-row>

                  <div class="d-flex flex-wrap ga-2 mb-3">
                    <v-chip
                      size="small"
                      :color="accountingSeeded ? 'success' : 'warning'"
                      variant="tonal"
                    >
                      {{
                        accountingSeeded
                          ? t('setup.accountingSeeded')
                          : t('setup.accountingNotSeeded')
                      }}
                    </v-chip>
                    <v-chip
                      v-if="accountingMissingCodes.length > 0"
                      size="small"
                      color="warning"
                      variant="tonal"
                    >
                      {{
                        t('setup.missingCodes').replace(
                          '{codes}',
                          accountingMissingCodes.join(', ')
                        )
                      }}
                    </v-chip>
                  </div>

                  <v-alert
                    v-for="(warning, idx) in accountingWarnings"
                    :key="`setup-warning-${idx}`"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-2"
                  >
                    {{ warning }}
                  </v-alert>

                  <v-btn
                    color="primary"
                    prepend-icon="mdi-book-open-variant"
                    :loading="accountingSeeding"
                    :disabled="accountingLoading"
                    @click="seedChartOfAccounts"
                  >
                    {{ t('setup.createDefaultCoa') }}
                  </v-btn>
                </template>
              </v-card>

              <v-card-actions class="px-0 pt-4">
                <v-btn variant="text" @click="currentStep = 1">
                  <v-icon start>mdi-arrow-right</v-icon>
                  {{ t('setup.back') }}
                </v-btn>
                <v-spacer />
                <v-btn
                  color="primary"
                  @click="submitSetup"
                  :loading="authStore.loading || accountingLoading || accountingSeeding"
                  :disabled="!canSubmitSetup"
                  prepend-icon="mdi-check"
                >
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { t, mapErrorToArabic } from '../../i18n/t';
import { useAuthStore } from '../../stores/authStore';
import { setupClient } from '../../ipc';
import type { AccountingSetupStatus } from '../../ipc/setupClient';

const authStore = useAuthStore();
const router = useRouter();

const currentStep = ref(1);
const showPassword = ref(false);
const formError = ref<string | null>(null);
const accountingMessage = ref<string | null>(null);
const step1FormRef = ref<{ validate(): boolean } | null>(null);
const step2FormRef = ref<{ validate(): boolean } | null>(null);
const accountingLoading = ref(false);
const accountingSeeding = ref(false);
const accountingEnabled = ref<boolean | null>(null);
const accountingSeeded = ref(false);
const accountingMissingCodes = ref<string[]>([]);
const accountingWarnings = ref<string[]>([]);
const baseCurrency = ref('IQD');

const accountingCodes = reactive({
  cashAccountCode: '1001',
  inventoryAccountCode: '1200',
  arAccountCode: '1100',
  apAccountCode: '2100',
  salesRevenueAccountCode: '4001',
  cogsAccountCode: '5001',
});

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

const setupIncompleteCount = computed(() => {
  let count = 0;
  if (accountingEnabled.value === null) count += 1;
  if (accountingEnabled.value === true && !accountingSeeded.value) count += 1;
  return count;
});

const isStep2Valid = computed(
  () =>
    admin.fullName.trim().length >= 3 &&
    admin.username.trim().length >= 3 &&
    admin.password.length >= 6
);

const canSubmitSetup = computed(
  () =>
    !authStore.loading &&
    !accountingLoading.value &&
    !accountingSeeding.value &&
    isStep2Valid.value &&
    setupIncompleteCount.value === 0
);

const accountCodeOptions = computed(() => {
  const defaults = ['1001', '1100', '1200', '2100', '4001', '5001'];
  const selected = Object.values(accountingCodes).filter(
    (value) => value && value.trim().length > 0
  );
  return Array.from(new Set([...defaults, ...selected]));
});

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

function applyAccountingStatus(status: AccountingSetupStatus): void {
  accountingEnabled.value = status.enabled;
  accountingSeeded.value = status.seeded;
  accountingMissingCodes.value = status.missingCodes || [];
  accountingWarnings.value = status.warnings || [];
  baseCurrency.value = status.baseCurrency || baseCurrency.value || company.currency || 'IQD';
  accountingCodes.cashAccountCode =
    status.selectedCodes.cashAccountCode || accountingCodes.cashAccountCode;
  accountingCodes.inventoryAccountCode =
    status.selectedCodes.inventoryAccountCode || accountingCodes.inventoryAccountCode;
  accountingCodes.arAccountCode =
    status.selectedCodes.arAccountCode || accountingCodes.arAccountCode;
  accountingCodes.apAccountCode =
    status.selectedCodes.apAccountCode || accountingCodes.apAccountCode;
  accountingCodes.salesRevenueAccountCode =
    status.selectedCodes.salesRevenueAccountCode || accountingCodes.salesRevenueAccountCode;
  accountingCodes.cogsAccountCode =
    status.selectedCodes.cogsAccountCode || accountingCodes.cogsAccountCode;
}

async function loadAccountingStatus() {
  accountingLoading.value = true;
  const result = await setupClient.getAccountingSetupStatus();
  if (result.ok) {
    applyAccountingStatus(result.data);
  } else {
    formError.value = mapErrorToArabic(result.error.message, 'errors.loadFailed');
  }
  accountingLoading.value = false;
}

async function onAccountingDecisionChange(value: boolean | null) {
  if (typeof value !== 'boolean') return;

  accountingLoading.value = true;
  accountingMessage.value = null;
  const result = await setupClient.setAccountingEnabled(value);
  if (result.ok) {
    applyAccountingStatus(result.data);
  } else {
    formError.value = mapErrorToArabic(result.error.message, 'errors.saveFailed');
  }
  accountingLoading.value = false;
}

async function seedChartOfAccounts() {
  if (accountingEnabled.value !== true) return;

  accountingSeeding.value = true;
  accountingMessage.value = null;
  const result = await setupClient.seedChartOfAccounts({
    baseCurrency: baseCurrency.value,
    cashAccountCode: accountingCodes.cashAccountCode,
    inventoryAccountCode: accountingCodes.inventoryAccountCode,
    arAccountCode: accountingCodes.arAccountCode,
    apAccountCode: accountingCodes.apAccountCode,
    salesRevenueAccountCode: accountingCodes.salesRevenueAccountCode,
    cogsAccountCode: accountingCodes.cogsAccountCode,
  });

  if (result.ok) {
    applyAccountingStatus(result.data);
    accountingMessage.value = result.data.message;
  } else {
    formError.value = mapErrorToArabic(result.error.message, 'errors.saveFailed');
  }
  accountingSeeding.value = false;
}

async function submitSetup() {
  formError.value = null;
  if (step2FormRef.value && !step2FormRef.value.validate()) return;
  if (setupIncompleteCount.value > 0) {
    formError.value = t('setup.completeAccountingStep');
    return;
  }

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

watch(
  () => company.currency,
  (value) => {
    if (!baseCurrency.value) {
      baseCurrency.value = value;
    }
  }
);

onMounted(() => {
  baseCurrency.value = company.currency;
  void loadAccountingStatus();
});
</script>

<style scoped>
.setup-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.setup-container {
  width: 100%;
  max-width: 700px;
  padding: 32px 24px;
}

.setup-header {
  text-align: center;
  margin-bottom: 28px;
  color: rgb(var(--v-theme-on-background));
}

.setup-stepper {
  border-radius: 12px !important;
  overflow: hidden;
  background: rgb(var(--v-theme-surface)) !important;
}

.step-card {
  padding: 24px;
}

.accounting-card {
  padding: 20px;
}

.accounting-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 600px) {
  .setup-container {
    padding: 16px;
  }
  .step-card {
    padding: 16px;
  }
}
</style>
