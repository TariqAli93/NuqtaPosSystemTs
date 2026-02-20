<template>
  <div>
    <v-card class="pa-4 mb-4" flat>
      <v-card-title class="d-flex align-center ga-2 mb-4">
        <v-icon color="primary">mdi-calculator-variant</v-icon>
        <span>إعدادات المحاسبة</span>
      </v-card-title>

      <v-form @submit.prevent="save">
        <v-row>
          <v-col cols="12" md="6">
            <v-switch
              v-model="accountingSettings.autoPostOnSale"
              label="ترحيل تلقائي عند البيع"
              color="primary"
              hide-details
              class="mb-3"
              hint="عند التفعيل، يتم إنشاء قيد محاسبي تلقائياً لكل عملية بيع"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="accountingSettings.autoPostOnPurchase"
              label="ترحيل تلقائي عند الشراء"
              color="primary"
              hide-details
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="accountingSettings.enforceBalancedEntries"
              label="فرض توازن القيود"
              color="primary"
              hide-details
              class="mb-3"
              hint="رفض القيود المحاسبية غير المتوازنة (مدين ≠ دائن)"
              persistent-hint
            />
          </v-col>
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

const saving = ref(false);

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

async function loadSettings() {
  try {
    const result = await settingsClient.get('accounting');
    if (result.ok && result.data) {
      Object.assign(accountingSettings, result.data);
    }
  } catch (err) {
    console.error('Failed to load accounting settings:', err);
  }
}

async function save() {
  saving.value = true;
  try {
    await settingsClient.set('accounting', { ...accountingSettings });
  } catch (err) {
    console.error('Failed to save accounting settings:', err);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>
