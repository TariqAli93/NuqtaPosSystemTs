<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="ds-page-header d-flex align-center justify-space-between mb-6">
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('sales.title') }}</div>
          <div class="text-sm">{{ t('sales.subtitle') }}</div>
        </v-app-bar-title>

        <template #append>
          <v-btn color="primary" :to="'/sales/new'" prepend-icon="mdi-plus">
            {{ t('sales.new') }}
          </v-btn>
        </template>
      </v-app-bar>

      <v-card class="pa-4 mb-4">
        <v-row dense>
          <v-col cols="12" sm="8">
            <v-text-field
              v-model="searchQuery"
              :placeholder="t('sales.search')"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-magnify"
              clearable
              autofocus
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              :label="t('sales.filterByStatus')"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card class="win-card" flat>
        <v-card-text class="pa-0">
          <v-alert v-if="localizedError" type="error" variant="tonal" class="ma-4">
            {{ localizedError }}
          </v-alert>
          <v-data-table
            :headers="tableHeaders"
            :items="filteredSales"
            density="comfortable"
            class="ds-table-enhanced ds-table-striped"
            :no-data-text="''"
            :hide-default-footer="true"
          >
            <template #item.invoiceNumber="{ item }">
              <span class="font-weight-medium">{{ item.invoiceNumber }}</span>
            </template>
            <template #item.customerId="{ item }">
              <span class="text-medium-emphasis">{{ item.customerId ?? t('common.none') }}</span>
            </template>
            <template #item.total="{ item }">
              <span class="font-weight-bold">{{ formatAmount(item.total) }}</span>
            </template>
            <template #item.status="{ item }">
              <v-chip size="small" variant="tonal" :color="statusBadgeClass(item.status)">
                {{ statusLabel(item.status) }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                size="small"
                variant="text"
                class="win-ghost-btn"
                :to="`/sales/${item.id}`"
                prepend-icon="mdi-eye"
              >
                {{ t('common.details') }}
              </v-btn>
            </template>
          </v-data-table>

          <EmptyState
            v-if="filteredSales.length === 0 && !store.loading"
            icon="mdi-receipt-text-outline"
            :title="t('sales.noSales')"
            :description="t('sales.noSalesHint')"
          />
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useSalesStore } from '../../stores/salesStore';
import EmptyState from '../../components/emptyState.vue';

const store = useSalesStore();
const searchQuery = ref('');
const statusFilter = ref<string | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const statusOptions = computed(() => [
  { title: t('sales.pending'), value: 'pending' },
  { title: t('sales.completed'), value: 'completed' },
  { title: t('sales.cancelled'), value: 'cancelled' },
]);

const filteredSales = computed(() => {
  let result = store.items;
  const query = (searchQuery.value || '').trim().toLowerCase();

  if (query) {
    result = result.filter(
      (sale: any) =>
        sale.invoiceNumber?.toLowerCase().includes(query) ||
        String(sale.customerId ?? '').includes(query)
    );
  }

  if (statusFilter.value) {
    result = result.filter((sale: any) => sale.status === statusFilter.value);
  }

  return result;
});

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.loadFailed') : null
);

const tableHeaders = computed(() => [
  { title: t('sales.invoice'), key: 'invoiceNumber' },
  { title: t('sales.customer'), key: 'customerId' },
  { title: t('sales.total'), key: 'total' },
  { title: t('sales.status'), key: 'status' },
  { title: '', key: 'actions', sortable: false, width: 120 },
]);

function statusLabel(status: string): string {
  const value = t(`enum.saleStatus.${status}`);
  return value === t('errors.undefinedText') ? t('common.none') : value;
}

function statusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'error',
    refunded: 'info',
  };
  return statusMap[status] || 'ds-badge-neutral';
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function fetchWithFilters() {
  void store.fetchSales({
    limit: 25,
    offset: 0,
    search: searchQuery.value || undefined,
    status: statusFilter.value || undefined,
  });
}

watch([searchQuery, statusFilter], () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(fetchWithFilters, 300);
});

onMounted(() => {
  fetchWithFilters();
});
</script>
