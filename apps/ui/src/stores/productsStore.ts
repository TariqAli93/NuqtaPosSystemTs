import { defineStore } from 'pinia';
import { ref } from 'vue';
import { productsClient } from '../ipc';
import type { Product, ProductInput } from '../types/domain';

export const useProductsStore = defineStore('products', () => {
  const items = ref<Product[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProducts(params?: { search?: string; page?: number; limit?: number }) {
    loading.value = true;
    error.value = null;
    const result = await productsClient.getAll(params);
    if (result.ok) {
      items.value = result.data.items;
      total.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function createProduct(payload: ProductInput) {
    loading.value = true;
    error.value = null;
    console.log(payload);
    const result = await productsClient.create(payload);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function updateProduct(id: number, payload: ProductInput) {
    loading.value = true;
    error.value = null;
    const result = await productsClient.update(id, payload);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function deleteProduct(id: number) {
    loading.value = true;
    error.value = null;
    const result = await productsClient.delete(id);
    if (!result.ok) {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchProductById(id: number) {
    loading.value = true;
    error.value = null;
    const result = await productsClient.getById(id);
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
    fetchProducts,
    fetchProductById,
    createProduct,
    updateProduct,
    deleteProduct,
  };
});
