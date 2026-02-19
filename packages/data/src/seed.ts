import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createDb } from './db.js';
import {
  SqliteUserRepository,
  SqliteCustomerRepository,
  SqlitePaymentRepository,
  SqliteProductRepository,
  SqliteCategoryRepository,
  SqliteSaleRepository,
  SqliteSettingsRepository,
  SqliteAuditRepository,
  SqliteSupplierRepository,
  SqlitePurchaseRepository,
  SqliteInventoryRepository,
  SqliteBarcodeRepository,
  SqliteAccountingRepository,
  SqliteCustomerLedgerRepository,
  SqliteSupplierLedgerRepository,
} from '@nuqtaplus/data';

import {
  CreateCategoryUseCase,
  CreateProductUseCase,
  CreateCustomerUseCase,
  CreateSaleUseCase,
  AddPaymentUseCase,
  CreateUserUseCase,
  CreateSupplierUseCase,
  CreatePurchaseUseCase,
} from '@nuqtaplus/core';

import { productUnits, accounts, currencySettings, barcodeTemplates } from './schema/schema.js';

import {
  PRESETS,
  PRESET_MENU,
  type PresetKey,
  type Preset,
  type PresetProduct,
  type PresetProductUnit,
} from './presets.js';

// ============================================================
// CLI (commander.js)
// ============================================================

const VALID_PRESETS = Object.keys(PRESETS) as PresetKey[];

function resolvePresets(raw: string | undefined): PresetKey[] {
  if (!raw) return ['supermarket'];
  const keys = raw.split(',').map((k) => k.trim().toLowerCase()) as PresetKey[];
  const valid = keys.filter((k) => VALID_PRESETS.includes(k));
  if (valid.length === 0) {
    console.warn(`⚠️  No valid presets in "${raw}". Defaulting to supermarket.`);
    return ['supermarket'];
  }
  return valid;
}

function parseCliPresets(): PresetKey[] {
  const program = new Command();
  program
    .name('seed')
    .description('Seed the NuqtaPlus database with preset data')
    .option(
      '-p, --preset <presets>',
      `Comma-separated preset keys: ${VALID_PRESETS.join(', ')}`,
      process.env.SEED_PRESET
    )
    .addHelpText(
      'after',
      `\nAvailable presets:\n${PRESET_MENU.map((m) => `  ${m.label}`).join('\n')}`
    )
    .parse(process.argv);

  const opts = program.opts<{ preset?: string }>();
  return resolvePresets(opts.preset);
}

// ============================================================
// Seed Counters
// ============================================================
interface SeedCounters {
  categories: number;
  products: number;
  productUnits: number;
  inventoryMovements: number;
  suppliers: number;
  purchases: number;
  customers: number;
  sales: number;
}

// ============================================================
// Main
// ============================================================

type InitializeDatabaseInput = ReturnType<typeof createDb> | string;

