<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">القيود اليومية</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn variant="text" prepend-icon="mdi-arrow-right" @click="router.back()">رجوع</v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-card-text>
        <v-row dense class="mb-4">
          <v-col cols="12" sm="4">
            <v-select
              v-model="sourceFilter"
              :items="sources"
              label="المصدر"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="onFilter"
            />
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="accountingStore.journalEntries"
          :loading="accountingStore.loading"
          :items-per-page="20"
          density="compact"
          @click:row="
            (_: Event, { item }: { item: any }) =>
              router.push({ name: 'JournalEntryDetail', params: { id: item.id } })
          "
        >
          <template #item.totalAmount="{ item }">
            <MoneyDisplay :amount="item.totalAmount" size="sm" />
          </template>
          <template #item.sourceType="{ item }">
            <v-chip size="x-small" variant="tonal">{{ sourceLabel(item.sourceType) }}</v-chip>
          </template>
          <template #item.entryDate="{ item }">
            {{ formatDate(item.entryDate) }}
          </template>
          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">
              لا توجد قيود محاسبية بعد. ستظهر القيود بعد البيع/الشراء/الدفعات.
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '../../stores/accountingStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const router = useRouter();
const accountingStore = useAccountingStore();
const sourceFilter = ref<string | null>(null);

const sources = [
  { title: 'مبيعات', value: 'sale' },
  { title: 'مشتريات', value: 'purchase' },
  { title: 'دفعة', value: 'payment' },
  { title: 'يدوي', value: 'manual' },
];

const headers = [
  { title: 'الرقم', key: 'entryNumber', width: '120px' },
  { title: 'التاريخ', key: 'entryDate', width: '130px' },
  { title: 'الوصف', key: 'description' },
  { title: 'المصدر', key: 'sourceType', width: '100px' },
  { title: 'المبلغ', key: 'totalAmount', align: 'end' as const, width: '140px' },
];

function sourceLabel(s?: string): string {
  if (!s) return 'غير محدد';
  return { sale: 'بيع', purchase: 'شراء', payment: 'دفعة', manual: 'يدوي' }[s] ?? s;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
}

onMounted(() => accountingStore.fetchJournalEntries());

function onFilter() {
  accountingStore.fetchJournalEntries({ sourceType: sourceFilter.value || undefined });
}
</script>
