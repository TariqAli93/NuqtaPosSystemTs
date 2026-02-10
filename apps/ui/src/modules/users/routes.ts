import type { RouteRecordRaw } from 'vue-router';
import UsersView from '../../views/users/UsersView.vue';

export const usersRoutes: RouteRecordRaw[] = [
  {
    path: 'users',
    name: 'Users',
    component: UsersView,
    meta: { requiresManageSettings: true },
  },
];
