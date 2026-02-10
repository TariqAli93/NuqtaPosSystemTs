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

type InitializeDatabaseInput = ReturnType<typeof createDb> | string;

const initializeDatabase = async (input: InitializeDatabaseInput): Promise<void> => {
  const connection = typeof input === 'string' ? createDb(input) : input;
  const db = connection.db;
  console.log('🌱 Seeding comprehensive test data...');

  // Initialize repositories and use cases
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

  async function getOrCreateUser(userData: any) {
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

  const viewer = await getOrCreateUser({
    username: 'viewer',
    password: 'Viewer@123',
    fullName: 'علي المراقب',
    role: 'viewer',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // ========== CATEGORIES ==========
  console.log('📁 Creating product categories...');

  const groceries = await createCategoryUseCase.execute({
    name: 'مواد غذائية',
    description: 'مواد غذائية أساسية ومستلزمات يومية',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const beverages = await createCategoryUseCase.execute({
    name: 'مشروبات',
    description: 'مشروبات باردة وساخنة',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const dairy = await createCategoryUseCase.execute({
    name: 'ألبان ومشتقاتها',
    description: 'حليب، لبن، جبن وألبان متنوعة',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const snacks = await createCategoryUseCase.execute({
    name: 'وجبات خفيفة',
    description: 'شيبس، بسكويت، شوكولاتة',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const cleaning = await createCategoryUseCase.execute({
    name: 'مواد تنظيف',
    description: 'مساحيق غسيل ومنظفات',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const personalCare = await createCategoryUseCase.execute({
    name: 'العناية الشخصية',
    description: 'صابون، شامبو ومستحضرات العناية',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  console.log(`   ✓ Created ${6} categories`);

  // ========== PRODUCTS ==========
  console.log('📦 Creating diverse product inventory...');

  // Groceries
  const rice = await createProductUseCase.execute({
    name: 'رز عنبر ممتاز 5 كغم',
    sku: 'RICE-5KG',
    categoryId: groceries.id,
    description: 'رز عنبر طويل الحبة',
    costPrice: 12,
    sellingPrice: 16,
    stock: 40,
    minStock: 10,
    unit: 'كيس',
    supplier: 'شركة الرافدين للمواد الغذائية',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const sugar = await createProductUseCase.execute({
    name: 'سكر أبيض 1 كغم',
    sku: 'SUGAR-1KG',
    categoryId: groceries.id,
    description: 'سكر أبيض ناعم',
    costPrice: 0.8,
    sellingPrice: 1.2,
    stock: 80,
    minStock: 20,
    unit: 'كيس',
    supplier: 'شركة السكر العراقية',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  const oil = await createProductUseCase.execute({
    name: 'زيت دوار الشمس 1.5 لتر',
    sku: 'OIL-1.5L',
    categoryId: groceries.id,
    description: 'زيت نباتي للطبخ',
    costPrice: 3.5,
    sellingPrice: 5,
    stock: 5,
    minStock: 10,
    unit: 'قنينة',
    supplier: 'شركة الزيوت النباتية',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  const flour = await createProductUseCase.execute({
    name: 'طحين أبيض 2 كغم',
    sku: 'FLOUR-2KG',
    categoryId: groceries.id,
    description: 'طحين فاخر للخبز والحلويات',
    costPrice: 1.5,
    sellingPrice: 2.5,
    stock: 0,
    minStock: 15,
    unit: 'كيس',
    supplier: 'مطاحن بغداد',
    status: 'out_of_stock',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  // Beverages
  const tea = await createProductUseCase.execute({
    name: 'شاي أسود 250 غرام',
    sku: 'TEA-250G',
    categoryId: beverages.id,
    description: 'شاي سيلاني فاخر',
    costPrice: 2,
    sellingPrice: 3.5,
    stock: 60,
    minStock: 15,
    unit: 'علبة',
    supplier: 'شركة البصرة للشاي',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const water = await createProductUseCase.execute({
    name: 'ماء معدني 1.5 لتر',
    sku: 'WATER-1.5L',
    categoryId: beverages.id,
    description: 'ماء معدني طبيعي',
    costPrice: 0.3,
    sellingPrice: 0.75,
    stock: 200,
    minStock: 50,
    unit: 'قنينة',
    supplier: 'ينابيع بغداد',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
  });

  const juice = await createProductUseCase.execute({
    name: 'عصير برتقال 1 لتر',
    sku: 'JUICE-1L',
    categoryId: beverages.id,
    description: 'عصير طبيعي 100%',
    costPrice: 1.5,
    sellingPrice: 2.5,
    stock: 45,
    minStock: 10,
    unit: 'كرتونة',
    supplier: 'مصنع العصائر الوطني',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
  });

  const cola = await createProductUseCase.execute({
    name: 'مشروب غازي 2 لتر',
    sku: 'COLA-2L',
    categoryId: beverages.id,
    description: 'مشروب غازي بنكهة الكولا',
    costPrice: 0.8,
    sellingPrice: 1.5,
    stock: 90,
    minStock: 20,
    unit: 'قنينة',
    supplier: 'شركة المشروبات الغازية',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
  });

  // Dairy
  const milk = await createProductUseCase.execute({
    name: 'حليب كامل الدسم 1 لتر',
    sku: 'MILK-1L',
    categoryId: dairy.id,
    description: 'حليب بقري طازج',
    costPrice: 1.2,
    sellingPrice: 2,
    stock: 35,
    minStock: 15,
    unit: 'كرتونة',
    supplier: 'مزارع الألبان الحديثة',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  const yogurt = await createProductUseCase.execute({
    name: 'لبن زبادي 500 مل',
    sku: 'YOGURT-500ML',
    categoryId: dairy.id,
    description: 'لبن طبيعي بدون إضافات',
    costPrice: 0.6,
    sellingPrice: 1,
    stock: 20,
    minStock: 10,
    unit: 'علبة',
    supplier: 'مزارع الألبان الحديثة',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  const cheese = await createProductUseCase.execute({
    name: 'جبن أبيض 400 غرام',
    sku: 'CHEESE-400G',
    categoryId: dairy.id,
    description: 'جبن طري قليل الملح',
    costPrice: 2.5,
    sellingPrice: 4,
    stock: 25,
    minStock: 8,
    unit: 'علبة',
    supplier: 'مصنع الأجبان الوطني',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier2.id,
  });

  // Snacks
  const chips = await createProductUseCase.execute({
    name: 'شيبس بطاطا 100 غرام',
    sku: 'CHIPS-100G',
    categoryId: snacks.id,
    description: 'شيبس مقرمش بنكهات متعددة',
    costPrice: 0.5,
    sellingPrice: 1,
    stock: 150,
    minStock: 30,
    unit: 'كيس',
    supplier: 'مصنع الوجبات الخفيفة',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
  });

  const biscuits = await createProductUseCase.execute({
    name: 'بسكويت محشي 200 غرام',
    sku: 'BISCUIT-200G',
    categoryId: snacks.id,
    description: 'بسكويت محشي بالشوكولاتة',
    costPrice: 1,
    sellingPrice: 1.75,
    stock: 70,
    minStock: 20,
    unit: 'علبة',
    supplier: 'مخبز الحلويات الشرقية',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier2.id,
  });

  const chocolate = await createProductUseCase.execute({
    name: 'شوكولاتة 50 غرام',
    sku: 'CHOCO-50G',
    categoryId: snacks.id,
    description: 'شوكولاتة بالحليب',
    costPrice: 0.6,
    sellingPrice: 1.25,
    stock: 120,
    minStock: 25,
    unit: 'قطعة',
    supplier: 'مصنع الحلويات',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
  });

  // Cleaning
  const detergent = await createProductUseCase.execute({
    name: 'مسحوق غسيل 3 كغم',
    sku: 'DETERGENT-3KG',
    categoryId: cleaning.id,
    description: 'مسحوق غسيل للملابس البيضاء والملونة',
    costPrice: 4,
    sellingPrice: 6.5,
    stock: 30,
    minStock: 10,
    unit: 'كيس',
    supplier: 'شركة المنظفات الحديثة',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  const dishSoap = await createProductUseCase.execute({
    name: 'سائل جلي 750 مل',
    sku: 'DISH-750ML',
    categoryId: cleaning.id,
    description: 'سائل تنظيف الأطباق برائحة الليمون',
    costPrice: 1.2,
    sellingPrice: 2,
    stock: 55,
    minStock: 15,
    unit: 'قنينة',
    supplier: 'شركة المنظفات الحديثة',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
  });

  // Personal Care
  const shampoo = await createProductUseCase.execute({
    name: 'شامبو للشعر 400 مل',
    sku: 'SHAMPOO-400ML',
    categoryId: personalCare.id,
    description: 'شامبو مغذي لجميع أنواع الشعر',
    costPrice: 3,
    sellingPrice: 5,
    stock: 40,
    minStock: 12,
    unit: 'قنينة',
    supplier: 'شركة مستحضرات التجميل',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier2.id,
  });

  const soap = await createProductUseCase.execute({
    name: 'صابون معطر 125 غرام',
    sku: 'SOAP-125G',
    categoryId: personalCare.id,
    description: 'صابون طبيعي للبشرة',
    costPrice: 0.4,
    sellingPrice: 0.8,
    stock: 100,
    minStock: 30,
    unit: 'قطعة',
    supplier: 'مصنع الصابون الطبيعي',
    status: 'available',
    isActive: true,
    createdAt: now,
    createdBy: cashier2.id,
  });

  console.log(`   ✓ Created ${18} products with various statuses`);

  // ========== CUSTOMERS ==========
  console.log('👤 Creating customer profiles...');

  const customer1 = await createCustomerUseCase.execute({
    name: 'علي حسن محمود',
    phone: '+964770111222',
    address: 'الكرادة، بغداد',
    city: 'Baghdad',
    notes: 'زبون دائم، يشتري بالجملة',
    isActive: true,
    createdAt: now,
    createdBy: admin.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer2 = await createCustomerUseCase.execute({
    name: 'سارة محمود أحمد',
    phone: '+964770222333',
    address: 'الجادرية، بغداد',
    city: 'Baghdad',
    notes: 'زبونة مميزة',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer3 = await createCustomerUseCase.execute({
    name: 'محمد عبد الله',
    phone: '+964770333444',
    address: 'المنصور، بغداد',
    city: 'Baghdad',
    notes: 'يفضل الدفع بالتقسيط',
    isActive: true,
    createdAt: now,
    createdBy: cashier2.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer4 = await createCustomerUseCase.execute({
    name: 'فاطمة جمال',
    phone: '+964770444555',
    address: 'الأعظمية، بغداد',
    city: 'Baghdad',
    notes: 'تشتري المواد الغذائية أسبوعياً',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer5 = await createCustomerUseCase.execute({
    name: 'حسين طارق',
    phone: '+964770555666',
    address: 'الدورة، بغداد',
    city: 'Baghdad',
    notes: 'صاحب مطعم صغير',
    isActive: true,
    createdAt: now,
    createdBy: manager.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer6 = await createCustomerUseCase.execute({
    name: 'زينب كريم',
    phone: '+964770666777',
    address: 'الكاظمية، بغداد',
    city: 'Baghdad',
    notes: '',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer7 = await createCustomerUseCase.execute({
    name: 'أحمد سعيد',
    phone: '+964770777888',
    address: 'الزعفرانية، بغداد',
    city: 'Baghdad',
    notes: 'يطلب توصيل',
    isActive: true,
    createdAt: now,
    createdBy: cashier2.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  const customer8 = await createCustomerUseCase.execute({
    name: 'ليلى مهدي',
    phone: '+964770888999',
    address: 'الحرية، بغداد',
    city: 'Baghdad',
    notes: 'عميلة جديدة',
    isActive: true,
    createdAt: now,
    createdBy: cashier1.id,
    totalDebt: 0,
    totalPurchases: 0,
  });

  console.log(`   ✓ Created ${8} customer profiles`);

  // ========== SALES ==========
  console.log('🛒 Creating sales transactions...');

  // Sale 1: Large cash sale (groceries)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: rice.id!, quantity: 3, unitPrice: rice.sellingPrice },
        { productId: sugar.id!, quantity: 5, unitPrice: sugar.sellingPrice },
        { productId: oil.id!, quantity: 2, unitPrice: oil.sellingPrice },
        { productId: tea.id!, quantity: 4, unitPrice: tea.sellingPrice },
      ],
      customerId: customer1.id,
      discount: 2,
      tax: 0,
      paymentType: 'cash',
      paidAmount: 72,
      notes: 'مشتريات شهرية',
    },
    cashier1.id!
  );

  // Sale 2: Mixed payment with installments
  const sale2 = await createSaleUseCase.execute(
    {
      items: [
        { productId: rice.id!, quantity: 2, unitPrice: rice.sellingPrice },
        { productId: milk.id!, quantity: 5, unitPrice: milk.sellingPrice },
        { productId: cheese.id!, quantity: 3, unitPrice: cheese.sellingPrice },
        { productId: detergent.id!, quantity: 2, unitPrice: detergent.sellingPrice },
      ],
      customerId: customer3.id,
      discount: 0,
      tax: 0,
      paymentType: 'mixed',
      paidAmount: 30,
      notes: 'دفع جزء نقدي والباقي بالتقسيط',
      interestRate: 5,
      installmentCount: 4,
    },
    cashier2.id!
  );

  await addPaymentUseCase.execute(
    {
      saleId: sale2.id!,
      customerId: customer3.id,
      amount: 15,
      paymentMethod: 'cash',
      notes: 'القسط الأول',
    },
    cashier2.id!
  );

  // Sale 3: Credit sale (restaurant owner buying in bulk)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: water.id!, quantity: 24, unitPrice: water.sellingPrice },
        { productId: juice.id!, quantity: 12, unitPrice: juice.sellingPrice },
        { productId: cola.id!, quantity: 12, unitPrice: cola.sellingPrice },
      ],
      customerId: customer5.id,
      discount: 5,
      tax: 0,
      paymentType: 'mixed',
      paidAmount: 0,
      interestRate: 0,
      installmentCount: 1,
      notes: 'للمطعم - دفع آجل',
    },
    manager.id!
  );

  // Sale 4: Simple cash sale (beverages and snacks)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: water.id!, quantity: 2, unitPrice: water.sellingPrice },
        { productId: chips.id!, quantity: 3, unitPrice: chips.sellingPrice },
        { productId: chocolate.id!, quantity: 5, unitPrice: chocolate.sellingPrice },
      ],
      customerId: customer2.id,
      discount: 0,
      tax: 0,
      paymentType: 'cash',
      paidAmount: 10.75,
      notes: '',
    },
    cashier1.id!
  );

  // Sale 5: Large family weekly shopping (cash)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: rice.id!, quantity: 1, unitPrice: rice.sellingPrice },
        { productId: sugar.id!, quantity: 2, unitPrice: sugar.sellingPrice },
        { productId: tea.id!, quantity: 2, unitPrice: tea.sellingPrice },
        { productId: milk.id!, quantity: 4, unitPrice: milk.sellingPrice },
        { productId: yogurt.id!, quantity: 6, unitPrice: yogurt.sellingPrice },
        { productId: biscuits.id!, quantity: 4, unitPrice: biscuits.sellingPrice },
        { productId: dishSoap.id!, quantity: 1, unitPrice: dishSoap.sellingPrice },
        { productId: soap.id!, quantity: 3, unitPrice: soap.sellingPrice },
      ],
      customerId: customer4.id,
      discount: 1.5,
      tax: 0,
      paymentType: 'cash',
      paidAmount: 54.9,
      notes: 'مشتريات أسبوعية للعائلة',
    },
    cashier1.id!
  );

  // Sale 6: Personal care products (cash)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: shampoo.id!, quantity: 2, unitPrice: shampoo.sellingPrice },
        { productId: soap.id!, quantity: 5, unitPrice: soap.sellingPrice },
        { productId: detergent.id!, quantity: 1, unitPrice: detergent.sellingPrice },
      ],
      customerId: customer6.id,
      discount: 0,
      tax: 0,
      paymentType: 'cash',
      paidAmount: 20.5,
      notes: '',
    },
    cashier2.id!
  );

  // Sale 7: Mixed payment (partial cash, rest credit)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: rice.id!, quantity: 2, unitPrice: rice.sellingPrice },
        { productId: oil.id!, quantity: 3, unitPrice: oil.sellingPrice },
        { productId: cheese.id!, quantity: 2, unitPrice: cheese.sellingPrice },
      ],
      customerId: customer7.id,
      discount: 1,
      tax: 0,
      paymentType: 'mixed',
      paidAmount: 25,
      notes: 'دفع جزئي',
      interestRate: 0,
      installmentCount: 1,
    },
    cashier1.id!
  );

  // Sale 8: Snacks and beverages for small shop
  await createSaleUseCase.execute(
    {
      items: [
        { productId: chips.id!, quantity: 20, unitPrice: chips.sellingPrice },
        { productId: biscuits.id!, quantity: 15, unitPrice: biscuits.sellingPrice },
        { productId: chocolate.id!, quantity: 30, unitPrice: chocolate.sellingPrice },
        { productId: water.id!, quantity: 12, unitPrice: water.sellingPrice },
      ],
      customerId: customer8.id,
      discount: 10,
      tax: 0,
      paymentType: 'cash',
      paidAmount: 95.5,
      notes: 'للبيع بالتجزئة',
    },
    manager.id!
  );

  // Sale 9: Credit sale with multiple items
  const sale9 = await createSaleUseCase.execute(
    {
      items: [
        { productId: juice.id!, quantity: 6, unitPrice: juice.sellingPrice },
        { productId: cola.id!, quantity: 8, unitPrice: cola.sellingPrice },
        { productId: water.id!, quantity: 12, unitPrice: water.sellingPrice },
      ],
      customerId: customer1.id,
      discount: 2,
      tax: 0,
      paymentType: 'mixed',
      paidAmount: 0,
      interestRate: 0,
      installmentCount: 1,
      notes: 'سيدفع نهاية الأسبوع',
    },
    cashier2.id!
  );

  await addPaymentUseCase.execute(
    {
      saleId: sale9.id!,
      customerId: customer1.id,
      amount: 15,
      paymentMethod: 'cash',
      notes: 'دفعة جزئية',
    },
    cashier2.id!
  );

  // Sale 10: Simple purchase (dairy products)
  await createSaleUseCase.execute(
    {
      items: [
        { productId: milk.id!, quantity: 3, unitPrice: milk.sellingPrice },
        { productId: yogurt.id!, quantity: 4, unitPrice: yogurt.sellingPrice },
      ],
      customerId: customer2.id,
      discount: 0,
      tax: 0,
      paymentType: 'cash',
      paidAmount: 10,
      notes: '',
    },
    cashier1.id!
  );

  console.log(`   ✓ Created ${10} sales transactions with various payment types`);
  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   • 5 users (admin, manager, 2 cashiers, viewer)');
  console.log('   • 6 categories');
  console.log('   • 18 products (including low stock and out of stock items)');
  console.log('   • 8 customers');
  console.log('   • 10 sales (cash, credit, mixed, with installments)');
  console.log('');
  console.log('🔑 Test credentials:');
  console.log('   Admin:    admin / Admin@123');
  console.log('   Manager:  manager / Manager@123');
  console.log('   Cashier:  cashier / Cashier@123');
  console.log('   Cashier2: cashier2 / Cashier@123');
  console.log('   Viewer:   viewer / Viewer@123');
};

export { initializeDatabase };
