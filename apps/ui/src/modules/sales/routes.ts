import type { RouteRecordRaw } from 'vue-router';
import SalesListView from '../../views/sales/SalesListView.vue';
import SaleFormView from '../../views/sales/SaleFormView.vue';
import SaleDetailsView from '../../views/sales/SaleDetailsView.vue';

export const salesRoutes: RouteRecordRaw[] = [
  {
    path: 'sales',
    name: 'Sales',
    component: SalesListView,
  },
  {
    path: 'sales/new',
    name: 'SaleCreate',
    component: SaleFormView,
    meta: { requiresCreateSales: true },
  },
  {
    path: 'sales/:id',
    name: 'SaleDetails',
    component: SaleDetailsView,
  },
];
