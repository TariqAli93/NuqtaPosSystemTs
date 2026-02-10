import type { RouteRecordRaw } from 'vue-router';
import CategoriesView from '../../views/categories/CategoriesView.vue';

export const categoriesRoutes: RouteRecordRaw[] = [
  {
    path: 'categories',
    name: 'Categories',
    component: CategoriesView,
    meta: { requiresManageProducts: true },
  },
];
