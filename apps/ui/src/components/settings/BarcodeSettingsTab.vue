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

const saving = ref(false);

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
    const result = await settingsClient.get('barcode');
    if (result.ok && result.data) {
      Object.assign(barcodeSettings, result.data);
    }
  } catch (err) {
    console.error('Failed to load barcode settings:', err);
  }
}

async function save() {
  saving.value = true;
  try {
    await settingsClient.set('barcode', JSON.stringify({ ...barcodeSettings }));
  } catch (err) {
    console.error('Failed to save barcode settings:', err);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>
