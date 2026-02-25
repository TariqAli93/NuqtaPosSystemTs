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
        <v-form class="win-form" @submit.prevent="submit">
          <v-text-field v-model="form.name" :label="t('products.name')" required />
          <div class="d-flex flex-wrap ga-2">
            <v-text-field v-model="form.sku" :label="t('products.sku')" />
            <v-text-field
              v-model="form.barcode"
              :label="t('products.barcode')"
              data-barcode-field
            />
            <MoneyInput v-model="form.costPrice" :label="t('products.costPrice')" />
            <MoneyInput v-model="form.sellingPrice" :label="t('products.sellingPrice')" required />

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
            <v-btn variant="text" class="win-ghost-btn" :to="props.redirectTo">{{
              t('common.cancel')
            }}</v-btn>
          </div>
        </v-form>
      </v-card>

      <!-- ── Units & Pricing (edit mode only) ── -->
      <v-card v-if="isEdit" class="win-card win-card--padded mt-6" flat>
        <v-card-title class="d-flex align-center justify-space-between px-0 pt-0">
          <div class="d-flex align-center ga-2">
            <v-icon size="20">mdi-package-variant</v-icon>
            <span class="text-h6">{{ t('products.unitsAndPricing') }}</span>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-plus"
            @click="openAddUnitDialog"
          >
            {{ t('products.addUnit') }}
          </v-btn>
        </v-card-title>

        <v-table v-if="units.length > 0" density="comfortable" class="mt-2">
          <thead>
            <tr>
              <th>{{ t('products.unitName') }}</th>
              <th>{{ t('products.factorToBase') }}</th>
              <th>{{ t('products.sellingPrice') }}</th>
              <th>{{ t('products.barcode') }}</th>
              <th>{{ t('products.default') }}</th>
              <th>{{ t('common.active') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="unit in units" :key="unit.id">
              <td class="font-weight-medium">{{ unit.unitName }}</td>
              <td>
                {{ unit.factorToBase }}
                <span v-if="unit.factorToBase > 1" class="text-caption text-medium-emphasis mr-1">
                  (1 {{ unit.unitName }} = {{ unit.factorToBase }} {{ form.unit || 'قطعة' }})
                </span>
              </td>
              <td>{{ unit.sellingPrice != null ? formatPrice(unit.sellingPrice) : '—' }}</td>
              <td>{{ unit.barcode || '—' }}</td>
              <td>
                <v-chip
                  size="x-small"
                  :color="unit.isDefault ? 'primary' : 'default'"
                  :variant="unit.isDefault ? 'flat' : 'outlined'"
                  @click="!unit.isDefault && setDefault(unit)"
                  class="cursor-pointer"
                >
                  {{ unit.isDefault ? t('products.defaultUnit') : t('products.setDefault') }}
                </v-chip>
              </td>
              <td>
                <v-icon :color="unit.isActive ? 'success' : 'grey'" size="18">
                  {{ unit.isActive ? 'mdi-check-circle' : 'mdi-close-circle' }}
                </v-icon>
              </td>
              <td>
                <v-btn icon size="x-small" variant="text" @click="openEditUnitDialog(unit)">
                  <v-icon size="16">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="confirmDeleteUnit(unit)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-sheet v-else class="text-center text-medium-emphasis py-8">
          <v-icon size="40" color="grey-lighten-2">mdi-package-variant-closed</v-icon>
          <div class="mt-2">{{ t('products.noUnitsConfigured') }}</div>
          <div class="text-caption mt-1">{{ t('products.noUnitsHint') }}</div>
        </v-sheet>
      </v-card>
    </div>

    <!-- ── Add / Edit Unit Dialog ── -->
    <v-dialog v-model="showUnitDialog" max-width="480">
      <v-card rounded="lg" class="pa-6">
        <v-card-title class="pa-0 text-h6">
          {{ editingUnit ? t('products.editUnit') : t('products.addUnit') }}
        </v-card-title>
        <v-card-text class="pa-0 mt-4">
          <v-text-field
            v-model="unitForm.unitName"
            :label="t('products.unitName')"
            required
            class="mb-2"
          />
          <v-text-field
            v-model.number="unitForm.factorToBase"
            :label="t('products.factorToBase')"
            type="number"
            :min="1"
            :hint="
              unitForm.factorToBase > 1
                ? `1 ${unitForm.unitName || '...'} = ${unitForm.factorToBase} ${form.unit || 'قطعة'}`
                : ''
            "
            persistent-hint
            class="mb-2"
          />
          <MoneyInput
            v-model="unitForm.sellingPrice"
            :label="t('products.sellingPrice')"
            class="mb-2"
          />
          <v-text-field v-model="unitForm.barcode" :label="t('products.barcode')" class="mb-2" />
          <div class="d-flex ga-4">
            <v-switch
              v-model="unitForm.isDefault"
              :label="t('products.default')"
              density="compact"
            />
            <v-switch v-model="unitForm.isActive" :label="t('common.active')" density="compact" />
          </div>
        </v-card-text>
        <v-card-actions class="pa-0 mt-4 justify-end ga-2">
          <v-btn variant="text" @click="showUnitDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="unitSaving" @click="saveUnit">
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Delete Confirmation ── -->
    <v-dialog v-model="showDeleteUnitConfirm" max-width="400">
      <v-card rounded="lg" class="pa-6">
        <v-card-title class="pa-0 text-h6">{{ t('products.deleteUnit') }}</v-card-title>
        <v-card-text class="pa-0 mt-4">
          {{ t('products.deleteUnitConfirm') }} "{{ pendingDeleteUnit?.unitName }}"
        </v-card-text>
        <v-card-actions class="pa-0 mt-6 justify-end ga-2">
          <v-btn variant="text" @click="showDeleteUnitConfirm = false">{{
            t('common.cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" :loading="unitSaving" @click="deleteUnit">
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useProductsStore } from '../../stores/productsStore';
import type { ProductInput, ProductUnit } from '../../types/domain';
import { useGlobalBarcodeScanner } from '../../composables/useGlobalBarcodeScanner';
import MoneyInput from '@/components/shared/MoneyInput.vue';
import { productsClient } from '@/ipc';
import { notifyError, notifyInfo, notifySuccess, notifyWarn } from '@/utils/notify';
import { toUserMessage } from '@/utils/errorMessage';

const props = withDefaults(
  defineProps<{
    redirectTo?: string;
  }>(),
  {
    redirectTo: '/products',
  }
);

const store = useProductsStore();
const route = useRoute();
const router = useRouter();

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.unexpected') : null
);

watch(localizedError, (value) => {
  if (!value) return;
  notifyError(value, { dedupeKey: 'product-form-error' });
});

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
  isExpire: false,
});

// ── Unit Management State ────────────────────────────────────
const units = ref<ProductUnit[]>([]);
const showUnitDialog = ref(false);
const showDeleteUnitConfirm = ref(false);
const editingUnit = ref<ProductUnit | null>(null);
const pendingDeleteUnit = ref<ProductUnit | null>(null);
const unitSaving = ref(false);

const unitForm = reactive({
  unitName: '',
  factorToBase: 1,
  sellingPrice: 0,
  barcode: '',
  isDefault: false,
  isActive: true,
});

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(price);
}

