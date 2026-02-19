import type { RouteRecordRaw } from 'vue-router';
import SimpleSalesView from '../../views/simple/SimpleSalesView.vue';
import SimpleProductCreateView from '../../views/simple/SimpleProductCreateView.vue';

export const simpleModeRoutes: RouteRecordRaw[] = [
  {
    path: 'simple/sales',
    name: 'SimpleSales',
    component: SimpleSalesView,
    meta: { requiresCreateSales: true },
  },
  {
    path: 'simple/products',
    name: 'SimpleProductCreate',
    component: SimpleProductCreateView,
    meta: { requiresManageProducts: true },
  },
  {
    path: 'simple/products/new',
    redirect: { name: 'SimpleProductCreate' },
  },
];
