import type { RouteRecordRaw } from 'vue-router';
import SettingsView from '../../views/settings/SettingsView.vue';

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: 'settings',
    name: 'Settings',
    component: SettingsView,
    meta: { requiresManageSettings: true },
  },
];
