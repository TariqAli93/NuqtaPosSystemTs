import { defineStore } from 'pinia';
import { ref } from 'vue';
import { salesClient } from '../ipc';
import type { Payment, Sale, SaleInput } from '../types/domain';
import { useAuthStore } from './authStore';

export const useSalesStore = defineStore('sales', () => {
  const items = ref<Sale[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSales(params?: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    const result = await salesClient.getAll(params);
    if (result.ok) {
      items.value = result.data.items;
      total.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function createSale(payload: SaleInput) {
    const { user } = useAuthStore();
    loading.value = true;
    error.value = null;
    try {
      console.log('Creating sale with payload:', payload);
      const result = await salesClient.create(payload, user?.id);
      if (!result.ok) {
        error.value = result.error.message;
      }
      loading.value = false;
      return result;
    } catch (error: any) {
      error.value = error.message || 'Failed to create sale';
      loading.value = false;
      return { ok: false, error: { message: error.value } };
    }
  }

  async function addPayment(id: number, payment: Payment) {
    loading.value = true;
    error.value = null;
    const result = await salesClient.addPayment(id, payment);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function getSale(id: number) {
    loading.value = true;
    error.value = null;
    const result = await salesClient.getById(id);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function cancelSale(id: number) {
    loading.value = true;
    error.value = null;
    const result = await salesClient.cancel(id);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  return {
    items,
    total,
    loading,
    error,
    fetchSales,
    createSale,
    addPayment,
    getSale,
    cancelSale,
  };
});
