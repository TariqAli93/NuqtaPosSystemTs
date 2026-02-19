<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">المشتريات</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn color="primary" prepend-icon="mdi-plus" :to="{ name: 'PurchaseCreate' }">
          فاتورة مشتريات جديدة
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-card-text>
        <v-row class="mb-4" dense>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="بحث..."
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="onSearch"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="statusFilter"
              :items="statuses"
              label="الحالة"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="onSearch"
            />
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="purchasesStore.items"
          :loading="purchasesStore.loading"
          :items-per-page="20"
          density="compact"
          @click:row="
            (_: Event, { item }: { item: any }) =>
              router.push({ name: 'PurchaseDetails', params: { id: item.id } })
          "
        >
          <template #item.total="{ item }">
            <MoneyDisplay :amount="item.total" size="sm" />
          </template>
          <template #item.paidAmount="{ item }">
            <MoneyDisplay :amount="item.paidAmount" size="sm" colored />
          </template>
          <template #item.status="{ item }">
            <v-chip
              :color="
                item.status === 'completed'
                  ? 'success'
                  : item.status === 'pending'
                    ? 'warning'
                    : 'error'
              "
              size="small"
              variant="tonal"
            >
              {{ statusLabel(item.status) }}
            </v-chip>
          </template>
          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">لا توجد مشتريات</div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { formatDate } from '@/utils/formatters';
import { useRouter } from 'vue-router';
import { usePurchasesStore } from '../../stores/purchasesStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const router = useRouter();
const purchasesStore = usePurchasesStore();
const search = ref('');
const statusFilter = ref<string | null>(null);

const statuses = [
  { title: 'مكتمل', value: 'completed' },
  { title: 'معلق', value: 'pending' },
  { title: 'ملغي', value: 'cancelled' },
];

const headers = [
  { title: 'رقم الفاتورة', key: 'invoiceNumber' },
  { title: 'التاريخ', key: 'createdAt', width: '140px' },
  { title: 'الإجمالي', key: 'total', align: 'end' as const },
  { title: 'المدفوع', key: 'paidAmount', align: 'end' as const },
  { title: 'الحالة', key: 'status', width: '120px' },
];

onMounted(() => {
  purchasesStore.fetchPurchases();
});

function onSearch() {
  purchasesStore.fetchPurchases({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
  });
}

function statusLabel(s: string): string {
  return { completed: 'مكتمل', pending: 'معلق', cancelled: 'ملغي' }[s] ?? s;
}
</script>
