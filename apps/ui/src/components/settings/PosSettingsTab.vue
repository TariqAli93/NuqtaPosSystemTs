<template>
  <div>
    <v-card class="pa-4 mb-4" flat>
      <v-card-title class="d-flex align-center ga-2 mb-4">
        <v-icon color="primary">mdi-point-of-sale</v-icon>
        <span>إعدادات نقطة البيع</span>
      </v-card-title>

      <v-form @submit.prevent="save">
        <v-row>
          <v-col cols="12" md="6">
            <v-switch
              v-model="posSettings.enableBarcodeScanner"
              label="تفعيل ماسح الباركود"
              color="primary"
              hide-details
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="posSettings.autoAddOnScan"
              label="إضافة تلقائية عند المسح"
              color="primary"
              hide-details
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="posSettings.showStockWarning"
              label="إظهار تحذير المخزون"
              color="primary"
              hide-details
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="posSettings.defaultTaxRate"
              label="نسبة الضريبة الافتراضية (%)"
              type="number"
              min="0"
              max="100"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="posSettings.defaultPaymentType"
              :items="paymentTypes"
              label="طريقة الدفع الافتراضية"
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

const paymentTypes = [
  { title: 'نقدي', value: 'cash' },
  { title: 'مختلط', value: 'mixed' },
];

const posSettings = reactive({
  enableBarcodeScanner: true,
  autoAddOnScan: true,
  showStockWarning: true,
  defaultTaxRate: 0,
  defaultPaymentType: 'cash',
});

async function loadSettings() {
  try {
    const result = await settingsClient.get('pos');
    if (result.ok && result.data) {
      Object.assign(posSettings, result.data);
    }
  } catch (err) {
    console.error('Failed to load POS settings:', err);
  }
}

async function save() {
  saving.value = true;
  try {
    await settingsClient.set('pos', { ...posSettings });
  } catch (err) {
    console.error('Failed to save POS settings:', err);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>
