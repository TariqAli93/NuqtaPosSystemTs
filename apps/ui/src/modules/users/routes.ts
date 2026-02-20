import type { RouteRecordRaw } from 'vue-router';

export const usersRoutes: RouteRecordRaw[] = [
  {
    path: 'users',
    name: 'Users',
    redirect: { name: 'Settings', query: { tab: 'users' } },
    meta: { requiresManageSettings: true },
  },
];
