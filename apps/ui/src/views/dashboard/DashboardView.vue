<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">لوحة المعلومات</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">نظرة عامة على النظام</p>
      </div>
      <v-btn variant="text" icon size="small" :loading="loading" @click="loadStats">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- KPI Cards -->
    <v-row dense class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center ga-3">
            <v-avatar color="success" variant="tonal" size="48">
              <v-icon>mdi-cash-register</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">مبيعات اليوم</div>
              <div class="text-h6 font-weight-bold">
                <v-skeleton-loader v-if="loading" type="text" width="80" />
                <template v-else>{{ stats?.salesToday?.totalSales ?? 0 }}</template>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" variant="tonal" size="48">
              <v-icon>mdi-currency-usd</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">إيرادات اليوم</div>
              <div class="text-h6 font-weight-bold">
                <v-skeleton-loader v-if="loading" type="text" width="80" />
                <template v-else>{{ formatMoney(stats?.salesToday?.totalRevenue ?? 0) }}</template>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center ga-3">
            <v-avatar color="info" variant="tonal" size="48">
              <v-icon>mdi-calculator</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">متوسط الفاتورة</div>
              <div class="text-h6 font-weight-bold">
                <v-skeleton-loader v-if="loading" type="text" width="80" />
                <template v-else>{{
                  formatMoney(stats?.salesToday?.averageSaleAmount ?? 0)
                }}</template>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="d-flex align-center ga-3">
            <v-avatar
              :color="(stats?.lowStockCount ?? 0) > 0 ? 'error' : 'grey'"
              variant="tonal"
              size="48"
            >
              <v-icon>mdi-alert-circle-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">منتجات منخفضة المخزون</div>
              <div class="text-h6 font-weight-bold">
                <v-skeleton-loader v-if="loading" type="text" width="80" />
                <template v-else>{{ stats?.lowStockCount ?? 0 }}</template>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Top Selling Products -->
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-trending-up</v-icon>
        المنتجات الأكثر مبيعاً اليوم
      </v-card-title>
      <v-data-table
        :headers="topHeaders"
        :items="stats?.topProducts ?? []"
        :loading="loading"
        density="comfortable"
        :items-per-page="5"
        no-data-text="لا توجد مبيعات اليوم بعد"
      >
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { dashboardClient, type DashboardStats } from '../../ipc/dashboardClient';
import { notifyError } from '@/utils/notify';

const stats = ref<DashboardStats | null>(null);
const loading = ref(false);

const topHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'الكمية المباعة', key: 'totalQuantity', align: 'center' as const },
  { title: 'الإيرادات', key: 'totalRevenue', align: 'end' as const },
];

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ar-IQ', { numberingSystem: 'latn' }).format(amount);
}

async function loadStats() {
  loading.value = true;
  const result = await dashboardClient.getStats();
  loading.value = false;
  if (result.ok) {
    stats.value = result.data;
  } else {
    notifyError(result.error.message || 'فشل تحميل لوحة المعلومات');
  }
}

onMounted(async () => {
  await loadStats();
});
</script>
