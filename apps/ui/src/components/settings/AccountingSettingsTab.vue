<template>
  <div>
    <v-card class="pa-4 mb-4" flat>
      <v-card-title class="d-flex align-center ga-2 mb-4">
        <v-icon color="primary">mdi-calculator-variant</v-icon>
        <span>إعدادات المحاسبة</span>
      </v-card-title>

      <v-form @submit.prevent="save">
        <v-row>
          <v-col cols="12" md="4">
            <v-switch
              v-model="accountingSettings.autoPostOnSale"
              label="ترحيل تلقائي عند البيع"
              color="primary"
              hint="إنشاء قيود محاسبية تلقائياً عند تسجيل عمليات البيع"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-switch
              v-model="accountingSettings.autoPostOnPurchase"
              label="ترحيل تلقائي عند الشراء"
              color="primary"
              hint="إنشاء قيود محاسبية تلقائياً عند تسجيل عمليات الشراء"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-switch
              v-model="accountingSettings.enforceBalancedEntries"
              label="فرض توازن القيود"
              color="primary"
              hint="رفض القيود المحاسبية غير المتوازنة (مدين ≠ دائن)"
              persistent-hint
            />
          </v-col>

          <v-divider class="my-4" />
          <v-col cols="12" md="6">
            <v-select
              v-model="accountingSettings.defaultCostMethod"
              :items="costMethods"
              label="طريقة حساب التكلفة"
              variant="outlined"
              density="compact"
              hint="FIFO: الوارد أولاً صادر أولاً"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="accountingSettings.fiscalYearStart"
              :items="months"
              label="بداية السنة المالية"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-btn type="submit" color="primary" variant="flat" class="mt-4" :loading="saving">
          حفظ
        </v-btn>
      </v-form>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { settingsClient } from '@/ipc/settingsClient';
import { notifyError, notifySuccess } from '@/utils/notify';
import { toUserMessage } from '@/utils/errorMessage';

const saving = ref(false);

const TYPED_ACCOUNTING_KEYS = [
  'accounting.autoPostOnSale',
  'accounting.autoPostOnPurchase',
  'accounting.enforceBalancedEntries',
  'accounting.defaultCostMethod',
  'accounting.fiscalYearStart',
] as const;

const costMethods = [
  { title: 'FIFO — الوارد أولاً صادر أولاً', value: 'fifo' },
  { title: 'المتوسط المرجح', value: 'weighted_average' },
];

const months = [
  { title: 'يناير', value: 1 },
  { title: 'فبراير', value: 2 },
  { title: 'مارس', value: 3 },
  { title: 'أبريل', value: 4 },
  { title: 'مايو', value: 5 },
  { title: 'يونيو', value: 6 },
  { title: 'يوليو', value: 7 },
  { title: 'أغسطس', value: 8 },
  { title: 'سبتمبر', value: 9 },
  { title: 'أكتوبر', value: 10 },
  { title: 'نوفمبر', value: 11 },
  { title: 'ديسمبر', value: 12 },
];

const accountingSettings = reactive({
  autoPostOnSale: true,
  autoPostOnPurchase: true,
  enforceBalancedEntries: true,
  defaultCostMethod: 'fifo',
  fiscalYearStart: 1,
});

function parseFiscalYearStartMonth(value: unknown): number {
  if (typeof value === 'string') {
    const match = /^(\d{2})-01$/.exec(value.trim());
    if (match) {
      const month = Number.parseInt(match[1], 10);
      if (month >= 1 && month <= 12) return month;
    }
    const fallback = Number.parseInt(value, 10);
    if (fallback >= 1 && fallback <= 12) return fallback;
    return 1;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12) {
    return value;
  }
  return 1;
}

async function loadSettings() {
  try {
    const result = await settingsClient.getTyped([...TYPED_ACCOUNTING_KEYS]);
    if (result.ok && result.data) {
      const data = result.data;
      if (typeof data['accounting.autoPostOnSale'] === 'boolean') {
        accountingSettings.autoPostOnSale = data['accounting.autoPostOnSale'];
      }
      if (typeof data['accounting.autoPostOnPurchase'] === 'boolean') {
        accountingSettings.autoPostOnPurchase = data['accounting.autoPostOnPurchase'];
      }
      if (typeof data['accounting.enforceBalancedEntries'] === 'boolean') {
        accountingSettings.enforceBalancedEntries = data['accounting.enforceBalancedEntries'];
      }
      if (typeof data['accounting.defaultCostMethod'] === 'string') {
        accountingSettings.defaultCostMethod = data['accounting.defaultCostMethod'];
      }
      accountingSettings.fiscalYearStart = parseFiscalYearStartMonth(
        data['accounting.fiscalYearStart']
      );
    }
  } catch (err) {
    console.error('Failed to load accounting settings:', err);
    notifyError(toUserMessage(err));
  }
}

async function save() {
  saving.value = true;
  try {
    const month = parseFiscalYearStartMonth(accountingSettings.fiscalYearStart);
    await settingsClient.setTyped({
      'accounting.autoPostOnSale': accountingSettings.autoPostOnSale,
      'accounting.autoPostOnPurchase': accountingSettings.autoPostOnPurchase,
      'accounting.enforceBalancedEntries': accountingSettings.enforceBalancedEntries,
      'accounting.defaultCostMethod': accountingSettings.defaultCostMethod,
      'accounting.fiscalYearStart': `${String(month).padStart(2, '0')}-01`,
    });
    notifySuccess('تم حفظ إعدادات المحاسبة');
  } catch (err) {
    console.error('Failed to save accounting settings:', err);
    notifyError(toUserMessage(err));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>
