<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">ميزان المراجعة</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn variant="text" prepend-icon="mdi-arrow-right" @click="router.back()">رجوع</v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="accountingStore.trialBalance"
        :loading="accountingStore.loading"
        density="compact"
        :items-per-page="-1"
        hide-default-footer
      >
        <template #item.code="{ item }">
          <span dir="ltr">{{ item.code }}</span>
        </template>
        <template #item.debitTotal="{ item }">
          <MoneyDisplay :amount="item.debitTotal" size="sm" />
        </template>
        <template #item.creditTotal="{ item }">
          <MoneyDisplay :amount="item.creditTotal" size="sm" />
        </template>
        <template #item.balance="{ item }">
          <MoneyDisplay :amount="item.balance" size="sm" colored />
        </template>
        <template #no-data>
          <div class="text-center py-8 text-medium-emphasis">
            لا توجد بيانات ميزان مراجعة بعد.
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '../../stores/accountingStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const router = useRouter();
const accountingStore = useAccountingStore();

const headers = [
  { title: 'الرمز', key: 'code', width: '100px' },
  { title: 'الحساب', key: 'name' },
  { title: 'النوع', key: 'accountType', width: '100px' },
  { title: 'مدين', key: 'debitTotal', align: 'end' as const, width: '150px' },
  { title: 'دائن', key: 'creditTotal', align: 'end' as const, width: '150px' },
  { title: 'الرصيد', key: 'balance', align: 'end' as const, width: '150px' },
];

onMounted(() => accountingStore.fetchTrialBalance());
</script>
