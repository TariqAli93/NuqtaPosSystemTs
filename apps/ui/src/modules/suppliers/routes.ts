import type { RouteRecordRaw } from 'vue-router';
import SuppliersListView from '../../views/suppliers/SuppliersListView.vue';
import SupplierFormView from '../../views/suppliers/SupplierFormView.vue';
import SupplierDetailsView from '../../views/suppliers/SupplierDetailsView.vue';

export const suppliersRoutes: RouteRecordRaw[] = [
  {
    path: 'suppliers',
    name: 'Suppliers',
    component: SuppliersListView,
  },
  {
    path: 'suppliers/new',
    name: 'SupplierCreate',
    component: SupplierFormView,
    meta: { requiresManageSuppliers: true },
  },
  {
    path: 'suppliers/:id',
    name: 'SupplierDetails',
    component: SupplierDetailsView,
  },
  {
    path: 'suppliers/:id/edit',
    name: 'SupplierEdit',
    component: SupplierFormView,
    meta: { requiresManageSuppliers: true },
  },
];