async function loadUnits() {
  if (!isEdit.value) return;
  const productId = Number(idParam.value);
  if (Number.isNaN(productId)) return;
  try {
    const result = await productsClient.getUnits(productId);
    if (result.ok && result.data) {
      units.value = result.data;
    }
  } catch (err) {
    console.error('Failed to load units', err);
    notifyError(toUserMessage(err));
  }
}

function openAddUnitDialog() {
  editingUnit.value = null;
  Object.assign(unitForm, {
    unitName: '',
    factorToBase: 1,
    sellingPrice: form.sellingPrice || 0,
    barcode: '',
    isDefault: units.value.length === 0, // first unit is default
    isActive: true,
  });
  showUnitDialog.value = true;
}

function openEditUnitDialog(unit: ProductUnit) {
  editingUnit.value = unit;
  Object.assign(unitForm, {
    unitName: unit.unitName,
    factorToBase: unit.factorToBase,
    sellingPrice: unit.sellingPrice ?? 0,
    barcode: unit.barcode ?? '',
    isDefault: unit.isDefault,
    isActive: unit.isActive,
  });
  showUnitDialog.value = true;
}

async function saveUnit() {
  // Validation
  if (!unitForm.unitName.trim()) {
    notifyWarn(t('products.unitNameRequired'));
    return;
  }
  if (unitForm.factorToBase < 1 || !Number.isInteger(unitForm.factorToBase)) {
    notifyWarn(t('products.factorMustBePositiveInt'));
    return;
  }

  // Check unique name (except current editing unit)
  const duplicate = units.value.find(
    (u) => u.unitName === unitForm.unitName.trim() && u.id !== editingUnit.value?.id
  );
  if (duplicate) {
    notifyWarn(t('products.unitNameDuplicate'));
    return;
  }

  unitSaving.value = true;
  const productId = Number(idParam.value);

  try {
    if (editingUnit.value?.id) {
      const result = await productsClient.updateUnit(editingUnit.value.id, {
        unitName: unitForm.unitName.trim(),
        factorToBase: unitForm.factorToBase,
        sellingPrice: unitForm.sellingPrice || null,
        barcode: unitForm.barcode.trim() || null,
        isDefault: unitForm.isDefault,
        isActive: unitForm.isActive,
      });
      if (!result.ok) {
        notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
        return;
      }
    } else {
      const result = await productsClient.createUnit({
        productId,
        unitName: unitForm.unitName.trim(),
        factorToBase: unitForm.factorToBase,
        sellingPrice: unitForm.sellingPrice || null,
        barcode: unitForm.barcode.trim() || null,
        isDefault: unitForm.isDefault,
        isActive: unitForm.isActive,
      });
      if (!result.ok) {
        notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
        return;
      }
    }
    showUnitDialog.value = false;
    await loadUnits();
    notifySuccess(t('common.saved'));
  } catch (err) {
    notifyError(toUserMessage(err));
  } finally {
    unitSaving.value = false;
  }
}

