<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">الموردين</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn color="primary" prepend-icon="mdi-plus" :to="{ name: 'SupplierCreate' }">
          إضافة مورد
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-card-text>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="بحث..."
          variant="outlined"
          density="compact"
          hide-details
          class="mb-4"
          @update:model-value="onSearch"
        />

        <v-data-table
          :headers="headers"
          :items="suppliersStore.items"
          :loading="suppliersStore.loading"
          :items-per-page="20"
          density="compact"
          @click:row="
            (_: Event, { item }: { item: any }) =>
              router.push({ name: 'SupplierDetails', params: { id: item.id } })
          "
        >
          <template #item.currentBalance="{ item }">
            <MoneyDisplay :amount="item.currentBalance ?? 0" size="sm" colored />
          </template>
          <template #item.actions="{ item }">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click.stop
              :to="{ name: 'SupplierEdit', params: { id: item.id } }"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click.stop="onDelete(item.id!)"
            />
          </template>
          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">لا يوجد موردين</div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSuppliersStore } from '../../stores/suppliersStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const router = useRouter();
const suppliersStore = useSuppliersStore();
const search = ref('');

const headers = [
  { title: 'الاسم', key: 'name' },
  { title: 'الهاتف', key: 'phone' },
  { title: 'المدينة', key: 'city' },
  { title: 'المستحق', key: 'currentBalance', align: 'end' as const },
  { title: 'الإجراءات', key: 'actions', sortable: false, align: 'center' as const },
];

onMounted(() => {
  suppliersStore.fetchSuppliers();
});

function onSearch(val: string) {
  suppliersStore.fetchSuppliers({ search: val || undefined });
}

async function onDelete(id: number) {
  const result = await suppliersStore.deleteSupplier(id);
  if (result.ok) suppliersStore.fetchSuppliers({ search: search.value || undefined });
}
</script>
