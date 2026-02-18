<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" class="me-2" />
        <span class="text-h5 font-weight-bold">تفاصيل القيد</span>
      </v-col>
    </v-row>

    <v-skeleton-loader v-if="accountingStore.loading" type="card" />

    <JournalEntryViewer
      v-else-if="accountingStore.currentEntry"
      :entry="accountingStore.currentEntry as any"
    />

    <v-alert v-else type="warning" variant="tonal">لم يتم العثور على القيد</v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountingStore } from '../../stores/accountingStore';
import JournalEntryViewer from '../../components/shared/JournalEntryViewer.vue';

const route = useRoute();
const router = useRouter();
const accountingStore = useAccountingStore();

onMounted(() => {
  accountingStore.fetchEntryById(Number(route.params.id));
});
</script>
