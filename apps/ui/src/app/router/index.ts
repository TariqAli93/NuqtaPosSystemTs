import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import { routes } from './routes';
import { applyAuthGuard } from '../../auth/guards';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    requiresManageProducts?: boolean;
    requiresManageCustomers?: boolean;
    requiresCreateSales?: boolean;
    requiresManageSettings?: boolean;
  }
}

const router = createRouter({
  history: (import.meta as any).env.PROD ? createWebHashHistory() : createWebHistory(),
  routes,
});

applyAuthGuard(router);

export default router;