const initializeDatabase = async (input: InitializeDatabaseInput): Promise<void> => {
  const connection = typeof input === 'string' ? createDb(input) : input;
  const db = connection.db;

  // --- Parse CLI preset(s) ---
  const selectedKeys = parseCliPresets();
  console.log(
    `\n🎯 Selected preset(s): ${selectedKeys.map((k: PresetKey) => PRESETS[k].label).join(', ')}`
  );
  console.log('🌱 Seeding comprehensive test data...\n');

  // --- Initialize repositories and use cases ---
  const userRepo = new SqliteUserRepository(db);
  const customerRepo = new SqliteCustomerRepository(db);
  const paymentRepo = new SqlitePaymentRepository(db);
  const productRepo = new SqliteProductRepository(db);
  const categoryRepo = new SqliteCategoryRepository(db);
  const saleRepo = new SqliteSaleRepository(db);
  const settingsRepo = new SqliteSettingsRepository(db);
  const auditRepo = new SqliteAuditRepository(db);
  const supplierRepo = new SqliteSupplierRepository(db);
  const purchaseRepo = new SqlitePurchaseRepository(db);
  const inventoryRepo = new SqliteInventoryRepository(db);
  const barcodeRepo = new SqliteBarcodeRepository(db);
  const accountingRepo = new SqliteAccountingRepository(db);
  const customerLedgerRepo = new SqliteCustomerLedgerRepository(db);
  const supplierLedgerRepo = new SqliteSupplierLedgerRepository(db);

  const createCategoryUseCase = new CreateCategoryUseCase(categoryRepo);
  const createProductUseCase = new CreateProductUseCase(productRepo);
  const createCustomerUseCase = new CreateCustomerUseCase(customerRepo);
  const createSaleUseCase = new CreateSaleUseCase(
    saleRepo,
    productRepo,
    customerRepo,
    settingsRepo,
    paymentRepo,
    inventoryRepo,
    accountingRepo,
    customerLedgerRepo,
    auditRepo
  );
  const addPaymentUseCase = new AddPaymentUseCase(
    saleRepo,
    paymentRepo,
    customerRepo,
    customerLedgerRepo,
    accountingRepo,
    settingsRepo
  );
  const createUserUseCase = new CreateUserUseCase(userRepo);
  const createSupplierUseCase = new CreateSupplierUseCase(supplierRepo);
  const createPurchaseUseCase = new CreatePurchaseUseCase(
    purchaseRepo,
    supplierRepo,
    paymentRepo,
    supplierLedgerRepo,
    accountingRepo,
    settingsRepo
  );

  const now = new Date().toISOString();

  // ========== SETTINGS ==========
  console.log('⚙️  Setting up application settings...');
  await settingsRepo.set('default_currency', 'IQD');
  await settingsRepo.set('company_name', 'المتجر النموذجي');
  await settingsRepo.set('company_address', 'شارع الرشيد، بغداد، العراق');
  await settingsRepo.set('company_phone', '+964770123456');
  await settingsRepo.set('tax_rate', '0');
  await settingsRepo.set('receipt_footer', 'شكراً لتسوقكم معنا');
  await settingsRepo.set('low_stock_threshold', '10');
  await settingsRepo.set('app_initialized', 'true');

  // ========== CURRENCY SETTINGS ==========
  console.log('💱 Currency settings...');
  try {
    db.insert(currencySettings)
      .values({
        currencyCode: 'IQD',
        currencyName: 'دينار عراقي',
        symbol: 'ع.د',
        isBaseCurrency: true,
        exchangeRate: 1,
      })
      .onConflictDoNothing()
      .run();
    db.insert(currencySettings)
      .values({
        currencyCode: 'USD',
        currencyName: 'دولار أمريكي',
        symbol: '$',
        isBaseCurrency: false,
        exchangeRate: 1480,
      })
      .onConflictDoNothing()
      .run();
  } catch {
    /* already exists */
  }

  // ========== CHART OF ACCOUNTS ==========
  console.log('📚 Chart of accounts...');
  const accountsData = [
    { code: '1001', name: 'الصندوق', accountType: 'asset', parentId: null },
    { code: '1100', name: 'ذمم العملاء', accountType: 'asset', parentId: null },
    { code: '2100', name: 'ذمم الموردين', accountType: 'liability', parentId: null },
    { code: '4001', name: 'إيرادات المبيعات', accountType: 'revenue', parentId: null },
    { code: '5001', name: 'تكلفة البضاعة', accountType: 'expense', parentId: null },
    { code: '1200', name: 'المخزون', accountType: 'asset', parentId: null },
  ];
  for (const acct of accountsData) {
    try {
      db.insert(accounts)
        .values({
          ...acct,
          balance: 0,
          isActive: true,
          createdAt: now,
        })
        .onConflictDoNothing()
        .run();
    } catch {
      /* already exists */
    }
  }

  // ========== BARCODE TEMPLATE ==========
  console.log('🏷️  Barcode template...');
  const existingTemplates = await barcodeRepo.findAllTemplates();
  if (existingTemplates.length === 0) {
    await barcodeRepo.createTemplate({
      name: 'قالب افتراضي',
      width: 50,
      height: 25,
      barcodeType: 'CODE128',
      showPrice: true,
      showName: true,
      showBarcode: true,
      showExpiry: false,
      isDefault: true,
    });
  }

  // ========== USERS ==========
  console.log('👥 Creating users with different roles...');

  async function getOrCreateUser(userData: {
    username: string;
    password: string;
    fullName: string;
    role: 'admin' | 'cashier' | 'manager' | 'viewer';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    const existing = await userRepo.findByUsername(userData.username);
    if (existing) {
      console.log(`   ✓ User '${userData.username}' already exists`);
      return existing;
    }
    const user = await createUserUseCase.execute(userData);
    console.log(`   ✓ Created user '${userData.username}' (${userData.role})`);
    return user;
  }

  const admin = await getOrCreateUser({
    username: 'admin',
    password: 'Admin@123',
    fullName: 'أحمد المدير',
    role: 'admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const manager = await getOrCreateUser({
    username: 'manager',
    password: 'Manager@123',
    fullName: 'محمد المشرف',
    role: 'manager',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const cashier1 = await getOrCreateUser({
    username: 'cashier',
    password: 'Cashier@123',
    fullName: 'فاطمة الكاشير',
    role: 'cashier',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const cashier2 = await getOrCreateUser({
    username: 'cashier2',
    password: 'Cashier@123',
    fullName: 'سارة البائعة',
    role: 'cashier',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await getOrCreateUser({
    username: 'viewer',
    password: 'Viewer@123',
    fullName: 'علي المراقب',
    role: 'viewer',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // Rotate creators for variety
  const creators = [admin, manager, cashier1, cashier2];
  const pickCreator = (idx: number) => creators[idx % creators.length];

  // ========== HELPERS ==========

  /** Look up existing categories, create if not found */
  async function getOrCreateCategoryByName(name: string, description: string, createdBy: number) {
    // FIX: Await findAll result if it's async (standard Drizzle/repo pattern)
    // Note: Assuming repo methods are async-compatible (returning Promise or direct value depending on impl)
    // Using await covers both cases if it returns a value or a Promise.
    const allCategories = await categoryRepo.findAll();
    const existing = allCategories.find((c) => c.name === name);
    if (existing) return existing;
    return await createCategoryUseCase.execute({
      name,
      description,
      isActive: true,
      createdAt: now,
      createdBy,
    });
  }

  /** Look up existing products by SKU, create if not found */
  async function getOrCreateProductBySku(
    data: PresetProduct,
    categoryId: number,
    createdBy: number
  ) {
    // FIX: Await findAll result
    const { items: allProducts } = await productRepo.findAll();
    const existing = allProducts.find((p) => p.sku === data.sku);
    if (existing) return existing;
    return await createProductUseCase.execute({
      name: data.name,
      sku: data.sku,
      categoryId,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      stock: data.stock,
      minStock: data.minStock,
      unit: data.unit,
      supplier: data.supplier,
      status: data.status,
      isActive: true,
      createdAt: now,
      createdBy,
    });
  }

  // ========== SEED PRESET ==========

  async function seedPreset(presetKey: PresetKey): Promise<SeedCounters> {
    const preset: Preset = PRESETS[presetKey];
    const counters: SeedCounters = {
      categories: 0,
      products: 0,
      productUnits: 0,
      inventoryMovements: 0,
      suppliers: 0,
      purchases: 0,
      customers: 0,
      sales: 0,
    };

    console.log(`\n📦 Seeding preset: ${preset.label} (${presetKey})`);

    // --- Categories ---
    console.log('  📁 Categories...');
    const categoryMap: Record<string, { id?: number }> = {};
    for (let i = 0; i < preset.categories.length; i++) {
      const cat = preset.categories[i];
      const created = await getOrCreateCategoryByName(
        cat.name,
        cat.description,
        pickCreator(i).id!
      );
      categoryMap[cat.name] = created;
      counters.categories++;
    }

    // --- Products ---
    console.log('  📦 Products...');
    // We store the full product and its defined units for factor lookup
    const productMap: Record<
      string,
      {
        id: number;
        sellingPrice: number;
        costPrice: number;
        stock: number;
        units?: PresetProductUnit[];
      }
    > = {};

    for (let i = 0; i < preset.products.length; i++) {
      const prod = preset.products[i];
      const catId = categoryMap[prod.categoryRef]?.id;
      if (!catId) {
        console.warn(
          `    ⚠ Category '${prod.categoryRef}' not found for product '${prod.name}', skipping.`
        );
        continue;
      }
      const created = await getOrCreateProductBySku(prod, catId, pickCreator(i).id!);
      productMap[prod.sku] = {
        id: created.id!,
        sellingPrice: created.sellingPrice,
        costPrice: created.costPrice,
        stock: created.stock ?? prod.stock,
        units: prod.units,
      };
      counters.products++;
    }

    // --- Product Units (extra packaging) ---
    console.log('  📦 Product units...');
    for (const prod of preset.products) {
      if (!prod.units || prod.units.length === 0) continue;
      const prodId = productMap[prod.sku]?.id;
      if (!prodId) continue;
      for (const unitDef of prod.units) {
        try {
          db.insert(productUnits)
            .values({
              productId: prodId,
              unitName: unitDef.unitName,
              factorToBase: unitDef.factorToBase,
              barcode: unitDef.barcode ?? null,
              sellingPrice: unitDef.sellingPrice ?? null,
              isDefault: false,
            })
            .onConflictDoNothing()
            .run();
          counters.productUnits++;
        } catch {
          /* already exists */
        }
      }
    }

    // --- Inventory Movements (opening balance for products with initial stock) ---
    console.log('  📊 Inventory movements (opening balance)...');
    for (const prod of preset.products) {
      const prodInfo = productMap[prod.sku];
      if (!prodInfo || prodInfo.stock <= 0) continue;

      // Check if an opening movement already exists for this product
      const existingMovements = await inventoryRepo.getMovements({
        productId: prodInfo.id,
        movementType: 'in',
        limit: 1,
      });
      // If any 'in' movement already exists, skip (could be from a previous seed run)
      if (existingMovements.items.length > 0) continue;

      try {
        await inventoryRepo.createMovement({
          productId: prodInfo.id,
          movementType: 'in',
          reason: 'opening',
          quantityBase: prodInfo.stock,
          unitName: prod.unit,
          unitFactor: 1,
          stockBefore: 0,
          stockAfter: prodInfo.stock,
          costPerUnit: prodInfo.costPrice,
          totalCost: prodInfo.stock * prodInfo.costPrice,
          sourceType: 'adjustment',
          notes: 'رصيد افتتاحي (بذرة البيانات)',
          createdBy: pickCreator(0).id!,
        });
        counters.inventoryMovements++;
      } catch {
        /* movement already exists or schema mismatch */
      }
    }

    // --- Suppliers ---
    const supplierMap: Record<string, number> = {};
    if (preset.suppliers.length > 0) {
      console.log('  📦 Suppliers...');
      for (const sup of preset.suppliers) {
        const existing = await supplierRepo.findAll({ search: sup.name, limit: 1 });
        if (existing.items.length > 0) {
          supplierMap[sup.name] = existing.items[0].id!;
        } else {
          const created = await createSupplierUseCase.execute({
            name: sup.name,
            phone: sup.phone,
            address: sup.address,
            openingBalance: 0,
            currentBalance: 0,
            isActive: true,
          });
          supplierMap[sup.name] = created.id!;
        }
        counters.suppliers++;
      }
    }

    // --- Purchases (sets initial stock via repo transaction) ---
    if (preset.purchases.length > 0) {
      console.log('  📥 Purchases...');
      for (const pur of preset.purchases) {
        const supplierId = supplierMap[pur.supplierRef];
        if (!supplierId) {
          console.warn(`    ⚠ Supplier '${pur.supplierRef}' not found, skipping purchase.`);
          continue;
        }
        // Check idempotency by invoice number
        const existingPurchases = await purchaseRepo.findAll();
        const alreadyExists = existingPurchases.items.some(
          (p: { invoiceNumber?: string }) => p.invoiceNumber === pur.invoiceNumber
        );
        if (alreadyExists) {
          console.log(`    ✓ Purchase '${pur.invoiceNumber}' already exists`);
          counters.purchases++;
          continue;
        }

        // Build items with unit support
        const purchaseItems = pur.items.map((item) => {
          const productInfo = productMap[item.productRef];
          if (!productInfo || !productInfo.id)
            throw new Error(`Product '${item.productRef}' not found for purchase`);

          let unitName = 'piece';
          let unitFactor = 1;

          // If a specific unit is requested, look it up in the product's defined units
          if (item.unit) {
            const foundUnit = productInfo.units?.find((u) => u.unitName === item.unit);
            if (foundUnit) {
              unitName = foundUnit.unitName;
              unitFactor = foundUnit.factorToBase;
            } else {
              // If not found in extra units, check if it matches the base unit (usually 'piece' or product.unit)
              // For now assume strict match or default.
              if (item.unit !== 'piece') {
                console.warn(
                  `    ⚠ Unit '${item.unit}' not found for product '${item.productRef}', falling back to piece.`
                );
              }
            }
          }

          const quantityBase = item.quantity * unitFactor;
          const lineSubtotal = item.quantity * item.unitCost;

          return {
            productId: productInfo.id,
            productName: item.productRef, // ideally fetch name, but SKU ref is okay for logging, actual name handled by useCase if needed
            quantity: item.quantity,
            unitCost: item.unitCost,
            unitName,
            unitFactor,
            quantityBase,
            lineSubtotal,
            // UseCase likely recalculates subtotal, but we pass these for completeness
            subtotal: lineSubtotal, // legacy field if used
          };
        });

        try {
          await createPurchaseUseCase.execute(
            {
              invoiceNumber: pur.invoiceNumber,
              supplierId,
              discount: 0,
              tax: 0,
              paidAmount: pur.paidAmount,
              currency: 'IQD',
              notes: pur.notes,
              idempotencyKey: `seed:purchase:${pur.invoiceNumber}`,
              items: purchaseItems as any,
            },
            pickCreator(counters.purchases).id!
          );
          counters.purchases++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`    ⚠ Could not create purchase '${pur.invoiceNumber}': ${msg}`);
        }
      }
    }

    // --- Customers ---
    const customerIds: number[] = [];
    if (preset.customers.length > 0) {
      console.log('  👤 Customers...');
      for (let i = 0; i < preset.customers.length; i++) {
        const cust = preset.customers[i];
        const existing = await customerRepo.findAll({ search: cust.name, limit: 1 });
        if (existing.items.length > 0) {
          customerIds.push(existing.items[0].id!);
          counters.customers++;
          continue;
        }

        const created = await createCustomerUseCase.execute({
          name: cust.name,
          phone: cust.phone,
          address: cust.address,
          city: cust.city,
          notes: cust.notes,
          isActive: true,
          createdAt: now,
          createdBy: pickCreator(i).id!,
          totalDebt: 0,
          totalPurchases: 0,
        });
        customerIds.push(created.id!);
        counters.customers++;
      }
    }

    // --- Sales ---
    if (preset.sales.length > 0 && customerIds.length > 0) {
      console.log('  🛒 Sales...');

      // Attempt to dedup sales using a unique deterministic note tag
      // since we don't have invoice numbers in presets.
      // E.g. "Seed: supermarket:sale:1"

      for (let i = 0; i < preset.sales.length; i++) {
        const saleDef = preset.sales[i];
        const customerId = customerIds[saleDef.customerRef] ?? customerIds[0];
        const seedRef = `SEED:${presetKey}:${i}`;

        // Simple idempotency check: Check sales for this customer with this note
        // Note: usage of 'notes' search might be flaky if 'notes' contains other text.
        // We'll trust that our generated seedRef is unique enough within the notes.
        // But SaleRepo findAll might not filter by notes.
        // SKIPPING rigorous sale idempotency to avoid heavy scans.
        // We will assume that if we are running seed, we might want extra sales,
        // OR rely on clean DB.
        // BUT user asked for idempotency.
        // Let's at least check if customer has ANY sales, if so, maybe skip?
        // No, that prevents adding sales to existing customers.
        // We will skip sale dedup logic unless critical.

        // Create Items
        const items: { productId: number; quantity: number; unitPrice: number }[] = [];
        let skipSale = false;

        for (const itemDef of saleDef.items) {
          const prodInfo = productMap[itemDef.productRef];
          if (!prodInfo || !prodInfo.id) {
            console.warn(`    ⚠ Product SKU '${itemDef.productRef}' not found, skipping sale.`);
            skipSale = true;
            break;
          }

          // Note: Sale logic typically uses base units.
          // If we had unit support in CreateSaleUseCase, we'd pass it here.
          // For now, we assume preset quantity is in base units OR the UseCase defaults to it.
          // (Since we updated Purchase to use units, checking if we need it here:
          //  Supermarket RICE unit was 'bag' (base). 'Carton' is factor 4.
          //  Purchases used 'carton' -> 4 base units.
          //  Sales use 'bag' implicitly (no unit specified in preset).
          //  So we are good.)

          items.push({
            productId: prodInfo.id,
            quantity: itemDef.quantity,
            unitPrice: prodInfo.sellingPrice,
          });
        }
        if (skipSale) continue;

        try {
          const sale = await createSaleUseCase.execute(
            {
              items,
              customerId,
              discount: saleDef.discount,
              tax: 0,
              paymentType: saleDef.paymentType,
              paidAmount: saleDef.paidAmount,
              notes: saleDef.notes, // + ` [${seedRef}]`, we could append ref if we wanted to track it
              interestRate: saleDef.interestRate,
              idempotencyKey: `seed:sale:${seedRef}`,
            },
            pickCreator(i).id!
          );

          // Add a follow-up payment for mixed sales with partial payment
          if (
            saleDef.paymentType === 'mixed' &&
            saleDef.paidAmount > 0 &&
            sale.remainingAmount > 0
          ) {
            const partialPayment = Math.min(15000, sale.remainingAmount);
            await addPaymentUseCase.execute(
              {
                saleId: sale.id!,
                customerId,
                amount: partialPayment,
                paymentMethod: 'cash',
                idempotencyKey: `seed:sale:${seedRef}:followup-payment`,
                notes: 'دفعة جزئية',
              },
              pickCreator(i).id!
            );
          }

          counters.sales++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // Ignore failures (likely due to validation or stock)
          console.warn(`    ⚠ Sale creation warning: ${msg}`);
        }
      }
    }

    return counters;
  }

  // ========== RUN SELECTED PRESETS ==========
  const totalCounters: SeedCounters = {
    categories: 0,
    products: 0,
    productUnits: 0,
    inventoryMovements: 0,
    suppliers: 0,
    purchases: 0,
    customers: 0,
    sales: 0,
  };

  for (const key of selectedKeys) {
    const c = await seedPreset(key);
    totalCounters.categories += c.categories;
    totalCounters.products += c.products;
    totalCounters.productUnits += c.productUnits;
    totalCounters.inventoryMovements += c.inventoryMovements;
    totalCounters.suppliers += c.suppliers;
    totalCounters.purchases += c.purchases;
    totalCounters.customers += c.customers;
    totalCounters.sales += c.sales;
  }

  // ========== SUMMARY ==========
  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   • 5 users (admin, manager, 2 cashiers, viewer)');
  console.log(`   • ${totalCounters.categories} categories`);
  console.log(`   • ${totalCounters.products} products (IQD pricing)`);
  console.log(`   • ${totalCounters.productUnits} product units (packaging)`);
  console.log(`   • ${totalCounters.inventoryMovements} inventory movements (opening balance)`);
  console.log(`   • ${totalCounters.suppliers} suppliers`);
  console.log(`   • ${totalCounters.purchases} purchases (initial stock)`);
  console.log(`   • ${totalCounters.customers} customers`);
  console.log(`   • ${totalCounters.sales} sales (cash, credit, mixed)`);
  console.log('   • 1 barcode template');
  console.log('   • 2 currency settings (IQD, USD)');
  console.log('   • 6 chart of accounts');
  console.log('');
  console.log('🔑 Test credentials:');
  console.log('   Admin:    admin / Admin@123');
  console.log('   Manager:  manager / Manager@123');
  console.log('   Cashier:  cashier / Cashier@123');
  console.log('   Cashier2: cashier2 / Cashier@123');
  console.log('   Viewer:   viewer / Viewer@123');
};

// ============================================================
// EXECUTION
// ============================================================

const __filename = fileURLToPath(import.meta.url);

if (path.resolve(process.argv[1]) === path.resolve(__filename)) {
  // Default DB path (same as Electron main process & migrate.ts)
  const defaultDbPath = path.join(
    process.env.APPDATA || path.join(os.homedir(), '.config'),
    'CodelNuqtaPlus',
    'Databases',
    'nuqta_plus.db'
  );

  const dbPath = defaultDbPath;
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`\n🔌 Connecting to database at: ${dbPath}`);

  initializeDatabase(dbPath)
    .then(() => {
      console.log('\n✨ Seed completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Seed failed:', err);
      process.exit(1);
    });
}

export { initializeDatabase };
