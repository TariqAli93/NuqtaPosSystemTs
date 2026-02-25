<template>
  <div>
    <v-card class="mb-3">
      <v-card-text class="d-flex ga-2">
        <v-btn
          color="primary"
          variant="tonal"
          :loading="inventoryStore.loading"
          @click="runReconciliation(false)"
        >
          فحص فقط
        </v-btn>
        <v-btn color="warning" :loading="inventoryStore.loading" @click="runReconciliation(true)">
          إصلاح الفروقات
        </v-btn>
      </v-card-text>
    </v-card>

    <v-row dense class="mb-2">
      <v-col cols="6" md="3">
        <v-card variant="tonal">
          <v-card-text class="text-center">
            <div class="text-caption">منتجات مفحوصة</div>
            <div class="text-h6">{{ inventoryStore.reconciliation?.totalProducts || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="error">
          <v-card-text class="text-center">
            <div class="text-caption">منتجات بها فرق</div>
            <div class="text-h6">
              {{ inventoryStore.reconciliation?.driftItems.length || 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center">
            <div class="text-caption">إجمالي الفروقات</div>
            <div class="text-h6">{{ inventoryStore.reconciliation?.totalDrift || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="info">
          <v-card-text class="text-center">
            <div class="text-caption">تم إصلاحها</div>
            <div class="text-h6">{{ inventoryStore.reconciliation?.repairedCount || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-data-table
      :headers="reconciliationHeaders"
      :items="inventoryStore.reconciliation?.driftItems || []"
      :loading="inventoryStore.loading"
      density="compact"
      :items-per-page="25"
    >
      <template #item.drift="{ item }">
        <v-chip size="x-small" :color="item.drift === 0 ? 'success' : 'error'" variant="tonal">
          {{ item.drift }}
        </v-chip>
      </template>
      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد فروقات حالياً</div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useInventoryStore } from '@/stores/inventoryStore';

const inventoryStore = useInventoryStore();

const reconciliationHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'المخزن', key: 'cachedStock', align: 'center' as const, width: 80 },
  { title: 'الدفتر', key: 'ledgerStock', align: 'center' as const, width: 80 },
  { title: 'الفرق', key: 'drift', align: 'center' as const, width: 80 },
];

async function runReconciliation(repair: boolean): Promise<void> {
  await inventoryStore.reconcileStock(repair);
}

onMounted(async () => {
  await inventoryStore.reconcileStock(false);
});
</script>
