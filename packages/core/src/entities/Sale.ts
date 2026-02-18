import { z } from 'zod';

export const SaleItemSchema = z.object({
  id: z.number().optional(),
  saleId: z.number().optional(),
  productId: z.number().min(1),
  productName: z.string().min(1),
  quantity: z.number().min(1),
  unitName: z.string().default('piece'),
  unitFactor: z.number().int().default(1),
  quantityBase: z.number().int().optional(),
  batchId: z.number().optional(),
  unitPrice: z.number().min(0),
  discount: z.number().default(0),
  subtotal: z.number().min(0),
  createdAt: z.string().datetime().optional(),
});

export const SaleSchema = z.object({
  id: z.number().optional(),
  invoiceNumber: z.string().min(1),
  customerId: z.number().nullable().optional(),
  subtotal: z.number().min(0),
  discount: z.number().default(0),
  tax: z.number().default(0),
  total: z.number().min(0),
  currency: z.string().default('IQD'),
  exchangeRate: z.number().default(1),
  interestRate: z.number().default(0),
  interestAmount: z.number().default(0),
  paymentType: z.enum(['cash', 'credit', 'mixed']).default('cash'),
  paidAmount: z.number().default(0),
  remainingAmount: z.number().default(0),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  notes: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.number().optional(),
  // Relations
  items: z.array(SaleItemSchema).optional(),
});

export type SaleItem = z.infer<typeof SaleItemSchema>;
export type Sale = z.infer<typeof SaleSchema>;
