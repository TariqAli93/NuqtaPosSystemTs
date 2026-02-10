import type {
  Category,
  Customer,
  Installment,
  Payment,
  Product,
  Sale,
  SaleItem,
  Settings,
  User,
  CompanySettings,
} from '@nuqtaplus/core';
import type { UserRole } from '@nuqtaplus/core';

export type {
  Category,
  Customer,
  Installment,
  Payment,
  Product,
  Sale,
  SaleItem,
  Settings,
  UserRole,
  CompanySettings,
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
  | 'status'
  | 'isActive'
>;

export type SaleInput = Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

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
