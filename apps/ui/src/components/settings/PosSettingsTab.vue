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
import { notifyError, notifySuccess } from '@/utils/notify';
import { toUserMessage } from '@/utils/errorMessage';

const saving = ref(false);

const TYPED_POS_KEYS = [
  'pos.enableBarcodeScanner',
  'pos.autoAddOnScan',
  'pos.showStockWarning',
  'pos.defaultTaxRateBps',
  'pos.defaultPaymentMethod',
  'pos.autoGenerateInvoice',
] as const;

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
    const result = await settingsClient.getTyped([...TYPED_POS_KEYS]);
    if (result.ok && result.data) {
      const data = result.data;
      if (typeof data['pos.enableBarcodeScanner'] === 'boolean') {
        posSettings.enableBarcodeScanner = data['pos.enableBarcodeScanner'];
      }
      if (typeof data['pos.autoAddOnScan'] === 'boolean') {
        posSettings.autoAddOnScan = data['pos.autoAddOnScan'];
      } else if (typeof data['pos.autoGenerateInvoice'] === 'boolean') {
        posSettings.autoAddOnScan = data['pos.autoGenerateInvoice'];
      }
      if (typeof data['pos.showStockWarning'] === 'boolean') {
        posSettings.showStockWarning = data['pos.showStockWarning'];
      }
      if (typeof data['pos.defaultTaxRateBps'] === 'number') {
        posSettings.defaultTaxRate = Math.max(0, Math.trunc(data['pos.defaultTaxRateBps'] / 100));
      }
      if (typeof data['pos.defaultPaymentMethod'] === 'string') {
        posSettings.defaultPaymentType = data['pos.defaultPaymentMethod'];
      }
    }
  } catch (err) {
    console.error('Failed to load POS settings:', err);
    notifyError(toUserMessage(err));
  }
}

async function save() {
  saving.value = true;
  try {
    if (!Number.isInteger(posSettings.defaultTaxRate)) {
      throw new Error('Default tax rate must be an integer percentage');
    }
    await settingsClient.setTyped({
      'pos.enableBarcodeScanner': posSettings.enableBarcodeScanner,
      'pos.autoAddOnScan': posSettings.autoAddOnScan,
      'pos.showStockWarning': posSettings.showStockWarning,
      'pos.defaultTaxRateBps': posSettings.defaultTaxRate * 100,
      'pos.defaultPaymentMethod': posSettings.defaultPaymentType,
      'pos.autoGenerateInvoice': posSettings.autoAddOnScan,
    });
    notifySuccess('تم حفظ إعدادات نقطة البيع');
  } catch (err) {
    console.error('Failed to save POS settings:', err);
    notifyError(toUserMessage(err));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>
