import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  accountingClient,
  type TrialBalanceRow,
  type ProfitLossReport,
  type BalanceSheetReport,
} from '../ipc/accountingClient';
import type { Account, JournalEntry } from '@nuqtaplus/core';

export const useAccountingStore = defineStore('accounting', () => {
  const accounts = ref<Account[]>([]);
  const journalEntries = ref<JournalEntry[]>([]);
  const journalTotal = ref(0);
  const currentEntry = ref<JournalEntry | null>(null);
  const trialBalance = ref<TrialBalanceRow[]>([]);
  const profitLoss = ref<ProfitLossReport | null>(null);
  const balanceSheet = ref<BalanceSheetReport | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAccounts() {
    loading.value = true;
    error.value = null;
    const result = await accountingClient.getAccounts();
    if (result.ok) accounts.value = result.data;
    else error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function fetchJournalEntries(params?: {
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;
    error.value = null;
    const result = await accountingClient.getJournalEntries(params);
    if (result.ok) {
      journalEntries.value = result.data.items;
      journalTotal.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchEntryById(id: number) {
    loading.value = true;
    error.value = null;
    const result = await accountingClient.getEntryById(id);
    if (result.ok) currentEntry.value = result.data;
    else error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function fetchTrialBalance(params?: { dateFrom?: string; dateTo?: string }) {
    loading.value = true;
    const result = await accountingClient.getTrialBalance(params);
    if (result.ok) trialBalance.value = result.data;
    else error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function fetchProfitLoss(params?: { dateFrom?: string; dateTo?: string }) {
    loading.value = true;
    const result = await accountingClient.getProfitLoss(params);
    if (result.ok) profitLoss.value = result.data;
    else error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function fetchBalanceSheet(params?: { asOfDate?: string }) {
    loading.value = true;
    const result = await accountingClient.getBalanceSheet(params);
    if (result.ok) balanceSheet.value = result.data;
    else error.value = result.error.message;
    loading.value = false;
    return result;
  }

  return {
    accounts,
    journalEntries,
    journalTotal,
    currentEntry,
    trialBalance,
    profitLoss,
    balanceSheet,
    loading,
    error,
    fetchAccounts,
    fetchJournalEntries,
    fetchEntryById,
    fetchTrialBalance,
    fetchProfitLoss,
    fetchBalanceSheet,
  };
});
