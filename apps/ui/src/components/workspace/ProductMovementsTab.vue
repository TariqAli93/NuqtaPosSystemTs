<template>
  <div>
    <v-row dense class="mb-3">
      <v-col cols="12" md="3">
        <v-select
          v-model="movementType"
          :items="movementTypeOptions"
          item-title="title"
          item-value="value"
          label="نوع الحركة"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="sourceType"
          :items="sourceTypeOptions"
          item-title="title"
          item-value="value"
          label="المصدر"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-text-field
          v-model="dateFrom"
          label="من تاريخ"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-text-field
          v-model="dateTo"
          label="إلى تاريخ"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="2" class="d-flex ga-2">
        <v-btn color="primary" variant="tonal" @click="reload">تطبيق</v-btn>
        <v-btn variant="text" @click="resetFilters">مسح</v-btn>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="movements"
      :loading="loading"
      density="compact"
      :items-per-page="15"
    >
      <template #item.createdAt="{ item }">
        {{ formatDate(item.createdAt) }}
      </template>
      <template #item.movementType="{ item }">
        <v-chip size="x-small" variant="tonal" :color="movementColor(item.movementType)">
          {{ movementLabel(item.movementType) }}
        </v-chip>
      </template>
      <template #item.sourceType="{ item }">
        <v-chip size="x-small" variant="tonal" color="info">
          {{ sourceLabel(item.sourceType) }}
        </v-chip>
      </template>
      <template #item.quantityBase="{ item }">
        <span :class="signedClass(item.movementType)">
          {{ signedPrefix(item.movementType) }}{{ item.quantityBase }}
        </span>
      </template>
      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد حركات لهذا المنتج</div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { formatDate } from '@/utils/formatters';
import type { InventoryMovement } from '@nuqtaplus/core';

const props = defineProps<{
  productId: number;
  movements: InventoryMovement[];
  total: number;
  loading: boolean;
}>();

const emit = defineEmits<{
  reload: [
    filters: {
      productId: number;
      movementType?: string;
      sourceType?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    },
  ];
}>();

const movementType = ref<string | undefined>();
const sourceType = ref<string | undefined>();
const dateFrom = ref('');
const dateTo = ref('');

const headers = [
  { title: 'التاريخ', key: 'createdAt', width: 140 },
  { title: 'الحركة', key: 'movementType', width: 90 },
  { title: 'المصدر', key: 'sourceType', width: 110 },
  { title: 'السبب', key: 'reason', width: 110 },
  { title: 'الكمية', key: 'quantityBase', align: 'center' as const, width: 90 },
  { title: 'قبل', key: 'stockBefore', align: 'center' as const, width: 70 },
  { title: 'بعد', key: 'stockAfter', align: 'center' as const, width: 70 },
  { title: 'ملاحظات', key: 'notes' },
];

const movementTypeOptions = [
  { title: 'الكل', value: undefined },
  { title: 'دخول', value: 'in' },
  { title: 'خروج', value: 'out' },
  { title: 'تعديل', value: 'adjust' },
];

const sourceTypeOptions = [
  { title: 'الكل', value: undefined },
  { title: 'مبيعات', value: 'sale' },
  { title: 'مشتريات', value: 'purchase' },
  { title: 'تعديل', value: 'adjustment' },
  { title: 'مرتجع', value: 'return' },
];

function reload(): void {
  emit('reload', {
    productId: props.productId,
    movementType: movementType.value,
    sourceType: sourceType.value,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
    limit: 100,
    offset: 0,
  });
}

function resetFilters(): void {
  movementType.value = undefined;
  sourceType.value = undefined;
  dateFrom.value = '';
  dateTo.value = '';
  reload();
}

function movementLabel(value: string): string {
  if (value === 'in') return 'دخول';
  if (value === 'out') return 'خروج';
  if (value === 'adjust') return 'تعديل';
  return value;
}

function movementColor(value: string): string {
  if (value === 'in') return 'success';
  if (value === 'out') return 'error';
  if (value === 'adjust') return 'warning';
  return 'default';
}

function sourceLabel(value?: string): string {
  if (!value) return '—';
  if (value === 'sale') return 'بيع';
  if (value === 'purchase') return 'شراء';
  if (value === 'adjustment') return 'تعديل';
  if (value === 'return') return 'مرتجع';
  return value;
}

function signedPrefix(value: string): string {
  if (value === 'in') return '+';
  if (value === 'out') return '-';
  return '';
}

function signedClass(value: string): string {
  if (value === 'in') return 'text-success';
  if (value === 'out') return 'text-error';
  return '';
}
</script>
