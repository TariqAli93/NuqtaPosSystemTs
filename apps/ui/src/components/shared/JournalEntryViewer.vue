<template>
  <v-card>
    <!-- Header toolbar -->
    <v-toolbar density="compact" color="transparent" class="px-2">
      <v-icon class="ms-2" size="22" color="primary">mdi-book-open-page-variant</v-icon>

      <v-toolbar-title class="text-subtitle-1 font-weight-bold ms-3">
        {{ entry.entryNumber }}
      </v-toolbar-title>

      <v-chip
        v-if="isSystem"
        size="small"
        color="grey"
        variant="flat"
        prepend-icon="mdi-lock"
        class="ms-2"
      >
        نظام
      </v-chip>
      <v-chip v-else size="small" color="primary" variant="tonal" class="ms-2">يدوي</v-chip>

      <v-chip
        v-if="entry.isPosted"
        size="small"
        color="success"
        variant="tonal"
        prepend-icon="mdi-check-circle-outline"
        class="ms-2"
      >
        مرحّل
      </v-chip>
      <v-chip
        v-else-if="entry.isPosted === false"
        size="small"
        color="warning"
        variant="tonal"
        prepend-icon="mdi-clock-outline"
        class="ms-2"
      >
        غير مرحّل
      </v-chip>

      <v-chip
        v-if="entry.isReversed"
        size="small"
        color="error"
        variant="tonal"
        prepend-icon="mdi-undo-variant"
        class="ms-2"
      >
        معكوس
      </v-chip>

      <v-spacer />

      <v-chip size="small" variant="text" prepend-icon="mdi-calendar-outline">
        {{ formatDate(entry.entryDate) }}
      </v-chip>
    </v-toolbar>

    <v-divider />

    <!-- Meta info row -->
    <v-card-text v-if="entry.description || entry.sourceType" class="pb-0">
      <v-row dense>
        <v-col v-if="entry.description" cols="12" md="8">
          <div class="text-body-2">
            <span class="text-medium-emphasis font-weight-medium">الوصف:</span>
            {{ entry.description }}
          </div>
        </v-col>
        <v-col v-if="entry.sourceType" cols="12" md="4" class="text-md-end">
          <v-chip
            size="small"
            variant="tonal"
            :color="sourceColor"
            prepend-icon="mdi-source-branch"
          >
            {{ sourceLabel }}
          </v-chip>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Journal lines data table -->
    <v-card-text>
      <v-data-table
        :headers="lineHeaders"
        :items="lineItems"
        density="compact"
        :items-per-page="-1"
        hide-default-footer
        hover
      >
        <template #item.account="{ item }">
          <span class="font-weight-medium">{{ item.account }}</span>
          <div v-if="item.description" class="text-caption text-medium-emphasis">
            {{ item.description }}
          </div>
        </template>

        <template #item.debit="{ item }">
          <span v-if="item.debit" class="tabular-nums text-error">
            {{ item.debit.toLocaleString('en-US') }}
          </span>
        </template>

        <template #item.credit="{ item }">
          <span v-if="item.credit" class="tabular-nums text-success">
            {{ item.credit.toLocaleString('en-US') }}
          </span>
        </template>

        <template #no-data>
          <div class="text-center py-4 text-medium-emphasis">
            <v-icon size="32" class="mb-1">mdi-file-document-remove-outline</v-icon>
            <div>لا توجد سطور لهذا القيد</div>
          </div>
        </template>

        <template #bottom />
      </v-data-table>
    </v-card-text>

    <v-divider />

    <!-- Totals row -->
    <v-card-text class="py-3">
      <v-row dense align="center">
        <v-col cols="12" sm="4">
          <span class="text-subtitle-2 font-weight-bold">المجموع</span>
        </v-col>
        <v-col cols="6" sm="4" class="text-end">
          <v-chip size="small" variant="tonal" color="error" prepend-icon="mdi-arrow-up-bold">
            مدين: {{ totalDebit.toLocaleString('en-US') }}
          </v-chip>
        </v-col>
        <v-col cols="6" sm="4" class="text-end">
          <v-chip size="small" variant="tonal" color="success" prepend-icon="mdi-arrow-down-bold">
            دائن: {{ totalCredit.toLocaleString('en-US') }}
          </v-chip>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Imbalance alert -->
    <v-alert
      v-if="isImbalanced"
      type="error"
      variant="tonal"
      density="compact"
      prominent
      icon="mdi-alert-circle"
      class="mx-4 mb-4"
      rounded="lg"
    >
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>القيد غير متوازن</span>
        <v-chip size="small" color="error" variant="flat">
          الفرق: {{ Math.abs(totalDebit - totalCredit).toLocaleString('en-US') }}
        </v-chip>
      </div>
    </v-alert>

    <!-- Balance badge -->
    <v-alert
      v-else-if="(entry.lines ?? []).length > 0"
      type="success"
      variant="tonal"
      density="compact"
      icon="mdi-check-circle"
      class="mx-4 mb-4"
      rounded="lg"
    >
      القيد متوازن
    </v-alert>

    <!-- Notes -->
    <v-expand-transition>
      <v-card-text v-if="entry.notes" class="pt-0">
        <v-sheet rounded="lg" color="grey-lighten-4" class="pa-3">
          <div class="d-flex align-center ga-2 mb-1">
            <v-icon size="16" color="grey">mdi-note-text-outline</v-icon>
            <span class="text-caption font-weight-bold text-medium-emphasis">ملاحظات</span>
          </div>
          <div class="text-body-2">{{ entry.notes }}</div>
        </v-sheet>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatDate } from '@/utils/formatters';
import { useAccountingStore } from '@/stores/accountingStore';

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

const accountingStore = useAccountingStore();

const isSystem = computed(() => !!props.entry.sourceType && props.entry.sourceType !== 'manual');

const totalDebit = computed(() =>
  (props.entry.lines ?? []).reduce((sum, l) => sum + (l.debit || 0), 0)
);

const totalCredit = computed(() =>
  (props.entry.lines ?? []).reduce((sum, l) => sum + (l.credit || 0), 0)
);

const isImbalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) > 0.001);

const SOURCE_LABELS: Record<string, string> = {
  sale: 'بيع',
  purchase: 'شراء',
  payment: 'دفعة',
  return: 'مرتجع',
  adjustment: 'تسوية',
  opening: 'رصيد افتتاحي',
  manual: 'يدوي',
};

const SOURCE_COLORS: Record<string, string> = {
  sale: 'primary',
  purchase: 'success',
  payment: 'info',
  return: 'warning',
  adjustment: 'orange',
  opening: 'grey',
  manual: 'secondary',
};

const sourceLabel = computed(
  () => SOURCE_LABELS[props.entry.sourceType ?? ''] ?? props.entry.sourceType ?? ''
);
const sourceColor = computed(() => SOURCE_COLORS[props.entry.sourceType ?? ''] ?? 'grey');

function getAccountNameById(accountId: number): string {
  const account = accountingStore.accounts.find((a) => a.id === accountId);
  return account ? account.name : `حساب #${accountId}`;
}

const lineHeaders = [
  { title: 'الحساب', key: 'account', sortable: false },
  { title: 'مدين', key: 'debit', align: 'end' as const, width: '140px', sortable: false },
  { title: 'دائن', key: 'credit', align: 'end' as const, width: '140px', sortable: false },
];

const lineItems = computed(() =>
  (props.entry.lines ?? []).map((line) => ({
    account: getAccountNameById(line.accountId),
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.description,
  }))
);
</script>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
  direction: ltr;
  unicode-bidi: embed;
}
</style>
