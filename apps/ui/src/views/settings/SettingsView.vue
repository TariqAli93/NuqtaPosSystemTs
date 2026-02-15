<template>
  <v-container>
    <div class="win-page">
      <v-app-bar>
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('settings.title') }}</div>
          <div class="text-sm">{{ t('settings.subtitle') }}</div>
        </v-app-bar-title>

        <template #append>
          <v-btn color="primary" @click="loadCompanySettings" prepend-icon="mdi-refresh">
            {{ t('common.refresh') }}
          </v-btn>
        </template>
      </v-app-bar>

      <!-- Company Information Section -->
      <v-card class="win-card win-card--padded mb-4" flat>
        <v-alert v-if="localizedError" type="error" variant="tonal" class="mb-4">
          {{ localizedError }}
        </v-alert>

        <v-card class="pa-4">
          <v-card-title class="flex items-center justify-between mb-4">
            <span>{{ t('settings.companyInfo') }}</span>
          </v-card-title>

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

              <!-- select printer / the printer saved only in pinia store and localstorage no need to save it in db -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedPrinter"
                  :items="printers"
                  item-title="name"
                  item-value="name"
                  :label="t('settings.receiptPrinter')"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @update:model-value="saveSelectedPrinter"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #append>
                        <v-chip v-if="item.raw.isDefault" size="x-small" color="primary">
                          {{ t('settings.default') }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
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
        </v-card>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useSettingsStore } from '../../stores/settingsStore';
import { settingsClient } from '@/ipc/settingsClient';
import type { SettingsCurrencyResponse, CompanySettings } from '../../types/domain';
import type { Ref } from 'vue';

const store = useSettingsStore();

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.unexpected') : null
);

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

const currencyOptions: Ref<{ title: string; value: string }[]> = ref([
  { title: 'USD - US Dollar', value: 'USD' },
  { title: 'IQD - Iraqi Dinar', value: 'IQD' },
  { title: 'EUR - Euro', value: 'EUR' },
  { title: 'GBP - British Pound', value: 'GBP' },
  { title: 'SAR - Saudi Riyal', value: 'SAR' },
  { title: 'AED - UAE Dirham', value: 'AED' },
  { title: 'EGP - Egyptian Pound', value: 'EGP' },
  { title: 'JOD - Jordanian Dinar', value: 'JOD' },
  { title: 'KWD - Kuwaiti Dinar', value: 'KWD' },
]);

const printers: Ref<{ title: string; isDefault: boolean; value: string }[]> = ref([]);
const selectedPrinter =
  ref<string | null>(null) || JSON.parse(localStorage.getItem('selectedPrinter') || 'null');

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

async function loadPrinters() {
  try {
    const result: any = await store.fetchPrinters();
    if (!result.ok) {
      console.error('Failed to load printers:', result.error);
    }

    printers.value = result?.data?.printers || [];
  } catch (err) {
    console.error('Failed to load printers:', err);
  }
}

function saveSelectedPrinter() {
  if (selectedPrinter.value) {
    localStorage.setItem('selectedPrinter', JSON.stringify(selectedPrinter.value));
  }
}

onMounted(() => {
  loadCompanySettings();
  loadCurrency();
  loadPrinters();
});
</script>
