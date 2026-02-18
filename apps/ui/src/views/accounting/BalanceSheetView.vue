<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">الميزانية العمومية</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn variant="text" prepend-icon="mdi-arrow-right" @click="router.back()">رجوع</v-btn>
      </v-col>
    </v-row>

    <v-skeleton-loader v-if="accountingStore.loading" type="card" />

    <template v-else-if="report">
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="mb-4">
            <v-card-title class="text-subtitle-1 font-weight-bold text-primary"
              >الأصول</v-card-title
            >
            <v-data-table
              :headers="lineHeaders"
              :items="report.assets"
              density="compact"
              hide-default-footer
              :items-per-page="-1"
            >
              <template #item.balance="{ item }"
                ><MoneyDisplay :amount="item.balance" size="sm"
              /></template>
            </v-data-table>
            <v-card-text class="text-end font-weight-bold">
              إجمالي الأصول: <MoneyDisplay :amount="report.totalAssets" size="md" />
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="mb-4">
            <v-card-title class="text-subtitle-1 font-weight-bold text-error"
              >الالتزامات</v-card-title
            >
            <v-data-table
              :headers="lineHeaders"
              :items="report.liabilities"
              density="compact"
              hide-default-footer
              :items-per-page="-1"
            >
              <template #item.balance="{ item }"
                ><MoneyDisplay :amount="item.balance" size="sm"
              /></template>
            </v-data-table>
            <v-card-text class="text-end font-weight-bold">
              إجمالي الالتزامات: <MoneyDisplay :amount="report.totalLiabilities" size="md" />
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-title class="text-subtitle-1 font-weight-bold text-info"
              >حقوق الملكية</v-card-title
            >
            <v-data-table
              :headers="lineHeaders"
              :items="report.equity"
              density="compact"
              hide-default-footer
              :items-per-page="-1"
            >
              <template #item.balance="{ item }"
                ><MoneyDisplay :amount="item.balance" size="sm"
              /></template>
            </v-data-table>
            <v-card-text class="text-end font-weight-bold">
              إجمالي حقوق الملكية: <MoneyDisplay :amount="report.totalEquity" size="md" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-alert v-else type="info" variant="tonal">
      لا توجد بيانات كافية لإعداد الميزانية العمومية بعد.
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
const report = computed(() => accountingStore.balanceSheet);

const lineHeaders = [
  { title: 'الحساب', key: 'name' },
  { title: 'الرصيد', key: 'balance', align: 'end' as const, width: '160px' },
];

onMounted(() => accountingStore.fetchBalanceSheet());
</script>
