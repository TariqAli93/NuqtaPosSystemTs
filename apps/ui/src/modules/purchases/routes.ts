import type { RouteRecordRaw } from 'vue-router';
import PurchasesListView from '../../views/purchases/PurchasesListView.vue';
import PurchaseFormView from '../../views/purchases/PurchaseFormView.vue';
import PurchaseDetailsView from '../../views/purchases/PurchaseDetailsView.vue';

export const purchasesRoutes: RouteRecordRaw[] = [
  {
    path: 'purchases',
    name: 'Purchases',
    component: PurchasesListView,
    meta: { requiresPurchasing: true },
  },
  {
    path: 'purchases/new',
    name: 'PurchaseCreate',
    component: PurchaseFormView,
    meta: { requiresManagePurchases: true, requiresPurchasing: true },
  },
  {
    path: 'purchases/:id',
    name: 'PurchaseDetails',
    component: PurchaseDetailsView,
    meta: { requiresPurchasing: true },
  },
];
