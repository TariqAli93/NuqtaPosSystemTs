<template>
  <v-container>
    <div class="win-page">
      <div>
        <div class="win-title">{{ t('settings.title') }}</div>
        <div class="win-subtitle">{{ t('settings.subtitle') }}</div>
      </div>

      <!-- Company Information Section -->
      <v-card class="win-card win-card--padded mb-4" flat>
        <v-alert v-if="localizedError" type="error" variant="tonal" class="mb-4">
          {{ localizedError }}
        </v-alert>

        <div class="win-section">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-bold">{{ t('settings.companyInfo') }}</div>
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-refresh"
              class="win-ghost-btn"
              @click="loadCompanySettings"
            >
              {{ t('common.refresh') }}
            </v-btn>
          </div>

          <v-form @submit.prevent="saveCompanySettings">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.name"
                  :label="t('settings.companyName') + ' *'"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.email"
                  :label="t('settings.companyEmail')"
                  variant="outlined"
                  density="comfortable"
                  type="email"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.phone"
                  :label="t('settings.companyPhone')"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.phone2"
                  :label="t('settings.companyPhone2')"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="companyForm.address"
                  :label="t('settings.companyAddress')"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.taxId"
                  :label="t('settings.companyTaxId')"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="companyForm.currency"
                  :items="currencyOptions"
                  :label="t('settings.companyCurrency') + ' *'"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="companyForm.lowStockThreshold"
                  :label="t('settings.lowStockThreshold')"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                  min="0"
                  :hint="t('settings.lowStockThresholdHint')"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              class="win-btn mt-4"
              :loading="savingCompany"
            >
              {{ t('common.save') }}
            </v-btn>
          </v-form>
        </div>
      </v-card>

      <!-- Currency Display Section -->
      <v-card class="win-card win-card--padded mb-4" flat>
        <div class="win-section">
          <div class="d-flex align-center justify-space-between">
            <div class="text-subtitle-1 font-weight-bold">{{ t('settings.currency') }}</div>
            <v-btn size="small" variant="text" class="win-ghost-btn" @click="loadCurrency">
              {{ t('common.refresh') }}
            </v-btn>
          </div>
          <div v-if="currency" class="mt-2">
            <div>{{ t('settings.defaultCurrency') }}: {{ currency.defaultCurrency }}</div>
            <div>{{ t('settings.usdRate') }}: {{ currency.usdRate }}</div>
            <div>{{ t('settings.iqdRate') }}: {{ currency.iqdRate }}</div>
          </div>
        </div>
      </v-card>

      <!-- Key-Value Settings (Advanced) -->
      <v-card class="win-card win-card--padded" flat>
        <div class="win-section">
          <div class="text-subtitle-1 font-weight-bold">{{ t('settings.keyValue') }}</div>
          <v-form class="win-form mt-4" @submit.prevent="save">
            <div class="d-flex flex-wrap ga-2">
              <v-text-field v-model="key" :label="t('settings.key')" required />
              <v-text-field v-model="value" :label="t('settings.value')" required />
            </div>
            <div class="d-flex ga-2">
              <v-btn
                type="submit"
                color="primary"
                variant="flat"
                class="win-btn"
                :loading="store.loading"
              >
                {{ t('common.save') }}
              </v-btn>
              <v-btn variant="text" class="win-ghost-btn" @click="load">{{
                t('common.load')
              }}</v-btn>
            </div>
          </v-form>
        </div>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useSettingsStore } from '../../stores/settingsStore';
import { settingsClient } from '@/ipc/settingsClient';
import type { SettingsCurrencyResponse, CompanySettings } from '../../types/domain';

const store = useSettingsStore();

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.unexpected') : null
);

const key = ref('');
const value = ref('');
const currency = ref<SettingsCurrencyResponse | null>(null);
const savingCompany = ref(false);

const companyForm = reactive<CompanySettings>({
  name: '',
  address: null,
  phone: null,
  phone2: null,
  email: null,
  taxId: null,
  logo: null,
  currency: 'USD',
  lowStockThreshold: 5,
});

const currencyOptions = [
  { title: 'USD - US Dollar', value: 'USD' },
  { title: 'IQD - Iraqi Dinar', value: 'IQD' },
  { title: 'EUR - Euro', value: 'EUR' },
  { title: 'GBP - British Pound', value: 'GBP' },
  { title: 'SAR - Saudi Riyal', value: 'SAR' },
  { title: 'AED - UAE Dirham', value: 'AED' },
  { title: 'EGP - Egyptian Pound', value: 'EGP' },
  { title: 'JOD - Jordanian Dinar', value: 'JOD' },
  { title: 'KWD - Kuwaiti Dinar', value: 'KWD' },
];

async function load() {
  if (!key.value) return;
  const result = await store.fetchSetting(key.value);
  if (result.ok) {
    value.value = result.data || '';
  }
}

async function save() {
  if (!key.value) return;
  await store.saveSetting(key.value, value.value);
}

async function loadCurrency() {
  const result = await store.fetchCurrencySettings();
  if (result.ok) {
    currency.value = result.data;
  }
}

async function loadCompanySettings() {
  try {
    const result = await settingsClient.getCompany();
    if (result.ok && result.data) {
      Object.assign(companyForm, result.data);
    }
  } catch (err) {
    console.error('Failed to load company settings:', err);
  }
}

async function saveCompanySettings() {
  if (!companyForm.name) {
    alert(t('settings.companyNameRequired'));
    return;
  }

  savingCompany.value = true;
  try {
    console.log('Saving company settings:', companyForm);
    const result = await settingsClient.setCompany(companyForm);
    if (result.ok) {
      alert(t('settings.companySaved'));
    } else {
      alert(result.error?.message || t('errors.unexpected'));
    }
  } catch (err) {
    console.error('Failed to save company settings:', err);
    alert(t('errors.unexpected'));
  } finally {
    savingCompany.value = false;
  }
}

onMounted(() => {
  loadCompanySettings();
  loadCurrency();
});
</script>
