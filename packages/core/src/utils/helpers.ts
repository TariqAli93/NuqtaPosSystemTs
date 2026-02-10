import bcrypt from 'bcryptjs';

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password with hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    throw new Error('Password and hash are required');
  }
  return bcrypt.compare(password, hash);
}

/**
 * Round amount based on currency
 * For IQD: round to nearest multiple of 250 (smallest denomination)
 * For USD: round to nearest integer
 */
export function roundByCurrency(amount: number, currency: string): number {
  if (currency === 'IQD') {
    // Round to nearest multiple of 250
    return Math.ceil(amount / 250) * 250;
  } else {
    // For USD and other currencies, round to nearest integer
    return Math.ceil(amount);
  }
}

/**
 * Generate unique invoice number with timestamp and random suffix
 */
export function generateInvoiceNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `INV-${timestamp}-${random}`;
}

export interface SaleItemInput {
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Calculate sale totals including discount and tax
 */
export function calculateSaleTotals(
  items: SaleItemInput[],
  discount: number = 0,
  tax: number = 0
): SaleTotals {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items must be a non-empty array');
  }

  if (discount < 0 || tax < 0) {
    throw new Error('Discount and tax must be non-negative');
  }

  if (tax > 100) {
    throw new Error('Tax percentage cannot exceed 100%');
  }

  // Calculate subtotal from all items WITHOUT any discounts
  const subtotalBeforeDiscounts = items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  // Calculate total item-level discounts
  const itemDiscounts = items.reduce((sum, item) => {
    const itemDiscountPerUnit = item.discount || 0;
    const itemDiscountTotal = itemDiscountPerUnit * (item.quantity || 1);
    return sum + itemDiscountTotal;
  }, 0);

  // Subtotal after item-level discounts
  const subtotalAfterItemDiscounts = subtotalBeforeDiscounts - itemDiscounts;

  // Apply sale-level discount
  const subtotalAfterAllDiscounts = Math.max(0, subtotalAfterItemDiscounts - discount);

  // Calculate tax amount
  const taxAmount = (subtotalAfterAllDiscounts * tax) / 100;

  // Calculate final total
  const total = subtotalAfterAllDiscounts + taxAmount;

  return {
    subtotal: parseFloat(subtotalAfterItemDiscounts.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    tax: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}
