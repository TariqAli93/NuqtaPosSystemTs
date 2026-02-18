<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">إدارة المخزون</h1>
      </v-col>
      <v-col cols="auto" class="d-flex ga-2">
        <v-btn
          variant="tonal"
          prepend-icon="mdi-swap-horizontal"
          :to="{ name: 'InventoryMovements' }"
        >
          عرض الحركات
        </v-btn>

        <v-btn
          variant="tonal"
          color="warning"
          prepend-icon="mdi-compare"
          :to="{ name: 'InventoryReconciliation' }"
        >
          مطابقة المخزون
        </v-btn>

        <v-btn color="primary" prepend-icon="mdi-plus-minus" :to="{ name: 'StockAdjustment' }">
          تعديل مخزون
        </v-btn>
      </v-col>
    </v-row>

    <!-- KPI Cards -->
    <v-row class="mb-6" dense>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center">
            <div class="text-caption">قيمة المخزون</div>
            <div class="text-h6 font-weight-bold" style="direction: ltr; unicode-bidi: embed">
              {{ dashboard ? dashboard.totalValuation.toLocaleString('en-US') : '—' }}
            </div>
            <div class="text-caption">د.ع</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center">
            <div class="text-caption">منتجات منخفضة</div>
            <div class="text-h6 font-weight-bold">{{ dashboard?.lowStockCount ?? '—' }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="error">
          <v-card-text class="text-center">
            <div class="text-caption">تنبيهات الانتهاء</div>
            <div class="text-h6 font-weight-bold">{{ dashboard?.expiryAlertCount ?? '—' }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="text-center">
            <div class="text-caption">أكثر المنتجات حركة</div>
            <div class="text-h6 font-weight-bold">
              {{ dashboard?.topMovingProducts?.length ?? '—' }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Expiry Alerts -->
    <v-card class="mb-4" v-if="inventoryStore.expiryAlerts.length > 0">
      <v-card-title class="text-subtitle-1 font-weight-bold text-error">
        <v-icon color="error" class="me-1">mdi-alert</v-icon>
        تنبيهات انتهاء الصلاحية
      </v-card-title>

      <v-data-table
        :headers="expiryHeaders"
        :items="inventoryStore.expiryAlerts"
        density="compact"
        :items-per-page="10"
      >
        <template #item.daysUntilExpiry="{ item }">
          <v-chip
            :color="item.daysUntilExpiry <= 7 ? 'error' : 'warning'"
            size="small"
            variant="tonal"
          >
            {{ item.daysUntilExpiry }} يوم
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <!-- Top Moving -->
    <v-card v-if="dashboard?.topMovingProducts?.length">
      <v-card-title class="text-subtitle-1 font-weight-bold">أكثر المنتجات حركة</v-card-title>
      <v-data-table
        :headers="topHeaders"
        :items="dashboard.topMovingProducts"
        density="compact"
        :items-per-page="10"
        hide-default-footer
      />
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore';

const inventoryStore = useInventoryStore();
const dashboard = computed(() => inventoryStore.dashboard);

const expiryHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'الدفعة', key: 'batchNumber' },
  { title: 'الكمية', key: 'quantityOnHand', align: 'center' as const },
  { title: 'أيام متبقية', key: 'daysUntilExpiry', align: 'center' as const },
];

const topHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'إجمالي الحركة', key: 'totalMoved', align: 'center' as const },
];

onMounted(() => {
  inventoryStore.fetchDashboard();
  inventoryStore.fetchExpiryAlerts();
});
</script>
