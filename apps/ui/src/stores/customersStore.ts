import { defineStore } from 'pinia';
import { ref } from 'vue';
import { customersClient } from '../ipc';
import type { Customer, CustomerInput } from '../types/domain';

export const useCustomersStore = defineStore('customers', () => {
  const items = ref<Customer[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCustomers(params?: { search?: string; limit?: number; offset?: number }) {
    loading.value = true;
    error.value = null;
    const result = await customersClient.getAll(params);
    if (result.ok) {
      items.value = result.data.items;
      total.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function createCustomer(payload: CustomerInput) {
    loading.value = true;
    error.value = null;
    const result = await customersClient.create(payload);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function updateCustomer(id: number, payload: CustomerInput) {
    loading.value = true;
    error.value = null;
    const result = await customersClient.update(id, payload);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function deleteCustomer(id: number) {
    loading.value = true;
    error.value = null;
    const result = await customersClient.delete(id);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchCustomerById(id: number) {
    loading.value = true;
    error.value = null;
    const result = await customersClient.getById(id);
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
    fetchCustomers,
    fetchCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
});
