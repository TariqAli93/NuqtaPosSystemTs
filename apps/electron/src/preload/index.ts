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
  'products:create',
  'products:update',
  'products:delete',
  'products:adjustStock',

  // Sales
  'sales:create',
  'sales:getAll',
  'sales:getById',
  'sales:addPayment',
  'sales:cancel',

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
