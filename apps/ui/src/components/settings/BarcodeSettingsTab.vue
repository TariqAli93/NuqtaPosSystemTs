<template>
  <div>
    <v-card class="pa-4 mb-4" flat>
      <v-card-title class="d-flex align-center ga-2 mb-4">
        <v-icon color="primary">mdi-barcode-scan</v-icon>
        <span>إعدادات الباركود</span>
      </v-card-title>

      <v-form @submit.prevent="save">
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="barcodeSettings.defaultFormat"
              :items="barcodeFormats"
              label="تنسيق الباركود الافتراضي"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="barcodeSettings.prefix"
              label="بادئة الباركود"
              variant="outlined"
              density="compact"
              hint="تُضاف تلقائياً قبل رقم الباركود المولّد"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="barcodeSettings.labelWidth"
              label="عرض الملصق (مم)"
              type="number"
              min="20"
              max="200"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="barcodeSettings.labelHeight"
              label="ارتفاع الملصق (مم)"
              type="number"
              min="10"
              max="100"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="barcodeSettings.showPrice"
              label="إظهار السعر على الملصق"
              color="primary"
              hide-details
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch
              v-model="barcodeSettings.showProductName"
              label="إظهار اسم المنتج"
              color="primary"
              hide-details
              class="mb-3"
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

const TYPED_BARCODE_KEYS = [
  'barcode.defaultFormat',
  'barcode.prefix',
  'barcode.labelWidth',
  'barcode.labelHeight',
  'barcode.showPrice',
  'barcode.showProductName',
] as const;

const barcodeFormats = [
  { title: 'EAN-13', value: 'ean13' },
  { title: 'EAN-8', value: 'ean8' },
  { title: 'Code 128', value: 'code128' },
  { title: 'Code 39', value: 'code39' },
  { title: 'QR Code', value: 'qr' },
];

const barcodeSettings = reactive({
  defaultFormat: 'ean13',
  prefix: '',
  labelWidth: 50,
  labelHeight: 30,
  showPrice: true,
  showProductName: true,
});

async function loadSettings() {
  try {
    const result = await settingsClient.getTyped([...TYPED_BARCODE_KEYS]);
    if (result.ok && result.data) {
      const data = result.data;
      if (typeof data['barcode.defaultFormat'] === 'string') {
        barcodeSettings.defaultFormat = data['barcode.defaultFormat'];
      }
      if (typeof data['barcode.prefix'] === 'string') {
        barcodeSettings.prefix = data['barcode.prefix'];
      }
      if (typeof data['barcode.labelWidth'] === 'number') {
        barcodeSettings.labelWidth = data['barcode.labelWidth'];
      }
      if (typeof data['barcode.labelHeight'] === 'number') {
        barcodeSettings.labelHeight = data['barcode.labelHeight'];
      }
      if (typeof data['barcode.showPrice'] === 'boolean') {
        barcodeSettings.showPrice = data['barcode.showPrice'];
      }
      if (typeof data['barcode.showProductName'] === 'boolean') {
        barcodeSettings.showProductName = data['barcode.showProductName'];
      }
    }
  } catch (err) {
    console.error('Failed to load barcode settings:', err);
    notifyError(toUserMessage(err));
  }
}

async function save() {
  saving.value = true;
  try {
    if (
      !Number.isInteger(barcodeSettings.labelWidth) ||
      !Number.isInteger(barcodeSettings.labelHeight)
    ) {
      throw new Error('Barcode label dimensions must be integers');
    }
    await settingsClient.setTyped({
      'barcode.defaultFormat': barcodeSettings.defaultFormat,
      'barcode.prefix': barcodeSettings.prefix,
      'barcode.labelWidth': barcodeSettings.labelWidth,
      'barcode.labelHeight': barcodeSettings.labelHeight,
      'barcode.showPrice': barcodeSettings.showPrice,
      'barcode.showProductName': barcodeSettings.showProductName,
    });
    notifySuccess('تم حفظ إعدادات الباركود');
  } catch (err) {
    console.error('Failed to save barcode settings:', err);
    notifyError(toUserMessage(err));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>
