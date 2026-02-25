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
      <v-btn color="primary" variant="tonal" :loading="accountingStore.loading" @click="refresh">
        عرض
      </v-btn>
    </v-card-text>

    <v-data-table
      :headers="trialHeaders"
      :items="accountingStore.trialBalance"
      :loading="accountingStore.loading"
      density="compact"
      :items-per-page="20"
    >
      <template #item.debitTotal="{ item }">{{ formatMoney(item.debitTotal || 0) }}</template>
      <template #item.creditTotal="{ item }">{{ formatMoney(item.creditTotal || 0) }}</template>
      <template #item.balance="{ item }">{{ formatMoney(item.balance || 0) }}</template>
      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد بيانات ميزان مراجعة بعد.</div>
      </template>
      <template #bottom>
        <v-divider />
        <v-row dense class="px-4 py-3">
          <v-col class="text-end font-weight-bold">
            إجمالي المدين: {{ formatMoney(totalDebit) }}
          </v-col>
          <v-col class="text-end font-weight-bold">
            إجمالي الدائن: {{ formatMoney(totalCredit) }}
          </v-col>
          <v-col class="text-end font-weight-bold">
            <v-chip :color="isBalanced ? 'success' : 'error'" size="small" variant="tonal">
              {{ isBalanced ? 'متوازن ✓' : 'غير متوازن ✗' }}
            </v-chip>
          </v-col>
        </v-row>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { formatMoney } from '@/utils/formatters';
import { useAccountingStore } from '@/stores/accountingStore';

const accountingStore = useAccountingStore();

const dateFrom = ref<string | null>(null);
const dateTo = ref<string | null>(null);

const trialHeaders = [
  { title: 'الكود', key: 'code', width: 90 },
  { title: 'الحساب', key: 'name' },
  { title: 'مدين', key: 'debitTotal', align: 'end' as const, width: 120 },
  { title: 'دائن', key: 'creditTotal', align: 'end' as const, width: 120 },
  { title: 'الرصيد', key: 'balance', align: 'end' as const, width: 120 },
];

const totalDebit = computed(() =>
  accountingStore.trialBalance.reduce((sum, row) => sum + (row.debitTotal || 0), 0)
);

const totalCredit = computed(() =>
  accountingStore.trialBalance.reduce((sum, row) => sum + (row.creditTotal || 0), 0)
);

const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.01);

async function refresh(): Promise<void> {
  await accountingStore.fetchTrialBalance({
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  });
}

onMounted(async () => {
  await accountingStore.fetchTrialBalance();
});
</script>
