<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">حركات المخزون</h1>
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
              v-model="typeFilter"
              :items="types"
              label="النوع"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="onFilter"
            />
          </v-col>
        </v-row>

        <MovementHistoryTable
          :movements="inventoryStore.movements as any[]"
          :loading="inventoryStore.loading"
        />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryStore } from '../../stores/inventoryStore';
import MovementHistoryTable from '../../components/shared/MovementHistoryTable.vue';

const router = useRouter();
const inventoryStore = useInventoryStore();
const typeFilter = ref<string | null>(null);

const types = [
  { title: 'وارد', value: 'in' },
  { title: 'صادر', value: 'out' },
  { title: 'تعديل', value: 'adjust' },
];

onMounted(() => inventoryStore.fetchMovements());

function onFilter() {
  inventoryStore.fetchMovements({ movementType: typeFilter.value || undefined });
}
</script>
