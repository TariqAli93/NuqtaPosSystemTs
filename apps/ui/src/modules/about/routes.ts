import type { RouteRecordRaw } from 'vue-router';
import AboutView from '../../views/about/AboutView.vue';

export const aboutRoutes: RouteRecordRaw[] = [
  {
    path: 'about',
    name: 'About',
    component: AboutView,
  },
];
