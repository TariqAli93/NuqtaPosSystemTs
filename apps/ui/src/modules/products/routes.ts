import type { RouteRecordRaw } from 'vue-router';
import ProductWorkspaceView from '../../views/products/ProductWorkspaceView.vue';
import BarcodeTemplateBuilderView from '../../views/products/BarcodeTemplateBuilderView.vue';

export const productsRoutes: RouteRecordRaw[] = [
  {
    path: 'products',
    name: 'ProductWorkspace',
    component: ProductWorkspaceView,
    meta: {},
  },
  {
    path: 'products/barcode-templates',
    name: 'BarcodeTemplateBuilder',
    component: BarcodeTemplateBuilderView,
    meta: { requiresManageProducts: true },
  },
  {
    path: 'products/new',
    name: 'ProductCreate',
    redirect: (to) => ({
      name: 'ProductWorkspace',
      query: { ...to.query, action: 'create' },
    }),
    meta: { requiresManageProducts: true, enableBarcode: 'product' },
  },
  {
    path: 'products/:id',
    name: 'ProductDetail',
    redirect: (to) => ({
      name: 'ProductWorkspace',
      query: { ...to.query, productId: String(to.params.id) },
    }),
    meta: {},
  },
  {
    path: 'products/:id/edit',
    name: 'ProductEdit',
    redirect: (to) => ({
      name: 'ProductWorkspace',
      query: { ...to.query, productId: String(to.params.id), action: 'edit' },
    }),
    meta: { requiresManageProducts: true, enableBarcode: 'product' },
  },
  {
    path: 'products/:id/barcode',
    name: 'BarcodePrint',
    redirect: (to) => ({
      name: 'ProductWorkspace',
      query: { ...to.query, productId: String(to.params.id), tab: 'units', action: 'barcode' },
    }),
    meta: { requiresManageProducts: true },
  },
];
