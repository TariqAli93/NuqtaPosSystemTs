import type { RouteRecordRaw } from 'vue-router';
import LoginView from '../../views/auth/LoginView.vue';
import SetupView from '../../views/auth/SetupView.vue';

export const authRoutes: RouteRecordRaw[] = [
  {
    path: 'login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
];

export const setupRoute: RouteRecordRaw = {
  path: '/setup',
  name: 'InitialSetup',
  component: SetupView,
};
