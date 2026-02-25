import type { RouteRecordRaw } from 'vue-router';
import SuppliersListView from '../../views/suppliers/SuppliersListView.vue';
import SupplierFormView from '../../views/suppliers/SupplierFormView.vue';
import SupplierDetailsView from '../../views/suppliers/SupplierDetailsView.vue';
import SupplierLedgerView from '../../views/suppliers/SupplierLedgerView.vue';

export const suppliersRoutes: RouteRecordRaw[] = [
  {
    path: 'suppliers',
    name: 'Suppliers',
    component: SuppliersListView,
    meta: { requiresPurchasing: true },
  },
  {
    path: 'suppliers/ledger',
    name: 'SupplierLedger',
    component: SupplierLedgerView,
    meta: { requiresPurchasing: true, requiresLedgers: true, requiresManageSuppliers: true },
  },
  {
    path: 'suppliers/new',
    name: 'SupplierCreate',
    component: SupplierFormView,
    meta: { requiresManageSuppliers: true, requiresPurchasing: true },
  },
  {
    path: 'suppliers/:id',
    name: 'SupplierDetails',
    component: SupplierDetailsView,
    meta: { requiresPurchasing: true, requiresLedgers: true },
  },
  {
    path: 'suppliers/:id/edit',
    name: 'SupplierEdit',
    component: SupplierFormView,
    meta: { requiresManageSuppliers: true, requiresPurchasing: true },
  },
];
