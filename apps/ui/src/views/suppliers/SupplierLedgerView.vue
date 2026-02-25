<template>
  <v-container>
    <v-app-bar class="mb-6" border="bottom">
      <v-app-bar-title>
        <div class="win-title mb-0">دفتر الموردين (حسابات الدفع)</div>
        <div class="text-sm">كشف حسابات الموردين والمطابقة المالية</div>
      </v-app-bar-title>

      <template #append>
        <v-btn
          variant="tonal"
          color="warning"
          :loading="ledgerStore.loading.reconciliation"
          prepend-icon="mdi-scale-balance"
          @click="ledgerStore.reconcileSupplierBalance(false)"
        >
          مطابقة AP
        </v-btn>
      </template>
    </v-app-bar>

    <v-row dense>
      <!-- Supplier selector -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">الموردون</v-card-title>
          <v-card-text class="pb-0">
            <v-text-field
              v-model="supplierSearch"
              prepend-inner-icon="mdi-magnify"
              label="بحث عن مورد..."
              density="compact"
              hide-details
              variant="outlined"
              clearable
              class="mb-2"
              @update:model-value="searchSuppliers"
            />
          </v-card-text>
          <v-data-table
            :headers="supplierHeaders"
            :items="ledgerStore.suppliers"
            :loading="ledgerStore.loading.suppliers"
            density="compact"
            :items-per-page="15"
            @click:row="onSelectSupplier"
          >
            <template #item.name="{ item }">
              <span
                :class="{
                  'font-weight-bold text-primary': ledgerStore.selectedSupplierId === item.id,
                }"
              >
                {{ item.name }}
              </span>
            </template>
            <template #item.currentBalance="{ item }">
              {{ formatMoney(item.currentBalance || 0) }}
            </template>
            <template #no-data>
              <div class="text-center py-8 text-medium-emphasis">لا يوجد موردون</div>
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
              :disabled="!ledgerStore.selectedSupplierId"
              :loading="ledgerStore.loading.supplierLedger"
              @click="reloadLedger"
            >
              تحديث دفتر المورد
            </v-btn>
          </v-card-text>
        </v-card>

        <v-alert
          v-if="!ledgerStore.selectedSupplierId"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          اختر مورداً من القائمة لعرض كشف حسابه
        </v-alert>

        <LedgerTable
          :entries="supplierLedgerRows"
          :loading="ledgerStore.loading.supplierLedger"
          entity-type="supplier"
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

const supplierSearch = ref('');
const ledgerDateFrom = ref<string | null>(null);
const ledgerDateTo = ref<string | null>(null);

const supplierHeaders = [
  { title: 'المورد', key: 'name' },
  { title: 'الهاتف', key: 'phone', width: 120 },
  { title: 'الرصيد', key: 'currentBalance', align: 'end' as const, width: 120 },
];

const supplierLedgerRows = computed(
  () => ledgerStore.supplierLedgerEntries as unknown as LedgerEntry[]
);

async function onSelectSupplier(_event: Event, payload: { item: { id: number } }): Promise<void> {
  if (!payload.item.id) return;
  await ledgerStore.fetchSupplierLedger(payload.item.id, {
    dateFrom: ledgerDateFrom.value || undefined,
    dateTo: ledgerDateTo.value || undefined,
    limit: 100,
    offset: 0,
  });
}

async function reloadLedger(): Promise<void> {
  if (!ledgerStore.selectedSupplierId) return;
  await ledgerStore.fetchSupplierLedger(ledgerStore.selectedSupplierId, {
    dateFrom: ledgerDateFrom.value || undefined,
    dateTo: ledgerDateTo.value || undefined,
    limit: 100,
    offset: 0,
  });
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function searchSuppliers(): void {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    void ledgerStore.fetchSuppliers({
      search: supplierSearch.value || undefined,
      limit: 200,
      offset: 0,
    });
  }, 300);
}

onMounted(async () => {
  await ledgerStore.fetchSuppliers({ limit: 200, offset: 0 });
});
</script>
