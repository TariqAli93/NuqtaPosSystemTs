import type { RouteRecordRaw } from 'vue-router';
import ProfileView from '../../views/profile/ProfileView.vue';

export const profileRoutes: RouteRecordRaw[] = [
  {
    path: 'profile',
    name: 'Profile',
    component: ProfileView,
  },
];
