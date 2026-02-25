import type { UserRole } from '../types/domain';

export function canManageProducts(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canManageCustomers(role: UserRole): boolean {
  return role === 'admin' || role === 'manager' || role === 'cashier';
}

export function canCreateSales(role: UserRole): boolean {
  return role === 'admin' || role === 'manager' || role === 'cashier';
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canManagePurchases(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canManageSuppliers(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canViewInventory(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canAdjustStock(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function canViewAccounting(role: UserRole): boolean {
  return role === 'admin';
}

export function canPrintBarcodes(role: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}
