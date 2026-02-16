import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { createDb } from '@nuqtaplus/data';
import { registerProductHandlers } from '../ipc/ProductHandler';
import { registerSaleHandlers } from '../ipc/SaleHandler';
import { registerAuthHandlers } from '../ipc/AuthHandler';
import { registerDashboardHandlers } from '../ipc/DashboardHandler';
import { registerCustomerHandlers } from '../ipc/CustomerHandler';
import { registerCategoryHandlers } from '../ipc/CategoryHandler';
import { registerUserHandlers } from '../ipc/UserHandler';
import { registerSettingsHandlers } from '../ipc/SettingsHandler';
import { registerAuditHandlers } from '../ipc/AuditHandler';
import { registerBackupHandlers } from '../ipc/BackupHandler';
import { registerUpdateHandlers } from '../ipc/UpdateHandler';
import { registerPrinterHandlers } from '../ipc/PrinterHandler';
import { registerPosHandlers } from '../ipc/PosHandler';
import { UpdateService } from '../services/UpdateService.js';
import { applyMigrations } from '../services/MigrationService.js';

app.setAppUserModelId('com.nuqta.nuqtaplus');
app.setPath('userData', path.join(app.getPath('appData'), 'CodelNuqtaPlus'));
app.setName('CodelNuqtaPlus');

// Default DB path (same as Electron main process)
const defaultDbPath = path.join(app.getPath('userData'), 'Databases', 'nuqta_plus.db');

const dbPath = defaultDbPath;

function validateDatabase(): void {
  try {
    const fs = require('fs');
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // If DB file doesn't exist yet, it will be created on first connection
    if (!fs.existsSync(dbPath)) {
      console.log('[DB] Database file not found. Will be created on first connection.');
      return;
    }

    // Open DB and run integrity check
    const tempDb = require('better-sqlite3')(dbPath);
    try {
      const result = tempDb.prepare('PRAGMA integrity_check;').all() as Array<{
        integrity_check: string;
      }>;

      // Check if integrity_check returned 'ok'
      if (Array.isArray(result) && result.length > 0) {
        const check = result[0];
        if (check.integrity_check && check.integrity_check !== 'ok') {
          console.error('[DB CORRUPTION DETECTED]:', check.integrity_check);
          throw new Error('Database integrity check failed');
        }
      }

      console.log('[DB] Integrity check passed.');
    } finally {
      tempDb.close();
    }
  } catch (error: any) {
    // Log the actual error for debugging
    console.error('[DB ERROR]:', error.message || String(error));

    // Show safe error to user (no stack trace leak)
    const message =
      'Database initialization failed. ' +
      'Please restore from a recent backup or reinstall the application.';

    console.error('[FATAL]', message);

    // Schedule error dialog after app is ready
    app.whenReady().then(() => {
      dialog.showErrorBox('Database Error', message);
      app.quit();
    });

    // Fail fast
    process.exit(1);
  }
}

// Validate DB before anything else runs
validateDatabase();

const db = createDb(dbPath);

// Apply migrations to create tables
try {
  applyMigrations(db);
} catch (error: any) {
  console.error('[FATAL] Migration failed:', error.message);
  app.whenReady().then(() => {
    dialog.showErrorBox(
      'Database Initialization Failed',
      'Failed to initialize database tables. Please reinstall the application.'
    );
    app.quit();
  });
  process.exit(1);
}

const isDev = process.env.NODE_ENV !== 'production';

// Initialize Update Service
const updateService = new UpdateService();
let win: BrowserWindow | null = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 1200,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In development, load from the UI Vite dev server
  // In production, load from built files
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV !== 'production') {
    win.loadURL('http://localhost:5173');
  } else {
    // Load local file in prod
    win.loadFile(path.join(__dirname, '../../ui/dist/index.html'));
  }

  if (isDev) win.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Register IPC Handlers
  registerProductHandlers(db);
  registerSaleHandlers(db);
  registerAuthHandlers(db);
  registerDashboardHandlers(db);
  registerCustomerHandlers(db);
  registerCategoryHandlers(db);
  registerUserHandlers(db);
  registerSettingsHandlers(db);
  registerAuditHandlers(db);
  registerBackupHandlers(db);
  registerUpdateHandlers(updateService);
  registerPrinterHandlers();
  registerPosHandlers(db);

  // Initialize auto-update
  updateService.initialize();

  createWindow();

  // initializeDatabase(dbPath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Cleanup update service
  updateService.dispose();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// apps/electron/src/main/index.ts (early)
process.on('uncaughtException', (err) => {
  console.error('[MainUncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[MainUnhandledRejection]', reason);
});
