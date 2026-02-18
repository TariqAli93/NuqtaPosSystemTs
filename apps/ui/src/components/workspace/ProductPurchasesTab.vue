<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :loading="loading"
    density="compact"
    :items-per-page="20"
  >
    <template #item.createdAt="{ item }">
      {{ formatDate(item.createdAt) }}
    </template>
    <template #item.unitCost="{ item }">
      {{ formatMoney(item.unitCost) }}
    </template>
    <template #item.lineSubtotal="{ item }">
      {{ formatMoney(item.lineSubtotal) }}
    </template>
    <template #item.status="{ item }">
      <v-chip size="x-small" variant="tonal" :color="statusColor(item.status || '')">
        {{ statusLabel(item.status || '') }}
      </v-chip>
    </template>
    <template #no-data>
      <div class="text-center py-8 text-medium-emphasis">لا يوجد سجل مشتريات لهذا المنتج</div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import type { ProductPurchaseHistoryItem } from '@/types/workspace';

defineProps<{
  items: ProductPurchaseHistoryItem[];
  total: number;
  loading: boolean;
}>();

const headers = [
  { title: 'الفاتورة', key: 'invoiceNumber', width: 120 },
  { title: 'المورد', key: 'supplierName' },
  { title: 'التاريخ', key: 'createdAt', width: 130 },
  { title: 'الكمية', key: 'quantity', align: 'center' as const, width: 70 },
  { title: 'الوحدة', key: 'unitName', align: 'center' as const, width: 80 },
  { title: 'التكلفة', key: 'unitCost', align: 'end' as const, width: 110 },
  { title: 'الإجمالي', key: 'lineSubtotal', align: 'end' as const, width: 120 },
  { title: 'الحالة', key: 'status', width: 90 },
  { title: 'الدفعة', key: 'batchNumber', width: 110 },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
}

function formatMoney(value: number): string {
  return `${(value || 0).toLocaleString('en-US')} د.ع`;
}

function statusLabel(value: string): string {
  if (value === 'completed') return 'مكتمل';
  if (value === 'pending') return 'معلق';
  if (value === 'cancelled') return 'ملغي';
  return value || '—';
}

function statusColor(value: string): string {
  if (value === 'completed') return 'success';
  if (value === 'pending') return 'warning';
  if (value === 'cancelled') return 'error';
  return 'default';
}
</script>

