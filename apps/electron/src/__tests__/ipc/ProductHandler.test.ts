import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, TestContext } from '../test-harness';
import { registerProductHandlers } from '../../ipc/ProductHandler';
import { ipcMain } from 'electron';

// Mock electron ipcMain
vi.mock('electron', () => {
  const handlers = new Map();
  return {
    ipcMain: {
      handle: (channel: string, listener: any) => {
        handlers.set(channel, listener);
      },
      // Helper to invoke for testing
      _invoke: async (channel: string, ...args: any[]) => {
        const handler = handlers.get(channel);
        if (!handler) throw new Error(`No handler for ${channel}`);
        // event is first arg
        return handler({}, ...args);
      },
    },
  };
});

describe('Product IPC Handlers', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestDb();
    // Register handlers with test DB
    // We need to cast our db object to DatabaseType which expects { db, sqlite }
    // My harness returns exactly that via ctx
    registerProductHandlers({ db: ctx.db, sqlite: ctx.sqlite } as any);
  });

  afterEach(() => {
    ctx.cleanup();
    vi.clearAllMocks();
  });

  it('products:create should create a product', async () => {
    // Invoke the mocked handler
    // products:create expects (event, params, userId, role) ?? check handler signature
    // ProductHandler: validateCreateProductPayload(params)
    // Actually ipcMain.handle receives (event, ...args).
    // I need to check how ProductHandler defines args.

    // Assuming simple payload for now based on UseCase
    const payload = {
      data: {
        name: 'IPC Product',
        costPrice: 50,
        sellingPrice: 100,
        stock: 10,
        minStock: 2,
        sku: 'IPC-001',
        categoryId: 1, // Optional?
        currency: 'USD',
      },
    };

    const result = await (ipcMain as any)._invoke('products:create', payload);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
    expect(result.data.name).toBe('IPC Product');
  });
});
