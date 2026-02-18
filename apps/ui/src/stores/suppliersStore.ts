import { defineStore } from 'pinia';
import { ref } from 'vue';
import { suppliersClient, type SupplierInput } from '../ipc/suppliersClient';
import type { Supplier } from '@nuqtaplus/core';

export const useSuppliersStore = defineStore('suppliers', () => {
  const items = ref<Supplier[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSuppliers(params?: { search?: string; limit?: number; offset?: number }) {
    loading.value = true;
    error.value = null;
    const result = await suppliersClient.getAll(params);
    if (result.ok) {
      items.value = result.data.items;
      total.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function createSupplier(payload: SupplierInput) {
    loading.value = true;
    error.value = null;
    const result = await suppliersClient.create(payload);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function updateSupplier(id: number, payload: SupplierInput) {
    loading.value = true;
    error.value = null;
    const result = await suppliersClient.update(id, payload);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function deleteSupplier(id: number) {
    loading.value = true;
    error.value = null;
    const result = await suppliersClient.delete(id);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function fetchSupplierById(id: number) {
    loading.value = true;
    error.value = null;
    const result = await suppliersClient.getById(id);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  return {
    items,
    total,
    loading,
    error,
    fetchSuppliers,
    fetchSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
});
