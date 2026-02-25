<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="goBack">
      العودة للقيود
    </v-btn>

    <v-skeleton-loader v-if="accountingStore.loading" type="card" />

    <v-alert v-else-if="!accountingStore.currentEntry" type="warning" variant="tonal">
      لم يتم العثور على القيد المطلوب
    </v-alert>

    <JournalEntryViewer v-else :entry="entryDisplay" />
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountingStore } from '@/stores/accountingStore';
import JournalEntryViewer from '@/components/shared/JournalEntryViewer.vue';
import type { JournalEntryDisplay } from '@/components/shared/JournalEntryViewer.vue';

const route = useRoute();
const router = useRouter();
const accountingStore = useAccountingStore();

const entryDisplay = computed((): JournalEntryDisplay => {
  const e = accountingStore.currentEntry;
  if (!e) {
    return {
      entryNumber: '',
      entryDate: '',
      description: '',
      totalAmount: 0,
    };
  }
  return {
    id: e.id,
    entryNumber: (e as any).entryNumber ?? `#${e.id}`,
    entryDate: (e as any).entryDate ?? '',
    description: (e as any).description ?? '',
    sourceType: (e as any).sourceType,
    sourceId: (e as any).sourceId,
    isPosted: (e as any).isPosted,
    isReversed: (e as any).isReversed,
    totalAmount: (e as any).totalAmount ?? 0,
    currency: (e as any).currency,
    notes: (e as any).notes,
    lines: (e as any).lines ?? [],
  };
});

function goBack(): void {
  void router.push({ name: 'AccountingJournal' });
}

onMounted(async () => {
  const id = Number(route.params.id);
  if (id) {
    await accountingStore.fetchEntryById(id);
  }
});
</script>
