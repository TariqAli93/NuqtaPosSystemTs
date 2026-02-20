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
                  @click="goToStep3"
                  :loading="authStore.loading || accountingLoading || accountingSeeding"
                  :disabled="!isStep2Valid || setupIncompleteCount > 0"
                >
                  {{ t('setup.next') }}
                  <v-icon end>mdi-arrow-left</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </template>

          <!-- Step 3: Module Toggles & Preferences -->
          <template #item.3>
            <v-card flat class="step-card">
              <v-card-title class="text-subtitle-1 font-weight-bold px-0 pb-2">
                إعدادات الوحدات
              </v-card-title>
              <p class="text-body-2 text-medium-emphasis mb-4">
                اختر الوحدات التي تحتاجها. يمكنك تغييرها لاحقاً من الإعدادات.
              </p>

              <!-- Module toggles -->
              <v-card variant="tonal" class="pa-4 mb-4">
                <div class="d-flex align-center ga-2 mb-3">
                  <v-icon size="20" color="primary">mdi-puzzle-outline</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">الوحدات الاختيارية</span>
                </div>

                <v-switch
                  v-model="moduleToggles.purchasesEnabled"
                  color="primary"
                  density="compact"
                  hide-details
                  label="المشتريات والموردين"
                  class="mb-2"
                />
                <v-switch
                  v-model="moduleToggles.ledgersEnabled"
                  color="primary"
                  density="compact"
                  hide-details
                  label="دفاتر الحسابات (ذمم العملاء / الموردين)"
                  class="mb-2"
                />
                <v-switch
                  v-model="moduleToggles.unitsEnabled"
                  color="primary"
                  density="compact"
                  hide-details
                  label="وحدات القياس المتعددة للمنتجات"
                  class="mb-2"
                />
                <v-switch
                  v-model="moduleToggles.paymentsOnInvoicesEnabled"
                  color="primary"
                  density="compact"
                  hide-details
                  label="الدفع على الفواتير (أقساط)"
                />
              </v-card>

              <!-- Invoice settings -->
              <v-card variant="tonal" class="pa-4 mb-4">
                <div class="d-flex align-center ga-2 mb-3">
                  <v-icon size="20" color="primary">mdi-receipt-text-outline</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">إعدادات الفاتورة</span>
                </div>

                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="invoiceSettings.prefix"
                      label="بادئة رقم الفاتورة"
                      placeholder="INV-"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="invoiceSettings.paperSize"
                      label="حجم الورق"
                      :items="[
                        { title: 'حراري (80mm)', value: 'thermal' },
                        { title: 'A4', value: 'a4' },
                        { title: 'A5', value: 'a5' },
                      ]"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="invoiceSettings.footerNotes"
                      label="ملاحظات أسفل الفاتورة"
                      placeholder="شكراً لتعاملكم معنا"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-switch
                      v-model="invoiceSettings.showQr"
                      color="primary"
                      density="compact"
                      hide-details
                      label="عرض رمز QR في الفاتورة"
                    />
                  </v-col>
                </v-row>
              </v-card>

              <!-- Notification settings -->
              <v-card variant="tonal" class="pa-4 mb-4">
                <div class="d-flex align-center ga-2 mb-3">
                  <v-icon size="20" color="primary">mdi-bell-outline</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">إعدادات التنبيهات</span>
                </div>

                <v-row dense>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="notificationSettings.lowStockThreshold"
                      label="حد المخزون المنخفض"
                      type="number"
                      :min="0"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="notificationSettings.expiryDays"
                      label="أيام تنبيه انتهاء الصلاحية"
                      type="number"
                      :min="0"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="notificationSettings.debtReminderCount"
                      label="عدد تذكيرات الذمم"
                      type="number"
                      :min="0"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="notificationSettings.debtReminderIntervalDays"
                      label="فاصل تذكير الذمم (أيام)"
                      type="number"
                      :min="0"
                      density="comfortable"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-card>

              <v-card-actions class="px-0 pt-4">
                <v-btn variant="text" @click="currentStep = 2">
                  <v-icon start>mdi-arrow-right</v-icon>
                  {{ t('setup.back') }}
                </v-btn>
                <v-spacer />
                <v-btn
                  color="primary"
                  @click="submitSetup"
                  :loading="
                    authStore.loading || accountingLoading || accountingSeeding || savingWizard
                  "
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
import { settingsClient, type AllModuleSettings } from '../../ipc/settingsClient';
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

const savingWizard = ref(false);

const moduleToggles = reactive({
  purchasesEnabled: true,
  ledgersEnabled: true,
  unitsEnabled: false,
  paymentsOnInvoicesEnabled: true,
});

const invoiceSettings = reactive({
  templateActiveId: 'default',
  prefix: 'INV-',
  paperSize: 'thermal' as 'thermal' | 'a4' | 'a5',
  logo: '',
  footerNotes: '',
  layoutDirection: 'rtl' as 'rtl' | 'ltr',
  showQr: false,
  showBarcode: false,
});

const notificationSettings = reactive({
  lowStockThreshold: 5,
  expiryDays: 30,
  debtReminderCount: 3,
  debtReminderIntervalDays: 7,
});

