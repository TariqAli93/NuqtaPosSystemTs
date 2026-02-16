import { Command } from 'commander';
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
} from '@nuqtaplus/data';

import {
  CreateCategoryUseCase,
  CreateProductUseCase,
  CreateCustomerUseCase,
  CreateSaleUseCase,
  AddPaymentUseCase,
  CreateUserUseCase,
} from '@nuqtaplus/core';

import {
  PRESETS,
  PRESET_MENU,
  type PresetKey,
  type Preset,
  type PresetProduct,
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

  const createCategoryUseCase = new CreateCategoryUseCase(categoryRepo);
  const createProductUseCase = new CreateProductUseCase(productRepo);
  const createCustomerUseCase = new CreateCustomerUseCase(customerRepo);
  const createSaleUseCase = new CreateSaleUseCase(
    saleRepo,
    productRepo,
    customerRepo,
    settingsRepo,
    paymentRepo,
    auditRepo
  );
  const addPaymentUseCase = new AddPaymentUseCase(saleRepo, paymentRepo, customerRepo);
  const createUserUseCase = new CreateUserUseCase(userRepo);

  const now = new Date().toISOString();

  // ========== SETTINGS ==========
  console.log('⚙️  Setting up application settings...');
  await settingsRepo.set('default_currency', 'IQD');
  await settingsRepo.set('store_name', 'المتجر النموذجي');
  await settingsRepo.set('store_address', 'شارع الرشيد، بغداد، العراق');
  await settingsRepo.set('store_phone', '+964770123456');
  await settingsRepo.set('tax_rate', '0');
  await settingsRepo.set('receipt_footer', 'شكراً لتسوقكم معنا');
  await settingsRepo.set('low_stock_threshold', '10');

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
    const allCategories = categoryRepo.findAll();
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
    const { items: allProducts } = productRepo.findAll();
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
    const counters: SeedCounters = { categories: 0, products: 0, customers: 0, sales: 0 };

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
    const productMap: Record<string, { id?: number; sellingPrice: number }> = {};
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
      productMap[prod.sku] = { id: created.id, sellingPrice: created.sellingPrice };
      counters.products++;
    }

    // --- Customers ---
    const customerIds: number[] = [];
    if (preset.customers.length > 0) {
      console.log('  👤 Customers...');
      for (let i = 0; i < preset.customers.length; i++) {
        const cust = preset.customers[i];
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
      for (let i = 0; i < preset.sales.length; i++) {
        const saleDef = preset.sales[i];
        const customerId = customerIds[saleDef.customerRef] ?? customerIds[0];

        // Build items array
        const items: { productId: number; quantity: number; unitPrice: number }[] = [];
        let skipSale = false;
        for (const itemDef of saleDef.items) {
          const prod = productMap[itemDef.productRef];
          if (!prod || !prod.id) {
            console.warn(`    ⚠ Product SKU '${itemDef.productRef}' not found, skipping sale.`);
            skipSale = true;
            break;
          }
          items.push({
            productId: prod.id,
            quantity: itemDef.quantity,
            unitPrice: prod.sellingPrice,
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
              notes: saleDef.notes,
              interestRate: saleDef.interestRate,
              installmentCount: saleDef.installmentCount,
            },
            pickCreator(i).id!
          );

          // Add a follow-up payment for mixed sales with partial payment (sale index 1 and 8 in supermarket)
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
                notes: 'دفعة جزئية',
              },
              pickCreator(i).id!
            );
          }

          counters.sales++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`    ⚠ Could not create sale #${i + 1}: ${msg}`);
        }
      }
    }

    return counters;
  }

  // ========== RUN SELECTED PRESETS ==========
  const totalCounters: SeedCounters = { categories: 0, products: 0, customers: 0, sales: 0 };

  for (const key of selectedKeys) {
    const c = await seedPreset(key);
    totalCounters.categories += c.categories;
    totalCounters.products += c.products;
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
  console.log(`   • ${totalCounters.products} products (IQD pricing, includes low/out-of-stock)`);
  console.log(`   • ${totalCounters.customers} customers`);
  console.log(`   • ${totalCounters.sales} sales (cash, credit, mixed, installments)`);
  console.log('');
  console.log('🔑 Test credentials:');
  console.log('   Admin:    admin / Admin@123');
  console.log('   Manager:  manager / Manager@123');
  console.log('   Cashier:  cashier / Cashier@123');
  console.log('   Cashier2: cashier2 / Cashier@123');
  console.log('   Viewer:   viewer / Viewer@123');
};

export { initializeDatabase };
