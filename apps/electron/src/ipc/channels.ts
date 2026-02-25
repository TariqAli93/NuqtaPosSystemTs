/**
 * Single source of truth for renderer IPC channels.
 *
 * Keep this list in sync with ipcMain.handle registrations.
 */
export const RENDERER_IPC_CHANNELS = [
  // Accounting
  'accounting:getAccounts',
  'accounting:getJournalEntries',
  'accounting:getEntryById',
  'accounting:getTrialBalance',
  'accounting:getProfitLoss',
  'accounting:getBalanceSheet',

  // Audit
  'audit:getTrail',
  'audit:getUserActions',
  'audit:getByDateRange',
  'audit:getByAction',
  'audit:getStatistics',
  'audit:cleanup',

  // Auth
  'auth:login',
  'auth:verifyCredentials',
  'auth:checkInitialSetup',
  'auth:createFirstUser',
  'auth:refresh',
  'auth:logout',
  'auth:changePassword',
  'auth:getCurrentUser',
  'auth:validateToken',

  // Backup
  'backup:create',
  'backup:list',
  'backup:generateToken',
  'backup:restore',
  'backup:delete',
  'backup:getStats',

  // Barcode
  'barcode:getTemplates',
  'barcode:createTemplate',
  'barcode:getPrintJobs',
  'barcode:createPrintJob',
  'barcode:deleteTemplate',

  // Categories
  'categories:getAll',
  'categories:create',
  'categories:update',
  'categories:delete',

  // Customers
  'customers:getAll',
  'customers:getById',
  'customers:create',
  'customers:update',
  'customers:delete',

  // Customer Ledger
  'customerLedger:getLedger',
  'customerLedger:recordPayment',
  'customerLedger:addAdjustment',
  'customerLedger:reconcileDebt',

  // Dashboard
  'dashboard:getStats',

  // Inventory
  'inventory:getMovements',
  'inventory:getDashboardStats',
  'inventory:getExpiryAlerts',
  'inventory:reconcileStock',

  // POS
  'pos:afterPay',

  // Posting
  'posting:postPeriod',
  'posting:getBatches',
  'posting:reverseEntry',
  'posting:reverseBatch',
  'posting:lockBatch',
  'posting:unlockBatch',
  'posting:isBatchLocked',
  'posting:postIndividualEntry',
  'posting:unpostIndividualEntry',

  // Printers
  'printers:getAll',
  'printers:print',

  // Products
  'products:getAll',
  'products:getPurchaseHistory',
  'products:getSalesHistory',
  'products:getUnits',
  'products:createUnit',
  'products:updateUnit',
  'products:deleteUnit',
  'products:setDefaultUnit',
  'products:getBatches',
  'products:createBatch',
  'products:getById',
  'products:findByBarcode',
  'products:create',
  'products:update',
  'products:delete',
  'products:adjustStock',

  // Purchases
  'purchases:create',
  'purchases:getAll',
  'purchases:getById',
  'purchases:addPayment',

  // Sales
  'sales:create',
  'sales:addPayment',
  'sales:getById',
  'sales:getAll',
  'sales:cancel',
  'sales:refund',
  'sales:generateReceipt',

  // Settings
  'settings:get',
  'settings:getTyped',
  'settings:set',
  'settings:setTyped',
  'settings:getCurrency',
  'settings:getCompany',
  'settings:setCompany',
  'settings:getAppVersion',
  'settings:getModules',
  'settings:completeWizard',
  'settings:setModuleToggle',

  // Setup
  'setup:initialize',
  'setup:setAccountingEnabled',
  'setup:seedChartOfAccounts',
  'setup:getAccountingSetupStatus',

  // Suppliers
  'suppliers:create',
  'suppliers:update',
  'suppliers:delete',
  'suppliers:getAll',
  'suppliers:getById',

  // Supplier Ledger
  'supplierLedger:getLedger',
  'supplierLedger:recordPayment',
  'supplierLedger:reconcileBalance',

  // Update

  // Users
  'users:getAll',
  'users:create',
  'users:update',
] as const;

export type RendererIpcChannel = (typeof RENDERER_IPC_CHANNELS)[number];
