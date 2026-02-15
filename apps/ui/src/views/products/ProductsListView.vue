<template>
  <v-container>
    <div class="win-page">
      <v-app-bar>
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('products.title') }}</div>
          <div class="text-sm">{{ t('products.subtitle') }}</div>
        </v-app-bar-title>

        <template #append>
          <v-btn color="primary" :to="'/products/new'" prepend-icon="mdi-plus">
            {{ t('products.new') }}
          </v-btn>
        </template>
      </v-app-bar>

      <v-card class="win-card mb-4" flat>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="searchQuery"
            variant="outlined"
            density="comfortable"
            :placeholder="t('products.search')"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          />
        </v-card-text>
      </v-card>

      <v-card class="win-card" flat>
        <v-card-text class="pa-0">
          <v-alert v-if="localizedError" type="error" variant="tonal" class="ma-4">
            {{ localizedError }}
          </v-alert>
          <v-data-table
            :headers="tableHeaders"
            :items="filteredProducts"
            density="comfortable"
            class="ds-table-enhanced ds-table-striped"
            :no-data-text="''"
            :hide-default-footer="true"
          >
            <template #item.name="{ item }">
              <span class="font-weight-medium">{{ item.name }}</span>
            </template>
            <template #item.sku="{ item }">
              <span class="text-medium-emphasis">{{ item.sku || t('common.none') }}</span>
            </template>
            <template #item.sellingPrice="{ item }">
              <span class="font-weight-medium">{{ formatAmount(item.sellingPrice) }}</span>
            </template>
            <template #item.stock="{ item }">
              <span :class="item.stock <= 10 ? 'text-error' : ''">
                {{ formatNumber(item.stock) }}
              </span>
            </template>
            <template #item.status="{ item }">
              <v-chip size="small" variant="tonal" :color="statusBadgeClass(item.status)">{{
                statusLabel(item.status)
              }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn variant="text" :to="`/products/${item.id}/edit`" prepend-icon="mdi-pencil">
                {{ t('common.edit') }}
              </v-btn>
            </template>
          </v-data-table>

          <EmptyState
            v-if="filteredProducts.length === 0 && !store.loading"
            icon="mdi-package-variant-closed"
            :title="t('products.noProducts')"
            :description="t('products.noProductsHint')"
          />
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useProductsStore } from '../../stores/productsStore';
import EmptyState from '../../components/emptyState.vue';
const store = useProductsStore();
const searchQuery = ref('');

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.loadFailed') : null
);

const tableHeaders = computed(() => [
  { title: t('products.name'), key: 'name' },
  { title: t('products.sku'), key: 'sku' },
  { title: t('products.sellingPrice'), key: 'sellingPrice' },
  { title: t('products.stock'), key: 'stock' },
  { title: t('products.status'), key: 'status' },
  { title: '', key: 'actions', sortable: false, width: 120 },
]);

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) {
    return store.items;
  }
  const query = searchQuery.value.toLowerCase();
  return store.items.filter(
    (p: any) => p.name.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query)
  );
});

function statusLabel(status: string): string {
  const value = t(`enum.productStatus.${status}`);
  return value === t('errors.undefinedText') ? t('common.none') : value;
}

function statusBadgeClass(status: string): string {
  console.log('Product status:', status);

  // out_of_stock | low_stock | available
  const statusMap: Record<string, string> = {
    out_of_stock: 'error',
    low_stock: 'warning',
    available: 'success',
  };

  return statusMap[status] || 'default';
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-IQ').format(value);
}

onMounted(() => {
  void store.fetchProducts({ page: 1, limit: 25 });
});
</script>
