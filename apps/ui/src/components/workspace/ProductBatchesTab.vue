<template>
  <div v-if="product">
    <v-card variant="tonal" class="mb-3">
      <v-card-title class="text-subtitle-2 font-weight-bold">إضافة دفعة</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="batchForm.batchNumber"
              label="رقم الدفعة"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model.number="batchForm.quantityReceived"
              label="الكمية"
              type="number"
              min="1"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model.number="batchForm.costPerUnit"
              label="التكلفة"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="batchForm.expiryDate"
              label="تاريخ الانتهاء"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn color="primary" @click="saveBatch">إضافة</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-data-table
      :headers="headers"
      :items="batches"
      :loading="loading"
      density="compact"
      :items-per-page="20"
    >
      <template #item.expiryDate="{ item }">
        <v-chip
          v-if="item.expiryDate"
          size="x-small"
          variant="tonal"
          :color="isExpiringSoon(item.expiryDate) ? 'warning' : 'default'"
        >
          {{ formatDate(item.expiryDate) }}
        </v-chip>
        <span v-else>—</span>
      </template>
      <template #item.costPerUnit="{ item }">
        {{ formatMoney(item.costPerUnit || 0) }}
      </template>
      <template #item.status="{ item }">
        <v-chip size="x-small" variant="tonal" :color="statusColor(item.status)">
          {{ statusLabel(item.status) }}
        </v-chip>
      </template>
      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد دفعات مسجلة لهذا المنتج</div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { formatDate, formatMoney } from '@/utils/formatters';
import type { Product, ProductBatch } from '@nuqtaplus/core';
import type { ProductBatchInput } from '@/types/workspace';
import { notifyInfo } from '@/utils/notify';

const props = defineProps<{
  product: Product | null;
  batches: ProductBatch[];
  loading: boolean;
}>();

watch(
  () => props.product,
  (value) => {
    if (value) return;
    notifyInfo('اختر منتجاً لعرض الدفعات', { dedupeKey: 'batches-no-product' });
  },
  { immediate: true }
);

const emit = defineEmits<{
  createBatch: [payload: ProductBatchInput];
}>();

const batchForm = reactive<{
  batchNumber: string;
  quantityReceived: number;
  costPerUnit: number;
  expiryDate: string;
}>({
  batchNumber: '',
  quantityReceived: 1,
  costPerUnit: 0,
  expiryDate: '',
});

const headers = [
  { title: 'رقم الدفعة', key: 'batchNumber' },
  { title: 'الكمية المستلمة', key: 'quantityReceived', align: 'center' as const, width: 110 },
  { title: 'المتوفر', key: 'quantityOnHand', align: 'center' as const, width: 90 },
  { title: 'تكلفة الوحدة', key: 'costPerUnit', align: 'end' as const, width: 120 },
  { title: 'الانتهاء', key: 'expiryDate', width: 130 },
  { title: 'الحالة', key: 'status', width: 90 },
];

function saveBatch(): void {
  if (!props.product?.id) return;
  if (!batchForm.batchNumber.trim()) return;
  if (batchForm.quantityReceived <= 0) return;

  emit('createBatch', {
    productId: props.product.id,
    batchNumber: batchForm.batchNumber.trim(),
    quantityReceived: batchForm.quantityReceived,
    quantityOnHand: batchForm.quantityReceived,
    costPerUnit: batchForm.costPerUnit || undefined,
    expiryDate: batchForm.expiryDate || null,
    manufacturingDate: null,
    status: 'active',
    notes: null,
  });

  batchForm.batchNumber = '';
  batchForm.quantityReceived = 1;
  batchForm.costPerUnit = 0;
  batchForm.expiryDate = '';
}

function isExpiringSoon(dateValue: string): boolean {
  const value = new Date(dateValue).getTime();
  const now = Date.now();
  return value <= now + 30 * 24 * 60 * 60 * 1000;
}

function statusLabel(value: string): string {
  if (value === 'active') return 'فعالة';
  if (value === 'expired') return 'منتهية';
  if (value === 'depleted') return 'منتهية المخزون';
  return value || '—';
}

function statusColor(value: string): string {
  if (value === 'active') return 'success';
  if (value === 'expired') return 'warning';
  if (value === 'depleted') return 'error';
  return 'default';
}
</script>
