import type { RouteRecordRaw } from 'vue-router';
import ProductsListView from '../../views/products/ProductsListView.vue';
import ProductFormView from '../../views/products/ProductFormView.vue';

export const productsRoutes: RouteRecordRaw[] = [
  {
    path: 'products',
    name: 'Products',
    component: ProductsListView,
  },
  {
    path: 'products/new',
    name: 'ProductCreate',
    component: ProductFormView,
    meta: { requiresManageProducts: true },
  },
  {
    path: 'products/:id/edit',
    name: 'ProductEdit',
    component: ProductFormView,
    meta: { requiresManageProducts: true },
  },
];
