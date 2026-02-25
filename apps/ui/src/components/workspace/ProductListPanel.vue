<template>
  <v-card class="d-flex flex-column h-fit">
    <v-card-title class="d-flex align-center">
      <span class="text-subtitle-1 font-weight-bold">المنتجات</span>
    </v-card-title>

    <v-card-text class="pb-0">
      <v-text-field
        v-model="search"
        label="بحث"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        clearable
        hide-details
        @update:model-value="emitFilters"
      />
      <v-row dense class="mt-2">
        <v-col cols="12" sm="6">
          <v-select
            v-model="categoryId"
            :items="categories"
            item-title="name"
            item-value="id"
            label="الفئة"
            clearable
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emitFilters"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="supplierId"
            :items="suppliers"
            item-title="name"
            item-value="id"
            label="المورد"
            clearable
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emitFilters"
          />
        </v-col>
      </v-row>
      <v-row dense class="mt-1">
        <v-col cols="12">
          <v-select
            v-model="status"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="الحالة"
            clearable
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emitFilters"
          />
        </v-col>
        <v-col cols="12" class="d-flex align-center ga-2">
          <v-checkbox
            v-model="lowStockOnly"
            label="منخفض المخزون"
            density="compact"
            hide-details
            @update:model-value="emitFilters"
          />
          <v-checkbox
            v-model="expiringSoonOnly"
            label="قريب الانتهاء"
            density="compact"
            hide-details
            @update:model-value="emitFilters"
          />
        </v-col>
      </v-row>
    </v-card-text>

    <v-data-table-server
      class="flex-grow-1"
      :headers="headers"
      :items="products"
      :items-length="total"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :page="page"
      item-value="id"
      density="compact"
      fixed-header
      height="520"
      @update:options="onOptionsChange"
      @click:row="onRowClick"
    >
      <template #item.name="{ item }">
        <div class="d-flex align-center ga-2">
          <v-icon size="14" :color="item.id === selectedProductId ? 'primary' : 'transparent'">
            mdi-circle
          </v-icon>
          <span class="font-weight-medium">{{ item.name }}</span>
        </div>
      </template>
      <template #item.stock="{ item }">
        <v-chip
          :color="(item.stock || 0) <= (item.minStock || 0) ? 'warning' : 'success'"
          size="x-small"
          variant="tonal"
        >
          {{ item.stock }}
        </v-chip>
      </template>
      <template #item.status="{ item }">
        <v-chip size="x-small" variant="tonal" :color="statusColor(item.status)">
          {{ statusLabel(item.status) }}
        </v-chip>
      </template>
      <template #no-data>
        <div class="text-center py-8 text-medium-emphasis">لا توجد منتجات مطابقة</div>
      </template>
    </v-data-table-server>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Product } from '@nuqtaplus/core';
import type { ProductWorkspaceFilters } from '@/types/workspace';

type LookupItem = { id: number; name: string };

const props = defineProps<{
  products: Product[];
  total: number;
  loading: boolean;
  selectedProductId: number | null;
  categories: LookupItem[];
  suppliers: LookupItem[];
  filters: ProductWorkspaceFilters;
}>();

const emit = defineEmits<{
  openCreate: [];
  updateFilters: [filters: ProductWorkspaceFilters];
  changePage: [pagination: { limit: number; offset: number }];
  selectProduct: [productId: number];
}>();

const headers = [
  { title: 'المنتج', key: 'name' },
  { title: 'المخزون', key: 'stock', align: 'center' as const, width: 90 },
  { title: 'الحالة', key: 'status', align: 'center' as const, width: 120 },
];

const statusOptions = [
  { title: 'متوفر', value: 'available' },
  { title: 'نفاد', value: 'out_of_stock' },
  { title: 'موقوف', value: 'discontinued' },
];

const search = ref(props.filters.search || '');
const categoryId = ref<number | undefined>(props.filters.categoryId);
const supplierId = ref<number | undefined>(props.filters.supplierId);
const status = ref<string | undefined>(props.filters.status);
const lowStockOnly = ref(Boolean(props.filters.lowStockOnly));
const expiringSoonOnly = ref(Boolean(props.filters.expiringSoonOnly));

const itemsPerPage = ref(props.filters.limit || 20);
const page = computed(() => Math.floor((props.filters.offset || 0) / itemsPerPage.value) + 1);

watch(
  () => props.filters,
  (value) => {
    search.value = value.search || '';
    categoryId.value = value.categoryId;
    supplierId.value = value.supplierId;
    status.value = value.status;
    lowStockOnly.value = Boolean(value.lowStockOnly);
    expiringSoonOnly.value = Boolean(value.expiringSoonOnly);
    itemsPerPage.value = value.limit || 20;
  }
);

function emitFilters(): void {
  emit('updateFilters', {
    search: search.value || undefined,
    categoryId: categoryId.value,
    supplierId: supplierId.value,
    status: status.value || undefined,
    lowStockOnly: lowStockOnly.value || undefined,
    expiringSoonOnly: expiringSoonOnly.value || undefined,
    limit: itemsPerPage.value,
    offset: (page.value - 1) * itemsPerPage.value,
  });
}

function onOptionsChange(options: { page: number; itemsPerPage: number }): void {
  const limit = options.itemsPerPage || itemsPerPage.value || 20;
  const nextPage = options.page || 1;
  itemsPerPage.value = limit;
  emit('changePage', {
    limit,
    offset: (nextPage - 1) * limit,
  });
}

function onRowClick(_event: Event, payload: { item: any }): void {
  const row = payload.item?.raw || payload.item;
  if (row?.id) {
    emit('selectProduct', row.id);
  }
}

function statusLabel(value: string): string {
  if (value === 'available') return 'متوفر';
  if (value === 'out_of_stock') return 'نفاد';
  if (value === 'discontinued') return 'موقوف';
  return value;
}

function statusColor(value: string): string {
  if (value === 'available') return 'success';
  if (value === 'out_of_stock') return 'warning';
  if (value === 'discontinued') return 'error';
  return 'default';
}
</script>
