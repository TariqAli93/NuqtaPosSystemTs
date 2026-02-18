import { defineStore } from 'pinia';
import { ref } from 'vue';
import { purchasesClient, type PurchaseCreateInput } from '../ipc/purchasesClient';
import type { Purchase } from '@nuqtaplus/core';

export const usePurchasesStore = defineStore('purchases', () => {
  const items = ref<Purchase[]>([]);
  const total = ref(0);
  const currentPurchase = ref<Purchase | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPurchases(params?: {
    search?: string;
    supplierId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;
    error.value = null;
    const result = await purchasesClient.getAll(params);
    if (result.ok) {
      items.value = result.data.items;
      total.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchPurchaseById(id: number) {
    loading.value = true;
    error.value = null;
    const result = await purchasesClient.getById(id);
    if (result.ok) {
      currentPurchase.value = result.data;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function createPurchase(data: PurchaseCreateInput) {
    loading.value = true;
    error.value = null;
    const result = await purchasesClient.create(data);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  return {
    items,
    total,
    currentPurchase,
    loading,
    error,
    fetchPurchases,
    fetchPurchaseById,
    createPurchase,
  };
});
