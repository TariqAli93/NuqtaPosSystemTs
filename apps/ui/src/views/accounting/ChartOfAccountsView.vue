<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">دليل الحسابات</h1>
      </v-col>
      <v-col cols="auto" class="d-flex ga-2">
        <v-btn variant="tonal" prepend-icon="mdi-book-open" :to="{ name: 'JournalEntries' }"
          >القيود اليومية</v-btn
        >
        <v-btn variant="tonal" prepend-icon="mdi-chart-bar" :to="{ name: 'TrialBalance' }"
          >ميزان المراجعة</v-btn
        >
        <v-btn variant="tonal" prepend-icon="mdi-finance" :to="{ name: 'ProfitLoss' }"
          >قائمة الدخل</v-btn
        >
        <v-btn variant="tonal" prepend-icon="mdi-scale-balance" :to="{ name: 'BalanceSheet' }"
          >الميزانية</v-btn
        >
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="accountingStore.accounts"
        :loading="accountingStore.loading"
        density="compact"
        :items-per-page="-1"
        hide-default-footer
      >
        <template #item.code="{ item }">
          <span class="font-weight-medium" dir="ltr">{{ item.code }}</span>
        </template>
        <template #item.accountType="{ item }">
          <v-chip size="small" variant="tonal" :color="typeColor(item.accountType)">
            {{ typeLabel(item.accountType) }}
          </v-chip>
        </template>
        <template #item.balance="{ item }">
          <MoneyDisplay :amount="item.balance ?? 0" size="sm" colored />
        </template>
        <template #item.isSystem="{ item }">
          <v-icon v-if="item.isSystem" size="small" color="grey">mdi-lock</v-icon>
        </template>
        <template #no-data>
          <div class="text-center py-8 text-medium-emphasis">
            لا توجد حسابات بعد. أضف عمليات بيع/شراء أو هيكل حسابات لعرض البيانات.
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAccountingStore } from '../../stores/accountingStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const accountingStore = useAccountingStore();

const headers = [
  { title: '', key: 'isSystem', width: '40px', sortable: false },
  { title: 'الرمز', key: 'code', width: '100px' },
  { title: 'الحساب', key: 'name' },
  { title: 'النوع', key: 'accountType', width: '120px' },
  { title: 'الرصيد', key: 'balance', align: 'end' as const, width: '160px' },
];

const TYPE_LABELS: Record<string, string> = {
  asset: 'أصول',
  liability: 'التزامات',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصاريف',
};

const TYPE_COLORS: Record<string, string> = {
  asset: 'primary',
  liability: 'error',
  equity: 'info',
  revenue: 'success',
  expense: 'warning',
};

function typeLabel(t: string): string {
  return TYPE_LABELS[t] ?? t;
}
function typeColor(t: string): string {
  return TYPE_COLORS[t] ?? 'grey';
}

onMounted(() => accountingStore.fetchAccounts());
</script>
