import type { RouteRecordRaw } from 'vue-router';
import CustomersListView from '../../views/customers/CustomersListView.vue';
import CustomerFormView from '../../views/customers/CustomerFormView.vue';

export const customersRoutes: RouteRecordRaw[] = [
  {
    path: 'customers',
    name: 'Customers',
    component: CustomersListView,
  },
  {
    path: 'customers/new',
    name: 'CustomerCreate',
    component: CustomerFormView,
    meta: { requiresManageCustomers: true },
  },
  {
    path: 'customers/:id/edit',
    name: 'CustomerEdit',
    component: CustomerFormView,
    meta: { requiresManageCustomers: true },
  },
];
