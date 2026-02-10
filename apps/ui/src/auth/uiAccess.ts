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

export default {
  canManageProducts,
  canManageCustomers,
  canCreateSales,
  canManageSettings,
  canManageUsers,
};
