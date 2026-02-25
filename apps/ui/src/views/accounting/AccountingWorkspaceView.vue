<template>
  <v-container>
    <v-app-bar class="mb-6" border="bottom">
      <v-app-bar-title>
        <div class="win-title mb-0">{{ t('nav.accounting') }}</div>
        <div class="text-sm">إدارة الحسابات والتقارير المالية</div>
      </v-app-bar-title>

      <template #append>
        <v-btn color="primary" prepend-icon="mdi-refresh" @click="refreshAll"> تحديث الكل </v-btn>
      </template>
    </v-app-bar>

    <v-tabs v-model="activeTab" bg-color="surface" class="w-full mb-4">
      <v-tab
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        @click="navigateToTab(tab.route)"
      >
        {{ tab.label }}
      </v-tab>
    </v-tabs>

    <router-view />
  </v-container>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountingStore } from '@/stores/accountingStore';
import { t } from '@/i18n/t';

const route = useRoute();
const router = useRouter();
const accountingStore = useAccountingStore();

const tabs = [
  { value: 'accounts', label: 'دليل الحسابات', route: 'AccountingAccounts' },
  { value: 'journal', label: 'القيود اليومية', route: 'AccountingJournal' },
  { value: 'trial', label: 'ميزان المراجعة', route: 'AccountingTrialBalance' },
  { value: 'pnl', label: 'الأرباح والخسائر', route: 'AccountingProfitLoss' },
  { value: 'balance', label: 'الميزانية العمومية', route: 'AccountingBalanceSheet' },
];

const activeTab = computed({
  get() {
    const name = route.name as string;
    const match = tabs.find((tab) => tab.route === name);
    return match?.value ?? 'accounts';
  },
  set() {
    /* handled by click */
  },
});

function navigateToTab(routeName: string) {
  void router.push({ name: routeName });
}

async function refreshAll(): Promise<void> {
  await Promise.all([
    accountingStore.fetchAccounts(),
    accountingStore.fetchJournalEntries({ limit: 30, offset: 0 }),
    accountingStore.fetchTrialBalance(),
    accountingStore.fetchProfitLoss(),
    accountingStore.fetchBalanceSheet(),
  ]);
}
</script>
