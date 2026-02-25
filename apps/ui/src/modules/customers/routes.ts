import type { RouteRecordRaw } from 'vue-router';
import CustomersListView from '../../views/customers/CustomersListView.vue';
import CustomerFormView from '../../views/customers/CustomerFormView.vue';
import CustomerProfileView from '../../views/customers/CustomerProfileView.vue';
import CustomerLedgerView from '../../views/customers/CustomerLedgerView.vue';

export const customersRoutes: RouteRecordRaw[] = [
  {
    path: 'customers',
    name: 'Customers',
    component: CustomersListView,
  },
  {
    path: 'customers/ledger',
    name: 'CustomerLedger',
    component: CustomerLedgerView,
    meta: { requiresLedgers: true, requiresManageCustomers: true },
  },
  {
    path: 'customers/new',
    name: 'CustomerCreate',
    component: CustomerFormView,
    meta: { requiresManageCustomers: true },
  },
  {
    path: 'customers/:id',
    name: 'CustomerProfile',
    component: CustomerProfileView,
    meta: { requiresLedgers: true },
  },
  {
    path: 'customers/:id/edit',
    name: 'CustomerEdit',
    component: CustomerFormView,
    meta: { requiresManageCustomers: true },
  },
];
