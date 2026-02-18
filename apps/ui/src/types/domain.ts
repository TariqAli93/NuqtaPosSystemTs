import type {
  Category,
  Customer,
  Payment,
  Product,
  Sale,
  SaleItem,
  Settings,
  User,
  CompanySettings,
  Supplier,
  Purchase,
  PurchaseItem,
  InventoryMovement,
  Account,
  JournalEntry,
  JournalLine,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  ProductUnit,
  ProductBatch,
  BarcodeTemplate,
  BarcodePrintJob,
} from '@nuqtaplus/core';
import type { UserRole } from '@nuqtaplus/core';

export type {
  Category,
  Customer,
  Payment,
  Product,
  Sale,
  SaleItem,
  Settings,
  UserRole,
  CompanySettings,
  Supplier,
  Purchase,
  PurchaseItem,
  InventoryMovement,
  Account,
  JournalEntry,
  JournalLine,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  ProductUnit,
  ProductBatch,
  BarcodeTemplate,
  BarcodePrintJob,
};

export type UserPublic = Omit<User, 'password'>;

export type CustomerInput = Pick<Customer, 'name' | 'phone' | 'address' | 'city' | 'notes'>;

export type ProductInput = Pick<
  Product,
  | 'name'
  | 'sku'
  | 'barcode'
  | 'categoryId'
  | 'description'
  | 'costPrice'
  | 'sellingPrice'
  | 'stock'
  | 'minStock'
  | 'unit'
  | 'supplier'
  | 'supplierId'
  | 'status'
  | 'isActive'
  | 'isExpire'
  | 'expireDate'
>;

export type SaleInput = Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & {
  paymentMethod?: string;
  referenceNumber?: string;
  idempotencyKey?: string;
};

export type FirstUserInput = {
  username: string;
  password: string;
  fullName: string;
  phone?: string | null;
};

export type UserInput = Pick<User, 'username' | 'fullName' | 'role' | 'isActive' | 'phone'> & {
  password?: string;
};

export type CategoryInput = Pick<Category, 'name' | 'description' | 'isActive'>;

export type SettingsCurrencyResponse = {
  defaultCurrency: string;
  usdRate: number;
  iqdRate: number;
};

export type CompanySettingsInput = Pick<
  CompanySettings,
  | 'name'
  | 'address'
  | 'phone'
  | 'phone2'
  | 'email'
  | 'taxId'
  | 'logo'
  | 'currency'
  | 'lowStockThreshold'
>;
