<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="ds-page-header d-flex align-center justify-space-between mb-6">
        <template #prepend>
          <v-btn icon="mdi-arrow-right" variant="text" to="/sales" />
        </template>
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('sales.details') }}</div>
          <div class="text-sm">{{ sale?.invoiceNumber ?? '' }}</div>
        </v-app-bar-title>
      </v-app-bar>

      <v-alert v-if="localizedError" type="error" variant="tonal" class="mb-6">
        {{ localizedError }}
      </v-alert>

      <v-skeleton-loader v-if="loading" type="card, table" class="mb-4" />

      <template v-else-if="sale">
        <!-- Summary cards -->
        <v-row class="mb-4" dense>
          <v-col cols="12" sm="4">
            <v-card class="win-card" flat>
              <v-card-text class="d-flex align-center ga-3 pa-4">
                <v-avatar color="primary" variant="tonal" size="40">
                  <v-icon>mdi-receipt-text-outline</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">{{ t('sales.invoice') }}</div>
                  <div class="text-body-1 font-weight-bold">{{ sale.invoiceNumber }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="4">
            <v-card class="win-card" flat>
              <v-card-text class="d-flex align-center ga-3 pa-4">
                <v-avatar :color="statusColor(sale.status)" variant="tonal" size="40">
                  <v-icon>{{ statusIcon(sale.status) }}</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">{{ t('sales.status') }}</div>
                  <v-chip :color="statusColor(sale.status)" size="small" variant="tonal" label>
                    {{ statusLabel(sale.status) }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="4">
            <v-card class="win-card" flat>
              <v-card-text class="d-flex align-center ga-3 pa-4">
                <v-avatar color="success" variant="tonal" size="40">
                  <v-icon>mdi-cash-multiple</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">{{ t('sales.total') }}</div>
                  <div class="text-body-1 font-weight-bold">{{ formatAmount(sale.total) }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Sale info -->
        <v-card class="win-card mb-4" flat>
          <v-card-text class="pa-0">
            <v-list density="comfortable" lines="two">
              <v-list-item
                v-if="sale.paymentType"
                :title="t('sales.paymentType')"
                :subtitle="t(`enum.paymentType.${sale.paymentType}`)"
                prepend-icon="mdi-credit-card-outline"
              />
              <v-divider v-if="sale.paymentType" />
              <v-list-item
                :title="t('sales.paidAmount')"
                :subtitle="formatAmount(sale.paidAmount ?? 0)"
                prepend-icon="mdi-cash-check"
              />
              <v-divider v-if="sale.remainingAmount" />
              <v-list-item
                v-if="sale.remainingAmount"
                :title="t('sales.remaining')"
                prepend-icon="mdi-cash-clock"
              >
                <template #subtitle>
                  <span class="text-error font-weight-medium">
                    {{ formatAmount(sale.remainingAmount) }}
                  </span>
                </template>
              </v-list-item>
              <v-divider v-if="sale.discount" />
              <v-list-item
                v-if="sale.discount"
                :title="t('sales.discount')"
                :subtitle="formatAmount(sale.discount)"
                prepend-icon="mdi-tag-outline"
              />
              <v-divider v-if="sale.tax" />
              <v-list-item
                v-if="sale.tax"
                :title="t('sales.tax')"
                :subtitle="formatAmount(sale.tax)"
                prepend-icon="mdi-percent-outline"
              />
              <v-divider v-if="sale.notes" />
              <v-list-item
                v-if="sale.notes"
                :title="t('common.notes')"
                :subtitle="sale.notes"
                prepend-icon="mdi-note-text-outline"
              />
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Line items -->
        <v-card class="win-card" flat>
          <v-card-title class="pa-4 text-body-1 font-weight-bold">
            {{ t('sales.lineItems') }}
          </v-card-title>
          <v-card-text class="pa-0">
            <v-data-table
              v-if="sale.items?.length"
              :headers="itemHeaders"
              :items="sale.items"
              density="comfortable"
              class="ds-table-enhanced ds-table-striped"
              :hide-default-footer="true"
            >
              <template #item.productName="{ item }">
                <span class="font-weight-medium">{{ item.productName }}</span>
              </template>
              <template #item.unitPrice="{ item }">
                {{ formatAmount(item.unitPrice) }}
              </template>
              <template #item.discount="{ item }">
                {{ formatAmount(item.discount ?? 0) }}
              </template>
              <template #item.subtotal="{ item }">
                <span class="font-weight-bold">{{ formatAmount(item.subtotal) }}</span>
              </template>
              <template #bottom>
                <div class="d-flex justify-space-between pa-4 font-weight-bold">
                  <span>{{ t('sales.total') }}</span>
                  <span>{{ formatAmount(sale.total) }}</span>
                </div>
              </template>
            </v-data-table>

            <EmptyState
              v-else
              icon="mdi-package-variant-closed"
              :title="t('sales.noItems')"
              :description="t('sales.noItemsHint')"
            />
          </v-card-text>
        </v-card>
      </template>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useSalesStore } from '../../stores/salesStore';
import EmptyState from '../../components/emptyState.vue';
import type { Sale } from '../../types/domain';

const store = useSalesStore();
const route = useRoute();

const sale = ref<Sale | null>(null);
const loading = ref(false);

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.loadFailed') : null
);

const itemHeaders = computed(() => [
  { title: t('sales.product'), key: 'productName' },
  { title: t('sales.qty'), key: 'quantity' },
  { title: t('sales.unitPrice'), key: 'unitPrice' },
  { title: t('sales.discount'), key: 'discount' },
  { title: t('sales.subtotal'), key: 'subtotal' },
]);

function statusLabel(status: string): string {
  const value = t(`enum.saleStatus.${status}`);
  return value === t('errors.undefinedText') ? t('common.none') : value;
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'warning';
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return 'mdi-check-circle-outline';
    case 'cancelled':
      return 'mdi-close-circle-outline';
    default:
      return 'mdi-clock-outline';
  }
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function loadSale() {
  const id = Number(route.params.id);
  if (Number.isNaN(id)) return;
  loading.value = true;
  const result = await store.getSale(id);
  if (result.ok) {
    sale.value = result.data;
  }
  loading.value = false;
}

onMounted(() => {
  void loadSale();
});
</script>
