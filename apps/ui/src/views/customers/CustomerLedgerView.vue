<template>
  <v-container>
    <v-app-bar class="mb-6" border="bottom">
      <v-app-bar-title>
        <div class="win-title mb-0">دفتر العملاء (حسابات القبض)</div>
        <div class="text-sm">كشف حسابات العملاء والمطابقة المالية</div>
      </v-app-bar-title>

      <template #append>
        <v-btn
          variant="tonal"
          color="warning"
          :loading="ledgerStore.loading.reconciliation"
          prepend-icon="mdi-scale-balance"
          @click="ledgerStore.reconcileCustomerDebt(false)"
        >
          مطابقة AR
        </v-btn>
      </template>
    </v-app-bar>

    <v-row dense>
      <!-- Customer selector -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">العملاء</v-card-title>
          <v-card-text class="pb-0">
            <v-text-field
              v-model="customerSearch"
              prepend-inner-icon="mdi-magnify"
              label="بحث عن عميل..."
              density="compact"
              hide-details
              variant="outlined"
              clearable
              class="mb-2"
              @update:model-value="searchCustomers"
            />
          </v-card-text>
          <v-data-table
            :headers="customerHeaders"
            :items="ledgerStore.customers"
            :loading="ledgerStore.loading.customers"
            density="compact"
            :items-per-page="15"
            @click:row="onSelectCustomer"
          >
            <template #item.name="{ item }">
              <span
                :class="{
                  'font-weight-bold text-primary': ledgerStore.selectedCustomerId === item.id,
                }"
              >
                {{ item.name }}
              </span>
            </template>
            <template #item.totalDebt="{ item }">
              {{ formatMoney(item.totalDebt || 0) }}
            </template>
            <template #no-data>
              <div class="text-center py-8 text-medium-emphasis">لا يوجد عملاء</div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>

      <!-- Ledger detail -->
      <v-col cols="12" md="8">
        <v-card class="mb-2">
          <v-card-text class="d-flex align-center ga-3 flex-wrap">
            <v-text-field
              v-model="ledgerDateFrom"
              type="date"
              label="من تاريخ"
              density="compact"
              hide-details
              variant="outlined"
              style="max-width: 180px"
              clearable
            />
            <v-text-field
              v-model="ledgerDateTo"
              type="date"
              label="إلى تاريخ"
              density="compact"
              hide-details
              variant="outlined"
              style="max-width: 180px"
              clearable
            />
            <v-btn
              variant="text"
              :disabled="!ledgerStore.selectedCustomerId"
              :loading="ledgerStore.loading.customerLedger"
              @click="reloadLedger"
            >
              تحديث دفتر العميل
            </v-btn>
          </v-card-text>
        </v-card>

        <v-alert
          v-if="!ledgerStore.selectedCustomerId"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          اختر عميلاً من القائمة لعرض كشف حسابه
        </v-alert>

        <LedgerTable
          :entries="customerLedgerRows"
          :loading="ledgerStore.loading.customerLedger"
          entity-type="customer"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { formatMoney } from '@/utils/formatters';
import { useLedgerStore } from '@/stores/ledgerStore';
import LedgerTable from '@/components/shared/LedgerTable.vue';
import type { LedgerEntry } from '@/components/shared/LedgerTable.vue';

const ledgerStore = useLedgerStore();

const customerSearch = ref('');
const ledgerDateFrom = ref<string | null>(null);
const ledgerDateTo = ref<string | null>(null);

const customerHeaders = [
  { title: 'العميل', key: 'name' },
  { title: 'الهاتف', key: 'phone', width: 120 },
  { title: 'الرصيد', key: 'totalDebt', align: 'end' as const, width: 120 },
];

const customerLedgerRows = computed(
  () => ledgerStore.customerLedgerEntries as unknown as LedgerEntry[]
);

async function onSelectCustomer(_event: Event, payload: { item: { id: number } }): Promise<void> {
  if (!payload.item.id) return;
  await ledgerStore.fetchCustomerLedger(payload.item.id, {
    dateFrom: ledgerDateFrom.value || undefined,
    dateTo: ledgerDateTo.value || undefined,
    limit: 100,
    offset: 0,
  });
}

async function reloadLedger(): Promise<void> {
  if (!ledgerStore.selectedCustomerId) return;
  await ledgerStore.fetchCustomerLedger(ledgerStore.selectedCustomerId, {
    dateFrom: ledgerDateFrom.value || undefined,
    dateTo: ledgerDateTo.value || undefined,
    limit: 100,
    offset: 0,
  });
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function searchCustomers(): void {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    void ledgerStore.fetchCustomers({
      search: customerSearch.value || undefined,
      limit: 200,
      offset: 0,
    });
  }, 300);
}

onMounted(async () => {
  await ledgerStore.fetchCustomers({ limit: 200, offset: 0 });
});
</script>
