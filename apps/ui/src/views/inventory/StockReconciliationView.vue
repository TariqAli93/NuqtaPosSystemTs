<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">مراجعة تطابق المخزون</h1>
      </v-col>
      <v-col cols="auto" class="d-flex ga-2">
        <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="inventoryStore.loading" @click="runReconciliation(false)">
          فحص فقط
        </v-btn>
        <v-btn color="warning" prepend-icon="mdi-wrench" :loading="inventoryStore.loading" @click="runReconciliation(true)">
          إصلاح الفروقات
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mb-4" dense>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center">
            <div class="text-caption">عدد المنتجات</div>
            <div class="text-h6">{{ reconciliation?.totalProducts ?? 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" :color="(reconciliation?.driftItems.length ?? 0) > 0 ? 'error' : 'success'">
          <v-card-text class="text-center">
            <div class="text-caption">منتجات بها فرق</div>
            <div class="text-h6">{{ reconciliation?.driftItems.length ?? 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center">
            <div class="text-caption">إجمالي الفروقات</div>
            <div class="text-h6">{{ reconciliation?.totalDrift ?? 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="info">
          <v-card-text class="text-center">
            <div class="text-caption">تم إصلاحه</div>
            <div class="text-h6">{{ reconciliation?.repairedCount ?? 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="reconciliation?.driftItems ?? []"
        :loading="inventoryStore.loading"
        density="compact"
        :items-per-page="20"
      >
        <template #item.drift="{ item }">
          <v-chip :color="item.drift === 0 ? 'success' : 'error'" size="small" variant="tonal">
            {{ item.drift > 0 ? '+' : '' }}{{ item.drift }}
          </v-chip>
        </template>
        <template #no-data>
          <div class="text-center py-8 text-medium-emphasis">
            لا توجد فروقات حالياً. شغّل الفحص للتأكد من تطابق المخزون.
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore';

const inventoryStore = useInventoryStore();
const reconciliation = computed(() => inventoryStore.reconciliation);

const headers = [
  { title: 'المنتج', key: 'productName' },
  { title: 'الرصيد المخزن', key: 'cachedStock', align: 'center' as const },
  { title: 'رصيد الدفتر', key: 'ledgerStock', align: 'center' as const },
  { title: 'الفرق', key: 'drift', align: 'center' as const },
];

async function runReconciliation(repair: boolean) {
  await inventoryStore.reconcileStock(repair);
}

onMounted(() => {
  runReconciliation(false);
});
</script>
