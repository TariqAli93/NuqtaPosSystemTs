<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="ds-page-header d-flex align-center justify-space-between mb-6">
        <template #prepend>
          <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" />
        </template>
        <v-app-bar-title>
          <div class="win-title mb-0">{{ isEdit ? t('products.edit') : t('products.new') }}</div>
          <div class="text-sm">{{ t('products.formHint') }}</div>
        </v-app-bar-title>
      </v-app-bar>

      <v-card class="win-card win-card--padded" flat>
        <v-alert v-if="localizedError" type="error" variant="tonal" class="mb-4">
          {{ localizedError }}
        </v-alert>
        <v-form class="win-form" @submit.prevent="submit">
          <v-text-field v-model="form.name" :label="t('products.name')" required />
          <div class="d-flex flex-wrap ga-2">
            <v-text-field v-model="form.sku" :label="t('products.sku')" />
            <v-text-field
              v-model="form.barcode"
              :label="t('products.barcode')"
              data-barcode-field
            />
            <v-text-field
              v-model.number="form.costPrice"
              :label="t('products.costPrice')"
              type="number"
            />
            <v-text-field
              v-model.number="form.sellingPrice"
              :label="t('products.sellingPrice')"
              type="number"
              required
            />
            <v-text-field v-model.number="form.stock" :label="t('products.stock')" type="number" />
            <v-text-field
              v-model.number="form.minStock"
              :label="t('products.minStock')"
              type="number"
            />
            <v-text-field v-model="form.unit" :label="t('products.unit')" />
            <v-text-field v-model="form.supplier" :label="t('products.supplier')" />
          </div>
          <v-select
            v-model="form.status"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            :label="t('products.status')"
          />
          <v-switch v-model="form.isActive" :label="t('common.active')" />
          <v-textarea v-model="form.description" :label="t('products.description')" rows="3" />
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
            <v-btn variant="text" class="win-ghost-btn" to="/products">{{
              t('common.cancel')
            }}</v-btn>
          </div>
        </v-form>
      </v-card>
    </div>

    <v-snackbar v-model="showScanFeedback" :timeout="1500" location="top" color="info">
      <div class="d-flex align-center">
        <v-icon icon="mdi-barcode-scan" class="mr-2" />
        {{ scanFeedbackMessage }}
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useProductsStore } from '../../stores/productsStore';
import type { ProductInput } from '../../types/domain';
import { useGlobalBarcodeScanner } from '../../composables/useGlobalBarcodeScanner';

const store = useProductsStore();
const route = useRoute();
const router = useRouter();

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.unexpected') : null
);

const idParam = computed(() => route.params.id);
const isEdit = computed(() => typeof idParam.value === 'string');

const statusOptions = computed(() => [
  { title: t('products.available'), value: 'available' },
  { title: t('products.outOfStock'), value: 'out_of_stock' },
  { title: t('products.discontinued'), value: 'discontinued' },
]);

const form = reactive<ProductInput>({
  name: '',
  sku: null,
  barcode: null,
  categoryId: null,
  description: null,
  costPrice: 0,
  sellingPrice: 0,
  stock: 0,
  minStock: 0,
  unit: 'قطعة',
  supplier: null,
  status: 'available',
  isActive: true,
});

const showScanFeedback = ref(false);
const scanFeedbackMessage = ref('');

// Global barcode scanner integration
const scanner = useGlobalBarcodeScanner({
  mode: 'product',
  onScan: handleBarcodeScan,
  minLength: 4,
  maxInterKeyMs: 35,
  idleTimeoutMs: 180,
});

function handleBarcodeScan(barcode: string) {
  form.barcode = barcode;
  scanFeedbackMessage.value = t('pos.barcodeScanHint');
  showScanFeedback.value = true;
  setTimeout(() => {
    showScanFeedback.value = false;
  }, 1500);
}

async function loadProduct() {
  if (!isEdit.value) return;
  const id = Number(idParam.value);
  if (Number.isNaN(id)) return;
  const result = await store.fetchProductById(Number(id));

  console.log('Load Product Result:', result);
  if (result.ok && result.data) {
    Object.assign(form, {
      name: result.data.name,
      sku: result.data.sku ?? null,
      barcode: result.data.barcode ?? null,
      categoryId: result.data.categoryId ?? null,
      description: result.data.description ?? null,
      costPrice: result.data.costPrice,
      sellingPrice: result.data.sellingPrice,
      stock: result.data.stock,
      minStock: result.data.minStock,
      unit: result.data.unit,
      supplier: result.data.supplier ?? null,
      status: result.data.status,
      isActive: result.data.isActive,
    });
  }
}

async function submit() {
  if (isEdit.value) {
    try {
      const id = Number(idParam.value);
      if (Number.isNaN(id)) return;
      const result = await store.updateProduct(id, form);
      if (result.ok) {
        await router.push('/products');
      }
    } catch (error) {
      console.log(error);
    }
  } else {
    try {
      const result = await store.createProduct(form);
      if (result.ok) {
        await router.push('/products');
      }
    } catch (error) {
      console.log(error);
    }
  }
}

onMounted(() => {
  void loadProduct();
  scanner.start();
});

onUnmounted(() => {
  scanner.stop();
});
</script>
