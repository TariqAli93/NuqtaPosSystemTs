<template>
  <div>
    <v-row dense class="mb-3">
      <v-col cols="12" md="6">
        <v-card variant="tonal" color="warning">
          <v-card-title class="text-subtitle-1 font-weight-bold"
            >منتجات منخفضة المخزون</v-card-title
          >
          <v-card-text>
            <div class="text-h5 text-center mb-2">
              {{ inventoryStore.dashboard?.lowStockCount || 0 }}
            </div>
            <div class="text-caption text-center text-medium-emphasis">
              منتجات وصلت لحد إعادة الطلب
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card variant="tonal" color="error">
          <v-card-title class="text-subtitle-1 font-weight-bold">تنبيهات الصلاحية</v-card-title>
          <v-card-text>
            <div class="text-h5 text-center mb-2">
              {{ inventoryStore.expiryAlerts.length }}
            </div>
            <div class="text-caption text-center text-medium-emphasis">
              منتجات قاربت أو تجاوزت تاريخ الصلاحية
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Expiry Alerts Table -->
    <v-card class="mb-4">
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
        <v-icon start color="error" size="20">mdi-clock-alert-outline</v-icon>
        تنبيهات الصلاحية
        <v-spacer />
        <v-text-field
          v-model="daysAhead"
          type="number"
          label="أيام للأمام"
          density="compact"
          hide-details
          variant="outlined"
          style="max-width: 140px"
          min="1"
          @change="refreshAlerts"
        />
      </v-card-title>
      <v-data-table
        :headers="expiryHeaders"
        :items="inventoryStore.expiryAlerts"
        :loading="inventoryStore.loading"
        density="compact"
        :items-per-page="15"
      >
        <template #item.expiryDate="{ item }">
          <v-chip
            size="x-small"
            variant="tonal"
            :color="isExpired(item.expiryDate) ? 'error' : 'warning'"
          >
            {{ formatDate(item.expiryDate) }}
          </v-chip>
        </template>
        <template #item.daysRemaining="{ item }">
          <span :class="item.daysUntilExpiry <= 0 ? 'text-error font-weight-bold' : 'text-warning'">
            {{ item.daysUntilExpiry <= 0 ? 'منتهية' : `${item.daysUntilExpiry} يوم` }}
          </span>
        </template>
        <template #no-data>
          <div class="text-center py-8 text-medium-emphasis">
            <v-icon size="48" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
            <div>لا توجد تنبيهات صلاحية حالياً</div>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { formatDate } from '@/utils/formatters';
import { useInventoryStore } from '@/stores/inventoryStore';

const inventoryStore = useInventoryStore();

const daysAhead = ref(30);

const expiryHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'الدفعة', key: 'batchNumber', width: 120 },
  { title: 'تاريخ الصلاحية', key: 'expiryDate', width: 140 },
  { title: 'المتبقي', key: 'daysUntilExpiry', align: 'center' as const, width: 100 },
  { title: 'الكمية', key: 'quantityOnHand', align: 'center' as const, width: 80 },
];

function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) <= new Date();
}

async function refreshAlerts(): Promise<void> {
  await inventoryStore.fetchExpiryAlerts(daysAhead.value);
}

onMounted(async () => {
  await Promise.all([
    inventoryStore.fetchDashboard(),
    inventoryStore.fetchExpiryAlerts(daysAhead.value),
  ]);
});
</script>
