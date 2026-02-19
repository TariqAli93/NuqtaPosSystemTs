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
    <template #item.unitPrice="{ item }">
      {{ formatMoney(item.unitPrice) }}
    </template>
    <template #item.subtotal="{ item }">
      {{ formatMoney(item.subtotal) }}
    </template>
    <template #item.status="{ item }">
      <v-chip size="x-small" variant="tonal" :color="statusColor(item.status || '')">
        {{ statusLabel(item.status || '') }}
      </v-chip>
    </template>
    <template #no-data>
      <div class="text-center py-8 text-medium-emphasis">لا يوجد سجل مبيعات لهذا المنتج</div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import type { ProductSalesHistoryItem } from '@/types/workspace';
import { formatDate, formatMoney } from '@/utils/formatters';

defineProps<{
  items: ProductSalesHistoryItem[];
  total: number;
  loading: boolean;
}>();

const headers = [
  { title: 'الفاتورة', key: 'invoiceNumber', width: 120 },
  { title: 'العميل', key: 'customerName' },
  { title: 'التاريخ', key: 'createdAt', width: 130 },
  { title: 'الكمية', key: 'quantity', align: 'center' as const, width: 70 },
  { title: 'الوحدة', key: 'unitName', align: 'center' as const, width: 80 },
  { title: 'السعر', key: 'unitPrice', align: 'end' as const, width: 110 },
  { title: 'الإجمالي', key: 'subtotal', align: 'end' as const, width: 120 },
  { title: 'الحالة', key: 'status', width: 90 },
];

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
