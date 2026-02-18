<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">قائمة الدخل</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn variant="text" prepend-icon="mdi-arrow-right" @click="router.back()">رجوع</v-btn>
      </v-col>
    </v-row>

    <v-skeleton-loader v-if="accountingStore.loading" type="card" />

    <template v-else-if="report">
      <v-card class="mb-4">
        <v-card-title class="text-subtitle-1 font-weight-bold text-success">الإيرادات</v-card-title>
        <v-data-table
          :headers="lineHeaders"
          :items="report.revenue"
          density="compact"
          hide-default-footer
          :items-per-page="-1"
        >
          <template #item.amount="{ item }"
            ><MoneyDisplay :amount="item.amount" size="sm"
          /></template>
        </v-data-table>
        <v-card-text class="text-end font-weight-bold">
          إجمالي الإيرادات: <MoneyDisplay :amount="report.totalRevenue" size="md" />
        </v-card-text>
      </v-card>

      <v-card class="mb-4">
        <v-card-title class="text-subtitle-1 font-weight-bold text-error">المصاريف</v-card-title>
        <v-data-table
          :headers="lineHeaders"
          :items="report.expenses"
          density="compact"
          hide-default-footer
          :items-per-page="-1"
        >
          <template #item.amount="{ item }"
            ><MoneyDisplay :amount="item.amount" size="sm"
          /></template>
        </v-data-table>
        <v-card-text class="text-end font-weight-bold">
          إجمالي المصاريف: <MoneyDisplay :amount="report.totalExpenses" size="md" />
        </v-card-text>
      </v-card>

      <v-card :color="report.netIncome >= 0 ? 'success' : 'error'" variant="tonal">
        <v-card-text class="text-center">
          <div class="text-subtitle-1">صافي الدخل</div>
          <div class="text-h4 font-weight-bold" style="direction: ltr; unicode-bidi: embed">
            {{ report.netIncome.toLocaleString('en-US') }} د.ع
          </div>
        </v-card-text>
      </v-card>
    </template>

    <v-alert v-else type="info" variant="tonal">
      لا توجد بيانات كافية لإعداد قائمة الدخل بعد.
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '../../stores/accountingStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const router = useRouter();
const accountingStore = useAccountingStore();
const report = computed(() => accountingStore.profitLoss);

const lineHeaders = [
  { title: 'الحساب', key: 'name' },
  { title: 'المبلغ', key: 'amount', align: 'end' as const, width: '160px' },
];

onMounted(() => accountingStore.fetchProfitLoss());
</script>
