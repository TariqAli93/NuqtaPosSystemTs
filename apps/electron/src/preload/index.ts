import { contextBridge, ipcRenderer } from 'electron';

/**
 * PHASE 9 HARDENING: Explicit allowlist of valid IPC channels.
 * Only these channels are permitted; all others are rejected.
 *
 * This prevents malicious code from accessing arbitrary IPC channels.
 */
const ALLOWED_CHANNELS = new Set([
  // Products
  'products:getAll',
  'products:getById',
  'products:findByBarcode',
  'products:create',
  'products:update',
  'products:delete',
  'products:adjustStock',
  'products:getPurchaseHistory',
  'products:getSalesHistory',
  'products:getUnits',
  'products:createUnit',
  'products:updateUnit',
  'products:deleteUnit',
  'products:setDefaultUnit',
  'products:getBatches',
  'products:createBatch',

  // Sales
  'sales:create',
  'sales:getAll',
  'sales:getById',
  'sales:addPayment',
  'sales:cancel',
  'sales:refund',
  'sales:generateReceipt',

  // Auth
  'auth:login',
  'auth:logout',
  'auth:getCurrentUser',
  'auth:checkInitialSetup',
  'auth:createFirstUser',
  'auth:refresh',
  'auth:verifyCredentials',
  'auth:changePassword',
  'auth:validateToken',

  // Setup (first-run initialization)
  'setup:initialize',
  'setup:setAccountingEnabled',
  'setup:seedChartOfAccounts',
  'setup:getAccountingSetupStatus',

  // Dashboard
  'dashboard:getStats',

  // Customers
  'customers:getAll',
  'customers:getById',
  'customers:create',
  'customers:update',
  'customers:delete',

  // Categories
  'categories:getAll',
  'categories:getById',
  'categories:create',
  'categories:update',
  'categories:delete',

  // Users
  'users:getAll',
  'users:getById',
  'users:create',
  'users:update',
  'users:delete',

  // Settings
  'settings:get',
  'settings:set',
  'settings:getCurrency',
  'settings:update',
  'settings:getCompany',
  'settings:setCompany',
  'settings:getAppVersion',

  // Audit
  'audit:getAll',
  'audit:getById',

  // Backup
  'backup:create',
  'backup:list',
  'backup:generateToken',
  'backup:restore',
  'backup:delete',
  'backup:getStats',

  // Updates
  'update:checkForUpdates',
  'update:installUpdate',

  // Conflicts (Phase 9)
  'conflicts:getList',
  'conflicts:getDetail',
  'conflicts:resolve',
  'conflicts:getStats',

  // Printers
  'printers:getAll',
  'printers:print',

  // POS
  'pos:afterPay',

  // Suppliers
  'suppliers:getAll',
  'suppliers:getById',
  'suppliers:create',
  'suppliers:update',
  'suppliers:delete',

  // Purchases
  'purchases:getAll',
  'purchases:getById',
  'purchases:create',

  // Inventory
  'inventory:getMovements',
  'inventory:getDashboardStats',
  'inventory:getExpiryAlerts',
  'inventory:reconcileStock',

  // Customer Ledger
  'customerLedger:getLedger',
  'customerLedger:recordPayment',
  'customerLedger:addAdjustment',
  'customerLedger:reconcileDebt',

  // Barcode
  'barcode:getTemplates',
  'barcode:createTemplate',
  'barcode:deleteTemplate',
  'barcode:getPrintJobs',
  'barcode:createPrintJob',

  // Accounting
  'accounting:getAccounts',
  'accounting:getJournalEntries',
  'accounting:getEntryById',
  'accounting:getTrialBalance',
  'accounting:getProfitLoss',
  'accounting:getBalanceSheet',

  // Supplier Ledger
  'supplierLedger:getLedger',
  'supplierLedger:recordPayment',
  'supplierLedger:reconcileBalance',

  // Diagnostics — DEV ONLY (not exposed in production preload)
]);

const safeInvoke = (channel: string, data?: any) => {
  if (!ALLOWED_CHANNELS.has(channel)) {
    throw new Error(`Invalid IPC channel: "${channel}" is not permitted`);
  }
  return ipcRenderer.invoke(channel, data);
};

contextBridge.exposeInMainWorld('electron', {
  invoke: safeInvoke,
});

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => safeInvoke('printers:getAll'),
});
