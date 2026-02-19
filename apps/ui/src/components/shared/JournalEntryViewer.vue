<template>
  <v-card
    :variant="isSystem ? 'tonal' : 'outlined'"
    :color="isSystem ? 'grey-lighten-4' : undefined"
    class="journal-viewer"
  >
    <v-card-title class="d-flex align-center ga-3">
      <v-icon size="20">mdi-book-open-page-variant</v-icon>
      <span class="text-subtitle-1 font-weight-bold">{{ entry.entryNumber }}</span>
      <v-chip v-if="isSystem" size="x-small" color="grey" variant="flat" prepend-icon="mdi-lock">
        نظام
      </v-chip>
      <v-chip v-else size="x-small" color="primary" variant="tonal"> يدوي </v-chip>
      <v-spacer />
      <span class="text-caption text-medium-emphasis">{{ formatDate(entry.entryDate) }}</span>
    </v-card-title>

    <v-card-subtitle v-if="entry.description" class="pb-2">
      {{ entry.description }}
    </v-card-subtitle>

    <v-divider />

    <v-table density="compact" class="journal-lines-table">
      <thead>
        <tr>
          <th>الحساب</th>
          <th class="text-end">مدين</th>
          <th class="text-end">دائن</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in entry.lines" :key="line.id">
          <td>{{ line.accountName ?? `حساب #${line.accountId}` }}</td>
          <td
            class="text-end"
            style="font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: embed"
          >
            {{ line.debit ? line.debit.toLocaleString('en-US') : '' }}
          </td>
          <td
            class="text-end"
            style="font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: embed"
          >
            {{ line.credit ? line.credit.toLocaleString('en-US') : '' }}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="font-weight-bold">
          <td>المجموع</td>
          <td
            class="text-end"
            style="font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: embed"
          >
            {{ totalDebit.toLocaleString('en-US') }}
          </td>
          <td
            class="text-end"
            style="font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: embed"
          >
            {{ totalCredit.toLocaleString('en-US') }}
          </td>
        </tr>
      </tfoot>
    </v-table>

    <v-card-text v-if="entry.notes" class="text-caption text-medium-emphasis pt-2">
      {{ entry.notes }}
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatDate } from '@/utils/formatters';

export interface JournalLineDisplay {
  id?: number;
  accountId: number;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string | null;
}

export interface JournalEntryDisplay {
  id?: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceType?: string;
  sourceId?: number;
  isPosted?: boolean;
  isReversed?: boolean;
  totalAmount: number;
  currency?: string;
  notes?: string | null;
  lines?: JournalLineDisplay[];
}

const props = defineProps<{
  entry: JournalEntryDisplay;
}>();

const isSystem = computed(() => !!props.entry.sourceType && props.entry.sourceType !== 'manual');

const totalDebit = computed(() =>
  (props.entry.lines ?? []).reduce((sum, l) => sum + (l.debit || 0), 0)
);

const totalCredit = computed(() =>
  (props.entry.lines ?? []).reduce((sum, l) => sum + (l.credit || 0), 0)
);
</script>

<style scoped>
.journal-viewer .journal-lines-table :deep(th) {
  font-weight: 600 !important;
}
.journal-viewer .journal-lines-table :deep(tfoot td) {
  border-top: 2px solid rgb(var(--v-theme-on-surface), 0.2);
}
</style>
