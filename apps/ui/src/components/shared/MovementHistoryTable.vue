<template>
  <v-card flat>
    <v-card-title v-if="title" class="text-subtitle-1 font-weight-bold">
      {{ title }}
    </v-card-title>
    <v-data-table
      :headers="headers"
      :items="movements"
      :loading="loading"
      density="compact"
      :items-per-page="itemsPerPage"
      class="movement-table"
    >
      <template #item.createdAt="{ item }">
        {{ formatDate(item.createdAt) }}
      </template>

      <template #item.movementType="{ item }">
        <v-chip :color="moveColor(item.movementType)" size="small" variant="tonal">
          {{ moveLabel(item.movementType) }}
        </v-chip>
      </template>

      <template #item.reason="{ item }">
        {{ reasonLabel(item.reason) }}
      </template>

      <template #item.quantityBase="{ item }">
        <span
          :class="
            item.movementType === 'in'
              ? 'text-success'
              : item.movementType === 'out'
                ? 'text-error'
                : ''
          "
        >
          {{ item.movementType === 'in' ? '+' : item.movementType === 'out' ? '-' : ''
          }}{{ item.quantityBase }}
        </span>
      </template>

      <template #item.stockBefore="{ item }">
        {{ item.stockBefore }}
      </template>

      <template #item.stockAfter="{ item }">
        <strong>{{ item.stockAfter }}</strong>
      </template>

      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد حركات مخزون</div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface MovementRow {
  id?: number;
  productId: number;
  movementType: string;
  reason: string;
  quantityBase: number;
  unitName: string;
  stockBefore: number;
  stockAfter: number;
  sourceType?: string;
  sourceId?: number;
  notes?: string | null;
  createdAt?: string;
}

withDefaults(
  defineProps<{
    movements: MovementRow[];
    title?: string;
    loading?: boolean;
    itemsPerPage?: number;
  }>(),
  {
    title: '',
    loading: false,
    itemsPerPage: 15,
  }
);

const MOVE_LABELS: Record<string, string> = {
  in: 'وارد',
  out: 'صادر',
  adjust: 'تعديل',
};

const MOVE_COLORS: Record<string, string> = {
  in: 'success',
  out: 'error',
  adjust: 'warning',
};

const REASON_LABELS: Record<string, string> = {
  sale: 'بيع',
  purchase: 'شراء',
  return: 'مرتجع',
  damage: 'تالف',
  manual: 'يدوي',
  opening: 'افتتاحي',
};

const headers = computed(() => [
  { title: 'التاريخ', key: 'createdAt', width: '140px' },
  { title: 'النوع', key: 'movementType', width: '100px' },
  { title: 'السبب', key: 'reason', width: '100px' },
  { title: 'الكمية', key: 'quantityBase', align: 'center' as const, width: '100px' },
  { title: 'الوحدة', key: 'unitName', width: '80px' },
  { title: 'قبل', key: 'stockBefore', align: 'center' as const, width: '80px' },
  { title: 'بعد', key: 'stockAfter', align: 'center' as const, width: '80px' },
  { title: 'ملاحظات', key: 'notes', sortable: false },
]);

function moveLabel(type: string): string {
  return MOVE_LABELS[type] ?? type;
}

function moveColor(type: string): string {
  return MOVE_COLORS[type] ?? 'grey';
}

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
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
.movement-table :deep(th) {
  font-weight: 600 !important;
}
</style>
