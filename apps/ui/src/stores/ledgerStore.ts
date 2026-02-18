import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { customerLedgerClient, customersClient, supplierLedgerClient, suppliersClient } from '../ipc';
import type { CustomerLedgerEntry, SupplierLedgerEntry, Customer, Supplier } from '@nuqtaplus/core';

interface LedgerLoadingState {
  customers: boolean;
  suppliers: boolean;
  customerLedger: boolean;
  supplierLedger: boolean;
  reconciliation: boolean;
}

const initialLoadingState = (): LedgerLoadingState => ({
  customers: false,
  suppliers: false,
  customerLedger: false,
  supplierLedger: false,
  reconciliation: false,
});

export const useLedgerStore = defineStore('ledger', () => {
  const customers = ref<Customer[]>([]);
  const customersTotal = ref(0);
  const suppliers = ref<Supplier[]>([]);
  const suppliersTotal = ref(0);

  const selectedCustomerId = ref<number | null>(null);
  const selectedSupplierId = ref<number | null>(null);

  const customerLedgerEntries = ref<CustomerLedgerEntry[]>([]);
  const customerLedgerTotal = ref(0);

  const supplierLedgerEntries = ref<SupplierLedgerEntry[]>([]);
  const supplierLedgerTotal = ref(0);

  const customerReconciliation = ref<unknown | null>(null);
  const supplierReconciliation = ref<unknown | null>(null);

  const loading = reactive<LedgerLoadingState>(initialLoadingState());
  const error = ref<string | null>(null);

  const isBusy = computed(() => Object.values(loading).some(Boolean));

  function resetError(): void {
    error.value = null;
  }

  function setError(message: string | undefined): void {
    error.value = message || 'Unknown ledger error';
  }

  async function fetchCustomers(params?: { search?: string; limit?: number; offset?: number }) {
    loading.customers = true;
    resetError();

    const result = await customersClient.getAll(params);
    if (result.ok) {
      customers.value = result.data.items as Customer[];
      customersTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.customers = false;
    return result;
  }

  async function fetchSuppliers(params?: { search?: string; limit?: number; offset?: number }) {
    loading.suppliers = true;
    resetError();

    const result = await suppliersClient.getAll(params);
    if (result.ok) {
      suppliers.value = result.data.items as Supplier[];
      suppliersTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.suppliers = false;
    return result;
  }

  async function fetchCustomerLedger(
    customerId: number,
    params?: { dateFrom?: string; dateTo?: string; limit?: number; offset?: number }
  ) {
    loading.customerLedger = true;
    resetError();
    selectedCustomerId.value = customerId;

    const result = await customerLedgerClient.getLedger(customerId, params);
    if (result.ok) {
      customerLedgerEntries.value = result.data.items;
      customerLedgerTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.customerLedger = false;
    return result;
  }

  async function fetchSupplierLedger(
    supplierId: number,
    params?: { dateFrom?: string; dateTo?: string; limit?: number; offset?: number }
  ) {
    loading.supplierLedger = true;
    resetError();
    selectedSupplierId.value = supplierId;

    const result = await supplierLedgerClient.getLedger(supplierId, params);
    if (result.ok) {
      supplierLedgerEntries.value = result.data.items;
      supplierLedgerTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.supplierLedger = false;
    return result;
  }

  async function reconcileCustomerDebt(repair = false) {
    loading.reconciliation = true;
    resetError();

    const result = await customerLedgerClient.reconcileDebt(repair);
    if (result.ok) {
      customerReconciliation.value = result.data;
    } else {
      setError(result.error.message);
    }

    loading.reconciliation = false;
    return result;
  }

  async function reconcileSupplierBalance(repair = false) {
    loading.reconciliation = true;
    resetError();

    const result = await supplierLedgerClient.reconcileBalance(repair);
    if (result.ok) {
      supplierReconciliation.value = result.data;
    } else {
      setError(result.error.message);
    }

    loading.reconciliation = false;
    return result;
  }

  return {
    customers,
    customersTotal,
    suppliers,
    suppliersTotal,
    selectedCustomerId,
    selectedSupplierId,
    customerLedgerEntries,
    customerLedgerTotal,
    supplierLedgerEntries,
    supplierLedgerTotal,
    customerReconciliation,
    supplierReconciliation,
    loading,
    isBusy,
    error,
    fetchCustomers,
    fetchSuppliers,
    fetchCustomerLedger,
    fetchSupplierLedger,
    reconcileCustomerDebt,
    reconcileSupplierBalance,
  };
});