const requiresAdminBootstrap = computed(() => !authStore.isInitialized);

const stepItems = computed(() => [
  { value: 1, title: t('setup.step1') },
  { value: 2, title: t('setup.step2') },
  { value: 3, title: 'الوحدات والإعدادات' },
]);

const setupIncompleteCount = computed(() => {
  let count = 0;
  if (accountingEnabled.value === null) count += 1;
  if (accountingEnabled.value === true && !accountingSeeded.value) count += 1;
  return count;
});

const isStep2Valid = computed(
  () =>
    !requiresAdminBootstrap.value ||
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

function goToStep3() {
  if (requiresAdminBootstrap.value && step2FormRef.value && !step2FormRef.value.validate()) return;
  if (!isStep2Valid.value) return;
  if (setupIncompleteCount.value > 0) {
    formError.value = t('setup.completeAccountingStep');
    return;
  }
  currentStep.value = 3;
}

function applyWizardDefaults(data: AllModuleSettings): void {
  moduleToggles.purchasesEnabled = data.modules.purchasesEnabled;
  moduleToggles.ledgersEnabled = data.modules.ledgersEnabled;
  moduleToggles.unitsEnabled = data.modules.unitsEnabled;
  moduleToggles.paymentsOnInvoicesEnabled = data.modules.paymentsOnInvoicesEnabled;

  notificationSettings.lowStockThreshold = data.notifications.lowStockThreshold;
  notificationSettings.expiryDays = data.notifications.expiryDays;
  notificationSettings.debtReminderCount = data.notifications.debtReminderCount;
  notificationSettings.debtReminderIntervalDays = data.notifications.debtReminderIntervalDays;

  invoiceSettings.templateActiveId = data.invoice.templateActiveId;
  invoiceSettings.prefix = data.invoice.prefix;
  invoiceSettings.paperSize = data.invoice.paperSize;
  invoiceSettings.logo = data.invoice.logo;
  invoiceSettings.footerNotes = data.invoice.footerNotes;
  invoiceSettings.layoutDirection = data.invoice.layoutDirection;
  invoiceSettings.showQr = data.invoice.showQr;
  invoiceSettings.showBarcode = data.invoice.showBarcode;
}

async function loadWizardDefaults() {
  const [modulesResult, companyResult] = await Promise.all([
    settingsClient.getModules(),
    settingsClient.getCompany(),
  ]);

  if (modulesResult.ok) {
    applyWizardDefaults(modulesResult.data);
  }

  if (companyResult.ok && companyResult.data) {
    company.name = companyResult.data.name;
    company.address = companyResult.data.address || '';
    company.phone = companyResult.data.phone || '';
    company.phone2 = companyResult.data.phone2 || '';
    company.email = companyResult.data.email || '';
    company.taxId = companyResult.data.taxId || '';
    company.currency = companyResult.data.currency || company.currency;
    company.lowStockThreshold = companyResult.data.lowStockThreshold ?? company.lowStockThreshold;
  }

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
  if (requiresAdminBootstrap.value && step2FormRef.value && !step2FormRef.value.validate()) return;
  if (setupIncompleteCount.value > 0) {
    formError.value = t('setup.completeAccountingStep');
    return;
  }

  try {
    if (requiresAdminBootstrap.value) {
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
    }

    savingWizard.value = true;
    const wizardResult = await settingsClient.completeWizard({
      modules: {
        accountingEnabled: accountingEnabled.value === true,
        purchasesEnabled: moduleToggles.purchasesEnabled,
        ledgersEnabled: moduleToggles.ledgersEnabled,
        unitsEnabled: moduleToggles.unitsEnabled,
        paymentsOnInvoicesEnabled: moduleToggles.paymentsOnInvoicesEnabled,
      },
      notifications: {
        lowStockThreshold: notificationSettings.lowStockThreshold,
        expiryDays: notificationSettings.expiryDays,
        debtReminderCount: notificationSettings.debtReminderCount,
        debtReminderIntervalDays: notificationSettings.debtReminderIntervalDays,
      },
      invoice: {
        templateActiveId: invoiceSettings.templateActiveId,
        prefix: invoiceSettings.prefix,
        paperSize: invoiceSettings.paperSize,
        logo: invoiceSettings.logo,
        footerNotes: invoiceSettings.footerNotes,
        layoutDirection: invoiceSettings.layoutDirection,
        showQr: invoiceSettings.showQr,
        showBarcode: invoiceSettings.showBarcode,
      },
    });
    savingWizard.value = false;

    if (!wizardResult.ok) {
      formError.value = mapErrorToArabic(wizardResult.error.message, 'errors.saveFailed');
      return;
    }

    authStore.setupStatus = {
      isInitialized: true,
      hasUsers: true,
      hasCompanyInfo: true,
      wizardCompleted: true,
    };

    await router.replace({ name: 'Login' });
  } catch (err: any) {
    savingWizard.value = false;
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

onMounted(async () => {
  if (!authStore.setupStatus) {
    try {
      await authStore.checkInitialSetup();
    } catch {
      // Keep setup screen visible; load failures are surfaced via component state.
    }
  }

  await loadWizardDefaults();
  baseCurrency.value = company.currency;
  await loadAccountingStatus();
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
