import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('cashier'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
});

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  notes: text('notes'),
  totalPurchases: integer('total_purchases').default(0),
  totalDebt: integer('total_debt').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
  createdBy: integer('created_by'),
});

// ═══════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  phone2: text('phone2'),
  address: text('address'),
  city: text('city'),
  notes: text('notes'),
  openingBalance: integer('opening_balance').default(0),
  currentBalance: integer('current_balance').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
  createdBy: integer('created_by'),
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
  createdBy: integer('created_by'),
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').unique(),
  barcode: text('barcode'),
  categoryId: integer('category_id'),
  description: text('description'),
  costPrice: integer('cost_price').notNull(),
  sellingPrice: integer('selling_price').notNull(),
  currency: text('currency').notNull().default('IQD'),
  stock: integer('stock').default(0),
  minStock: integer('min_stock').default(0),
  unit: text('unit').default('piece'),
  supplier: text('supplier'),
  supplierId: integer('supplier_id'),
  expireDate: text('expire_date'),
  isExpire: integer('is_expire', { mode: 'boolean' }).default(false),
  status: text('status').notNull().default('available'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
  createdBy: integer('created_by'),
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT UNITS (Packaging / Conversion)
// ═══════════════════════════════════════════════════════════════

export const productUnits = sqliteTable(
  'product_units',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id').notNull(),
    unitName: text('unit_name').notNull(),
    factorToBase: integer('factor_to_base').notNull().default(1),
    barcode: text('barcode'),
    sellingPrice: integer('selling_price'),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  },
  (table) => [
    index('idx_product_units_product').on(table.productId),
    uniqueIndex('idx_product_units_unique').on(table.productId, table.unitName),
  ]
);

// ═══════════════════════════════════════════════════════════════
// PRODUCT BATCHES (Batch/Expiry Tracking — Killer Feature 1)
// ═══════════════════════════════════════════════════════════════

export const productBatches = sqliteTable(
  'product_batches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id').notNull(),
    batchNumber: text('batch_number').notNull(),
    expiryDate: text('expiry_date'),
    manufacturingDate: text('manufacturing_date'),
    quantityReceived: integer('quantity_received').notNull(),
    quantityOnHand: integer('quantity_on_hand').notNull(),
    costPerUnit: integer('cost_per_unit'),
    purchaseId: integer('purchase_id'),
    status: text('status').notNull().default('active'),
    notes: text('notes'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  },
  (table) => [
    index('idx_batches_product').on(table.productId),
    index('idx_batches_expiry').on(table.expiryDate),
    uniqueIndex('idx_batches_unique').on(table.productId, table.batchNumber),
  ]
);

// ═══════════════════════════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════════════════════════

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: integer('customer_id'),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').default(0),
  tax: integer('tax').default(0),
  total: integer('total').notNull(),
  currency: text('currency').notNull().default('IQD'),
  exchangeRate: real('exchange_rate').default(1),
  interestRate: real('interest_rate').default(0),
  interestAmount: integer('interest_amount').default(0),
  paymentType: text('payment_type').notNull(),
  paidAmount: integer('paid_amount').default(0),
  remainingAmount: integer('remaining_amount').default(0),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  idempotencyKey: text('idempotency_key').unique(),
  printStatus: text('print_status').notNull().default('pending'),
  printedAt: text('printed_at'),
  printError: text('print_error'),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
  createdBy: integer('created_by'),
});

// ═══════════════════════════════════════════════════════════════
// SALE ITEMS
// ═══════════════════════════════════════════════════════════════

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  productId: integer('product_id'),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitName: text('unit_name').default('piece'),
  unitFactor: integer('unit_factor').default(1),
  quantityBase: integer('quantity_base'),
  batchId: integer('batch_id'),
  unitPrice: integer('unit_price').notNull(),
  discount: integer('discount').default(0),
  subtotal: integer('subtotal').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
});

// ═══════════════════════════════════════════════════════════════
// PURCHASES (Procurement Invoices)
// ═══════════════════════════════════════════════════════════════

