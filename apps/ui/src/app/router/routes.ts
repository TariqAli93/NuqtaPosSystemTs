import type { RouteRecordRaw } from 'vue-router';
import PosLayout from '../../layouts/PosLayout.vue';
import AuthLayout from '../../layouts/AuthLayout.vue';
import PosView from '../../views/pos/PosView.vue';
import ForbiddenView from '../../views/system/ForbiddenView.vue';
import NotFoundView from '../../views/system/NotFoundView.vue';
import { authRoutes, setupRoute } from '../../modules/auth/routes';
import { customersRoutes } from '../../modules/customers/routes';
import { productsRoutes } from '../../modules/products/routes';
import { salesRoutes } from '../../modules/sales/routes';
import { settingsRoutes } from '../../modules/settings/routes';
import { usersRoutes } from '../../modules/users/routes';
import { categoriesRoutes } from '../../modules/categories/routes';
import { profileRoutes } from '../../modules/profile/routes';
import { aboutRoutes } from '../../modules/about/routes';
import { suppliersRoutes } from '../../modules/suppliers/routes';
import { purchasesRoutes } from '../../modules/purchases/routes';
import { inventoryRoutes } from '../../modules/inventory/routes';
import { accountingRoutes } from '../../modules/accounting/routes';
import { simpleModeRoutes } from '../../modules/simple/routes';

export const routes: RouteRecordRaw[] = [
  setupRoute,
  {
    path: '/auth',
    component: AuthLayout,
    children: authRoutes,
  },
  {
    path: '/',
    component: PosLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/pos',
      },
      {
        path: 'pos',
        name: 'POS',
        component: PosView,
        meta: { enableBarcode: 'pos' },
      },
      ...simpleModeRoutes,
      ...customersRoutes,
      ...productsRoutes,
      ...salesRoutes,
      ...suppliersRoutes,
      ...purchasesRoutes,
      ...inventoryRoutes,
      ...accountingRoutes,
      ...settingsRoutes,
      ...usersRoutes,
      ...categoriesRoutes,
      ...profileRoutes,
      ...aboutRoutes,
      {
        path: 'forbidden',
        name: 'Forbidden',
        component: ForbiddenView,
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView,
  },
];