function confirmDeleteUnit(unit: ProductUnit) {
  pendingDeleteUnit.value = unit;
  showDeleteUnitConfirm.value = true;
}

async function deleteUnit() {
  if (!pendingDeleteUnit.value?.id) return;
  unitSaving.value = true;
  try {
    const result = await productsClient.deleteUnit(pendingDeleteUnit.value.id);
    if (!result.ok) {
      notifyError(mapErrorToArabic(result.error, 'errors.deleteFailed'));
      return;
    }
    showDeleteUnitConfirm.value = false;
    pendingDeleteUnit.value = null;
    await loadUnits();
    notifySuccess(t('common.deleted'));
  } catch (err) {
    notifyError(toUserMessage(err));
  } finally {
    unitSaving.value = false;
  }
}

async function setDefault(unit: ProductUnit) {
  if (!unit.id) return;
  const productId = Number(idParam.value);
  try {
    const result = await productsClient.setDefaultUnit(productId, unit.id);
    if (!result.ok) {
      notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
      return;
    }
    await loadUnits();
    notifySuccess(t('common.saved'));
  } catch (err) {
    notifyError(toUserMessage(err));
  }
}

// ── Barcode Scanner ──────────────────────────────────────────
const scanner = useGlobalBarcodeScanner({
  mode: 'product',
  onScan: handleBarcodeScan,
  minLength: 4,
  maxInterKeyMs: 35,
  idleTimeoutMs: 180,
});

function handleBarcodeScan(barcode: string) {
  form.barcode = barcode;
  notifyInfo(t('pos.barcodeScanHint'), { dedupeKey: 'product-scan' });
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
        notifySuccess(t('common.saved'));
        await router.push(props.redirectTo);
      } else {
        notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
      }
    } catch (error) {
      notifyError(toUserMessage(error));
    }
  } else {
    try {
      const result = await store.createProduct(form);
      if (result.ok) {
        notifySuccess(t('common.saved'));
        await router.push(props.redirectTo);
      } else {
        notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
      }
    } catch (error) {
      notifyError(toUserMessage(error));
    }
  }
}

onMounted(() => {
  void loadProduct();
  void loadUnits();
  scanner.start();
});

onUnmounted(() => {
  scanner.stop();
});
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