export const purchases = sqliteTable(
  'purchases',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceNumber: text('invoice_number').notNull(),
    supplierId: integer('supplier_id').notNull(),
    subtotal: integer('subtotal').notNull(),
    discount: integer('discount').default(0),
    tax: integer('tax').default(0),
    total: integer('total').notNull(),
    paidAmount: integer('paid_amount').default(0),
    remainingAmount: integer('remaining_amount').default(0),
    currency: text('currency').notNull().default('IQD'),
    exchangeRate: real('exchange_rate').default(1),
    status: text('status').notNull().default('pending'),
    notes: text('notes'),
    receivedAt: text('received_at'),
    idempotencyKey: text('idempotency_key'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_purchases_supplier').on(table.supplierId),
    uniqueIndex('idx_purchases_invoice_supplier').on(table.invoiceNumber, table.supplierId),
    uniqueIndex('idx_purchases_idempotency').on(table.idempotencyKey),
  ]
);

// ═══════════════════════════════════════════════════════════════
// PURCHASE ITEMS
// ═══════════════════════════════════════════════════════════════

export const purchaseItems = sqliteTable(
  'purchase_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    purchaseId: integer('purchase_id').notNull(),
    productId: integer('product_id').notNull(),
    productName: text('product_name').notNull(),
    unitName: text('unit_name').default('piece'),
    unitFactor: integer('unit_factor').default(1),
    quantity: integer('quantity').notNull(),
    quantityBase: integer('quantity_base').notNull(),
    unitCost: integer('unit_cost').notNull(),
    lineSubtotal: integer('line_subtotal').notNull(),
    discount: integer('discount').default(0),
    batchId: integer('batch_id'),
    expiryDate: text('expiry_date'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  },
  (table) => [
    index('idx_purchase_items_purchase').on(table.purchaseId),
    index('idx_purchase_items_product').on(table.productId),
  ]
);

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════

export const payments = sqliteTable(
  'payments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    saleId: integer('sale_id'),
    purchaseId: integer('purchase_id'),
    customerId: integer('customer_id'),
    supplierId: integer('supplier_id'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('IQD'),
    exchangeRate: real('exchange_rate').default(1),
    paymentMethod: text('payment_method').notNull(),
    referenceNumber: text('reference_number'),
    idempotencyKey: text('idempotency_key'),
    status: text('status').notNull().default('completed'),
    paymentDate: text('payment_date').default(sql`(datetime('now','localtime'))`),
    notes: text('notes'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_payments_sale').on(table.saleId),
    index('idx_payments_purchase').on(table.purchaseId),
    index('idx_payments_customer').on(table.customerId),
    index('idx_payments_supplier').on(table.supplierId),
    uniqueIndex('idx_payments_idempotency').on(table.idempotencyKey),
  ]
);

// ═══════════════════════════════════════════════════════════════
// INVENTORY MOVEMENTS (Stock Ledger)
// ═══════════════════════════════════════════════════════════════

export const inventoryMovements = sqliteTable(
  'inventory_movements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id').notNull(),
    batchId: integer('batch_id'),
    movementType: text('movement_type').notNull(),
    reason: text('reason').notNull(),
    quantityBase: integer('quantity_base').notNull(),
    unitName: text('unit_name').default('piece'),
    unitFactor: integer('unit_factor').default(1),
    stockBefore: integer('stock_before').notNull(),
    stockAfter: integer('stock_after').notNull(),
    costPerUnit: integer('cost_per_unit'),
    totalCost: integer('total_cost'),
    sourceType: text('source_type'),
    sourceId: integer('source_id'),
    notes: text('notes'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_inv_mov_product').on(table.productId),
    index('idx_inv_mov_date').on(table.createdAt),
    index('idx_inv_mov_source').on(table.sourceType, table.sourceId),
  ]
);

// ═══════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS (Double-Entry Accounting)
// ═══════════════════════════════════════════════════════════════

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  nameAr: text('name_ar'),
  accountType: text('account_type').notNull(),
  parentId: integer('parent_id'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  balance: integer('balance').default(0),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
});

// ═══════════════════════════════════════════════════════════════
// JOURNAL ENTRIES (Header)
// ═══════════════════════════════════════════════════════════════

