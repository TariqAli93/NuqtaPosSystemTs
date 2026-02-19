<template>
  <div v-if="product">
    <v-row dense>
      <v-card class="w-full">
        <v-col cols="12">
          <v-card variant="tonal">
            <v-card-title class="text-subtitle-2 font-weight-bold">الوحدات</v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="unitForm.unitName"
                    label="اسم الوحدة"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-text-field
                    v-model.number="unitForm.factorToBase"
                    label="المعامل"
                    type="number"
                    min="1"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model.number="unitForm.sellingPrice"
                    label="سعر بيع (اختياري)"
                    type="number"
                    min="0"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
              </v-row>

              <v-row dense class="mt-2">
                <v-col cols="12" sm="8">
                  <v-text-field
                    v-model="unitForm.barcode"
                    label="باركود الوحدة (اختياري)"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="4" class="d-flex align-center">
                  <v-checkbox
                    v-model="unitForm.isDefault"
                    label="افتراضية"
                    density="compact"
                    hide-details
                  />
                </v-col>
              </v-row>

              <div class="mt-3 d-flex ga-2">
                <v-btn color="primary" size="small" @click="saveUnit">
                  {{ unitForm.id ? 'تحديث' : 'إضافة' }}
                </v-btn>
                <v-btn v-if="unitForm.id" variant="text" size="small" @click="resetUnitForm">
                  إلغاء
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" class="mt-4">
          <v-data-table
            :headers="unitHeaders"
            :items="units"
            :loading="loading"
            density="compact"
            :items-per-page="10"
          >
            <template #item.isDefault="{ item }">
              <v-chip v-if="item.isDefault" size="x-small" color="primary" variant="tonal">
                افتراضي
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="editUnit(item)" />
              <v-btn
                icon="mdi-star"
                size="x-small"
                variant="text"
                color="primary"
                :disabled="item.isDefault"
                @click="emitSetDefault(item.id)"
              />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="emitDelete(item.id)"
              />
            </template>
            <template #no-data>
              <div class="text-center py-6 text-medium-emphasis">لا توجد وحدات مخصصة</div>
            </template>
          </v-data-table>
        </v-col>
      </v-card>

      <v-card class="w-full mt-4">
        <v-col cols="12">
          <v-card variant="tonal">
            <v-card-title class="text-subtitle-2 font-weight-bold">طباعة الباركود</v-card-title>
            <v-card-text>
              <v-select
                v-model="printTemplateId"
                :items="templates"
                item-title="name"
                item-value="id"
                label="قالب الطباعة"
                variant="outlined"
                density="compact"
                class="mb-2"
                hide-details
              />
              <v-text-field
                v-model.number="printQuantity"
                label="عدد الملصقات"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                class="mb-2"
                hide-details
              />
              <v-btn color="primary" prepend-icon="mdi-printer" @click="createPrintJob">
                إنشاء مهمة طباعة
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12">
          <v-data-table
            :headers="jobHeaders"
            :items="printJobs"
            :loading="loading"
            density="compact"
            :items-per-page="10"
          >
            <template #item.status="{ item }">
              <v-chip
                size="x-small"
                variant="tonal"
                :color="
                  item.status === 'printed'
                    ? 'success'
                    : item.status === 'failed'
                      ? 'error'
                      : 'warning'
                "
              >
                {{ statusLabel(item.status) }}
              </v-chip>
            </template>
            <template #item.createdAt="{ item }">
              {{ formatDate(item.createdAt) }}
            </template>
            <template #no-data>
              <div class="text-center py-6 text-medium-emphasis">لا توجد مهام طباعة بعد</div>
            </template>
          </v-data-table>
        </v-col>
      </v-card>
    </v-row>
  </div>

  <v-alert v-else type="info" variant="tonal">اختر منتجاً لإدارة الوحدات والباركود</v-alert>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { formatDate } from '@/utils/formatters';
import type { BarcodePrintJob, BarcodeTemplate, Product, ProductUnit } from '@nuqtaplus/core';
import type { ProductUnitInput } from '@/types/workspace';

const props = defineProps<{
  product: Product | null;
  units: ProductUnit[];
  templates: BarcodeTemplate[];
  printJobs: BarcodePrintJob[];
  loading: boolean;
}>();

const emit = defineEmits<{
  saveUnit: [payload: { unitId?: number; input: ProductUnitInput }];
  deleteUnit: [unitId: number];
  setDefaultUnit: [unitId: number];
  createPrintJob: [payload: { templateId: number; quantity: number }];
}>();

const unitForm = reactive<{
  id?: number;
  unitName: string;
  factorToBase: number;
  barcode?: string | null;
  sellingPrice?: number | null;
  isDefault: boolean;
  isActive: boolean;
}>({
  unitName: '',
  factorToBase: 1,
  barcode: null,
  sellingPrice: null,
  isDefault: false,
  isActive: true,
});

const printTemplateId = ref<number | null>(null);
const printQuantity = ref(1);

const unitHeaders = [
  { title: 'الوحدة', key: 'unitName' },
  { title: 'المعامل', key: 'factorToBase', align: 'center' as const, width: 90 },
  { title: 'السعر', key: 'sellingPrice', align: 'end' as const, width: 100 },
  { title: 'افتراضي', key: 'isDefault', align: 'center' as const, width: 80 },
  { title: 'إجراءات', key: 'actions', sortable: false, width: 120 },
];

const jobHeaders = [
  { title: 'التاريخ', key: 'createdAt', width: 130 },
  { title: 'القالب', key: 'templateId', width: 80 },
  { title: 'الكمية', key: 'quantity', width: 70, align: 'center' as const },
  { title: 'الحالة', key: 'status', width: 90 },
];

function saveUnit(): void {
  if (!props.product?.id || !unitForm.unitName.trim()) return;
  emit('saveUnit', {
    unitId: unitForm.id,
    input: {
      productId: props.product.id,
      unitName: unitForm.unitName.trim(),
      factorToBase: Math.max(1, unitForm.factorToBase || 1),
      barcode: unitForm.barcode || null,
      sellingPrice: unitForm.sellingPrice ?? null,
      isDefault: unitForm.isDefault,
      isActive: unitForm.isActive,
    },
  });
  resetUnitForm();
}

function editUnit(item: ProductUnit): void {
  unitForm.id = item.id;
  unitForm.unitName = item.unitName;
  unitForm.factorToBase = item.factorToBase;
  unitForm.barcode = item.barcode ?? null;
  unitForm.sellingPrice = item.sellingPrice ?? null;
  unitForm.isDefault = Boolean(item.isDefault);
  unitForm.isActive = Boolean(item.isActive);
}

function resetUnitForm(): void {
  unitForm.id = undefined;
  unitForm.unitName = '';
  unitForm.factorToBase = 1;
  unitForm.barcode = null;
  unitForm.sellingPrice = null;
  unitForm.isDefault = false;
  unitForm.isActive = true;
}

function createPrintJob(): void {
  if (!props.product || !printTemplateId.value || printQuantity.value <= 0) return;
  emit('createPrintJob', {
    templateId: printTemplateId.value,
    quantity: printQuantity.value,
  });
}

function emitSetDefault(unitId?: number): void {
  if (!unitId) return;
  emit('setDefaultUnit', unitId);
}

function emitDelete(unitId?: number): void {
  if (!unitId) return;
  emit('deleteUnit', unitId);
}

function statusLabel(value: string): string {
  if (value === 'printed') return 'مطبوع';
  if (value === 'printing') return 'قيد الطباعة';
  if (value === 'failed') return 'فشل';
  return 'معلق';
}
</script>
