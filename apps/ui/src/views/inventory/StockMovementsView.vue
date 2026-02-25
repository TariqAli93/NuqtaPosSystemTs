<template>
  <v-card flat>
    <v-card-text class="d-flex align-center ga-3 flex-wrap">
      <v-text-field
        v-model="dateFrom"
        type="date"
        label="من تاريخ"
        density="compact"
        hide-details
        variant="outlined"
        style="max-width: 200px"
        clearable
      />
      <v-text-field
        v-model="dateTo"
        type="date"
        label="إلى تاريخ"
        density="compact"
        hide-details
        variant="outlined"
        style="max-width: 200px"
        clearable
      />
      <v-select
        v-model="movementTypeFilter"
        :items="movementTypes"
        label="نوع الحركة"
        density="compact"
        hide-details
        variant="outlined"
        style="max-width: 180px"
        clearable
      />
      <v-btn color="primary" variant="tonal" :loading="inventoryStore.loading" @click="refresh">
        تصفية
      </v-btn>
    </v-card-text>

    <v-data-table
      :headers="movementHeaders"
      :items="inventoryStore.movements"
      :loading="inventoryStore.loading"
      density="compact"
      :items-per-page="25"
    >
      <template #item.createdAt="{ item }">
        {{ formatDate(item.createdAt) }}
      </template>
      <template #item.movementType="{ item }">
        <v-chip size="x-small" variant="tonal" :color="movementColor(item.movementType)">
          {{ movementLabel(item.movementType) }}
        </v-chip>
      </template>
      <template #item.reason="{ item }">
        <v-chip size="x-small" variant="tonal" :color="reasonSignedColor(item.reason)">
          {{ reasonLabel(item.reason) || '—' }}
        </v-chip>
      </template>
      <template #item.sourceType="{ item }">
        <v-chip size="x-small" variant="tonal" :color="reasonSignedColor(item.sourceType || '')">
          {{ reasonLabel(item.sourceType || '') }}
        </v-chip>
      </template>
      <template #item.quantityBase="{ item }">
        <span :class="movementSignedClass(item.movementType)">
          {{ movementSignedPrefix(item.movementType) }}{{ item.quantityBase }}
        </span>
      </template>
      <template #item.productName="{ item }">{{ getProductName(item.productId) }}</template>
      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد حركات مخزون بعد.</div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { formatDate } from '@/utils/formatters';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useProductsStore } from '@/stores/productsStore';
import { useInventoryHelpers } from '@/composables/useInventoryHelpers';

const inventoryStore = useInventoryStore();
const productsStore = useProductsStore();
const {
  movementLabel,
  movementColor,
  movementSignedPrefix,
  movementSignedClass,
  reasonLabel,
  reasonSignedColor,
} = useInventoryHelpers();

const dateFrom = ref<string | null>(null);
const dateTo = ref<string | null>(null);
const movementTypeFilter = ref<string | null>(null);

const movementTypes = [
  { title: 'الكل', value: '' },
  { title: 'دخول', value: 'in' },
  { title: 'خروج', value: 'out' },
  { title: 'تعديل', value: 'adjust' },
];

const movementHeaders = [
  { title: 'المنتج', key: 'productName', width: 80 },
  { title: 'التاريخ', key: 'createdAt', width: 130 },
  { title: 'النوع', key: 'movementType', width: 80 },
  { title: 'السبب', key: 'reason', width: 100 },
  { title: 'المصدر', key: 'sourceType', width: 100 },
  { title: 'الكمية', key: 'quantityBase', align: 'center' as const, width: 80 },
  { title: 'قبل', key: 'stockBefore', align: 'center' as const, width: 70 },
  { title: 'بعد', key: 'stockAfter', align: 'center' as const, width: 70 },
];

function getProductName(productId: number): string {
  const product = productsStore.items.find((p) => p.id === productId);
  return product ? product.name : `منتج #${productId}`;
}

async function refresh(): Promise<void> {
  await inventoryStore.fetchMovements({
    movementType: movementTypeFilter.value || undefined,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
    limit: 50,
    offset: 0,
  });
}

onMounted(async () => {
  await Promise.all([
    inventoryStore.fetchMovements({ limit: 50, offset: 0 }),
    productsStore.items.length === 0
      ? productsStore.fetchProducts({ limit: 100, page: 1 })
      : Promise.resolve(),
  ]);
});
</script>