export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entryNumber: text('entry_number').notNull().unique(),
    entryDate: text('entry_date')
      .notNull()
      .default(sql`(datetime('now','localtime'))`),
    description: text('description').notNull(),
    sourceType: text('source_type'),
    sourceId: integer('source_id'),
    isPosted: integer('is_posted', { mode: 'boolean' }).default(true),
    isReversed: integer('is_reversed', { mode: 'boolean' }).default(false),
    reversalOfId: integer('reversal_of_id'),
    totalAmount: integer('total_amount').notNull(),
    currency: text('currency').notNull().default('IQD'),
    notes: text('notes'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_journal_date').on(table.entryDate),
    index('idx_journal_source').on(table.sourceType, table.sourceId),
  ]
);

// ═══════════════════════════════════════════════════════════════
// JOURNAL LINES (Debit/Credit)
// ═══════════════════════════════════════════════════════════════

export const journalLines = sqliteTable(
  'journal_lines',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    journalEntryId: integer('journal_entry_id').notNull(),
    accountId: integer('account_id').notNull(),
    debit: integer('debit').default(0),
    credit: integer('credit').default(0),
    description: text('description'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
  },
  (table) => [
    index('idx_journal_lines_entry').on(table.journalEntryId),
    index('idx_journal_lines_account').on(table.accountId),
  ]
);

// ═══════════════════════════════════════════════════════════════
// CUSTOMER LEDGER (Accounts Receivable)
// ═══════════════════════════════════════════════════════════════

export const customerLedger = sqliteTable(
  'customer_ledger',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id').notNull(),
    transactionType: text('transaction_type').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    saleId: integer('sale_id'),
    paymentId: integer('payment_id'),
    journalEntryId: integer('journal_entry_id'),
    notes: text('notes'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_cust_ledger_customer').on(table.customerId),
    index('idx_cust_ledger_date').on(table.createdAt),
  ]
);

// ═══════════════════════════════════════════════════════════════
// SUPPLIER LEDGER (Accounts Payable)
// ═══════════════════════════════════════════════════════════════

export const supplierLedger = sqliteTable(
  'supplier_ledger',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    supplierId: integer('supplier_id').notNull(),
    transactionType: text('transaction_type').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    purchaseId: integer('purchase_id'),
    paymentId: integer('payment_id'),
    journalEntryId: integer('journal_entry_id'),
    notes: text('notes'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_supp_ledger_supplier').on(table.supplierId),
    index('idx_supp_ledger_date').on(table.createdAt),
  ]
);

// ═══════════════════════════════════════════════════════════════
// BARCODE TEMPLATES (Killer Feature 2)
// ═══════════════════════════════════════════════════════════════

export const barcodeTemplates = sqliteTable('barcode_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  barcodeType: text('barcode_type').notNull().default('CODE128'),
  showPrice: integer('show_price', { mode: 'boolean' }).default(true),
  showName: integer('show_name', { mode: 'boolean' }).default(true),
  showBarcode: integer('show_barcode', { mode: 'boolean' }).default(true),
  showExpiry: integer('show_expiry', { mode: 'boolean' }).default(false),
  layoutJson: text('layout_json'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
});

// ═══════════════════════════════════════════════════════════════
// BARCODE PRINT JOBS (Killer Feature 2)
// ═══════════════════════════════════════════════════════════════

export const barcodePrintJobs = sqliteTable(
  'barcode_print_jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    templateId: integer('template_id').notNull(),
    productId: integer('product_id').notNull(),
    productName: text('product_name').notNull(),
    barcode: text('barcode'),
    price: integer('price'),
    expiryDate: text('expiry_date'),
    quantity: integer('quantity').notNull().default(1),
    status: text('status').notNull().default('pending'),
    printedAt: text('printed_at'),
    printError: text('print_error'),
    createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
    createdBy: integer('created_by'),
  },
  (table) => [
    index('idx_print_jobs_status').on(table.status),
    index('idx_print_jobs_product').on(table.productId),
  ]
);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

export const currencySettings = sqliteTable('currency_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currencyCode: text('currency_code').notNull().unique(),
  currencyName: text('currency_name').notNull(),
  symbol: text('symbol').notNull(),
  exchangeRate: real('exchange_rate').notNull(),
  isBaseCurrency: integer('is_base_currency', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: text('updated_at').default(sql`(datetime('now','localtime'))`),
  updatedBy: integer('updated_by'),
});

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  timestamp: text('timestamp')
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  changedFields: text('changed_fields'),
  changeDescription: text('change_description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'),
});
