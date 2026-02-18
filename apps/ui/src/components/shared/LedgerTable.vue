<template>
  <v-card flat>
    <v-card-title v-if="title" class="text-subtitle-1 font-weight-bold">
      {{ title }}
    </v-card-title>
    <v-data-table
      :headers="headers"
      :items="entries"
      :loading="loading"
      density="compact"
      :items-per-page="itemsPerPage"
      class="ledger-table"
    >
      <template #item.createdAt="{ item }">
        {{ formatDate(item.createdAt) }}
      </template>

      <template #item.transactionType="{ item }">
        <v-chip :color="typeColor(item.transactionType)" size="small" variant="tonal">
          {{ typeLabel(item.transactionType) }}
        </v-chip>
      </template>

      <template #item.amount="{ item }">
        <span
          :class="item.amount > 0 ? 'text-error' : 'text-success'"
          style="font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: embed"
        >
          {{ item.amount > 0 ? '+' : '' }}{{ item.amount.toLocaleString('en-US') }}
        </span>
      </template>

      <template #item.balanceAfter="{ item }">
        <span style="font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: embed">
          {{ item.balanceAfter.toLocaleString('en-US') }}
        </span>
      </template>

      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد حركات</div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface LedgerEntry {
  id?: number;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  notes?: string | null;
  createdAt?: string;
  saleId?: number;
  purchaseId?: number;
  paymentId?: number;
}

const props = withDefaults(
  defineProps<{
    entries: LedgerEntry[];
    title?: string;
    loading?: boolean;
    entityType?: 'customer' | 'supplier';
    itemsPerPage?: number;
  }>(),
  {
    title: '',
    loading: false,
    entityType: 'customer',
    itemsPerPage: 15,
  }
);

const TYPE_LABELS: Record<string, string> = {
  invoice: 'فاتورة',
  payment: 'دفعة',
  return: 'مرتجع',
  adjustment: 'تعديل',
  opening: 'رصيد افتتاحي',
};

const TYPE_COLORS: Record<string, string> = {
  invoice: 'error',
  payment: 'success',
  return: 'warning',
  adjustment: 'info',
  opening: 'grey',
};

const headers = computed(() => [
  { title: 'التاريخ', key: 'createdAt', width: '140px' },
  { title: 'النوع', key: 'transactionType', width: '120px' },
  { title: 'المبلغ', key: 'amount', align: 'end' as const, width: '140px' },
  { title: 'الرصيد', key: 'balanceAfter', align: 'end' as const, width: '140px' },
  { title: 'ملاحظات', key: 'notes', sortable: false },
]);

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? 'grey';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
}
</script>

<style scoped>
.ledger-table :deep(th) {
  font-weight: 600 !important;
}
</style>
