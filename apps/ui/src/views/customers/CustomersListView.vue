<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="mb-6" border="bottom">
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('customers.title') }}</div>
          <div class="text-sm">{{ t('customers.subtitle') }}</div>
        </v-app-bar-title>

        <template #append>
          <v-btn color="primary" :to="'/customers/new'" prepend-icon="mdi-plus">
            {{ t('customers.new') }}
          </v-btn>
        </template>
      </v-app-bar>

      <v-card class="win-card mb-4" flat>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="searchQuery"
            :placeholder="t('customers.search')"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            clearable
            autofocus
            hide-details
          />
        </v-card-text>
      </v-card>

      <v-card class="win-card" flat>
        <v-card-text class="pa-0">
          <v-data-table
            :headers="tableHeaders"
            :items="store.items"
            density="comfortable"
            class="ds-table-enhanced ds-table-striped"
            :no-data-text="''"
            :hide-default-footer="true"
          >
            <template #item.name="{ item }">
              <span class="font-weight-medium">{{ item.name }}</span>
            </template>
            <template #item.phone="{ item }">
              <span class="text-medium-emphasis">{{ item.phone || t('common.none') }}</span>
            </template>
            <template #item.city="{ item }">
              <span class="text-medium-emphasis">{{ item.city || t('common.none') }}</span>
            </template>
            <template #item.totalDebt="{ item }">
              <span
                class="font-weight-bold"
                :class="item.totalDebt && item.totalDebt > 0 ? 'text-error' : 'text-success'"
              >
                {{ formatNumber(item.totalDebt ?? 0) }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                size="small"
                variant="text"
                class="win-ghost-btn"
                :to="`/customers/${item.id}/edit`"
                prepend-icon="mdi-pencil"
              >
                {{ t('common.edit') }}
              </v-btn>
            </template>
          </v-data-table>

          <EmptyState
            v-if="store.items.length === 0 && !store.loading"
            icon="mdi-account-group-outline"
            :title="t('customers.noCustomers')"
            :description="t('customers.noCustomersHint')"
            :action-label="t('customers.new')"
            action-to="/customers/new"
            action-icon="mdi-plus"
          />
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useCustomersStore } from '../../stores/customersStore';
import EmptyState from '../../components/emptyState.vue';
import { notifyError } from '@/utils/notify';

const store = useCustomersStore();
const searchQuery = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.loadFailed') : null
);

const tableHeaders = computed(() => [
  { title: t('common.name'), key: 'name' },
  { title: t('common.phone'), key: 'phone' },
  { title: t('common.city'), key: 'city' },
  { title: t('customers.totalDebt'), key: 'totalDebt' },
  { title: '', key: 'actions', sortable: false, width: 120 },
]);

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-IQ').format(value);
}

function fetchWithSearch() {
  void store.fetchCustomers({
    limit: 25,
    offset: 0,
    search: searchQuery.value || undefined,
  });
}

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(fetchWithSearch, 300);
});

watch(localizedError, (value) => {
  if (!value) return;
  notifyError(value, { dedupeKey: 'customers-list-error' });
});

onMounted(() => {
  fetchWithSearch();
});
</script>

<style scoped></style>
