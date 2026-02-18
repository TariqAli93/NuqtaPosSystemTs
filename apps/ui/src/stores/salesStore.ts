import { defineStore } from 'pinia';
import { ref } from 'vue';
import { salesClient } from '../ipc';
import type { Payment, Sale, SaleInput } from '../types/domain';
import { generateIdempotencyKey } from '../utils/idempotency';

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
    loading.value = true;
    error.value = null;
    try {
      // userId is resolved by UserContextService at the IPC boundary — never sent from UI
      const result = await salesClient.create(payload);
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
    const result = await salesClient.addPayment(id, {
      ...payment,
      idempotencyKey: payment.idempotencyKey || generateIdempotencyKey('sale-payment'),
    });
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

  async function generateReceipt(saleId: number): Promise<string> {
    const result = await salesClient.generateReceipt(saleId);
    if (result.ok) {
      return result.data.receiptHtml;
    } else {
      throw new Error(result.error.message || 'Failed to generate receipt');
    }
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
    generateReceipt,
  };
});
