<template>
  <div>
    <v-row dense class="mb-3">
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center">
            <div class="text-caption">قيمة المخزون</div>
            <div class="text-h6">
              {{ (inventoryStore.dashboard?.totalValuation || 0).toLocaleString('en-US') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center">
            <div class="text-caption">منتجات منخفضة</div>
            <div class="text-h6">{{ inventoryStore.dashboard?.lowStockCount || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="error">
          <v-card-text class="text-center">
            <div class="text-caption">تنبيهات صلاحية</div>
            <div class="text-h6">{{ inventoryStore.dashboard?.expiryAlertCount || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="text-center">
            <div class="text-caption">حركات مسجلة</div>
            <div class="text-h6">{{ inventoryStore.movementsTotal }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-bold">آخر حركات المخزون</v-card-title>
      <v-data-table
        :headers="movementHeaders"
        :items="inventoryStore.movements"
        :loading="inventoryStore.loading"
        density="compact"
        :items-per-page="10"
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
          <div class="text-center py-8 text-medium-emphasis">
            لا توجد حركات مخزون بعد. ستظهر الحركات بعد البيع/الشراء/التعديل.
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
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

onMounted(async () => {
  await Promise.all([
    inventoryStore.fetchDashboard(),
    inventoryStore.fetchMovements({ limit: 10, offset: 0 }),
    productsStore.items.length === 0
      ? productsStore.fetchProducts({ limit: 100, page: 1 })
      : Promise.resolve(),
  ]);
});
</script>
