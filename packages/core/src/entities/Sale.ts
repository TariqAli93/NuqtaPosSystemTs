import { z } from 'zod';

export const SaleItemSchema = z.object({
  id: z.number().optional(),
  saleId: z.number().optional(),
  productId: z.number().min(1),
  productName: z.string().min(1),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().default(0),
  subtotal: z.number().min(0),
  createdAt: z.string().datetime().optional(),
});

export const InstallmentSchema = z.object({
  id: z.number().optional(),
  saleId: z.number().optional(),
  customerId: z.number().optional(),
  installmentNumber: z.number(),
  dueAmount: z.number(),
  paidAmount: z.number().default(0),
  remainingAmount: z.number(),
  currency: z.string().default('IQD'),
  dueDate: z.string(),
  paidDate: z.string().nullable().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const SaleSchema = z.object({
  id: z.number().optional(),
  invoiceNumber: z.string().min(1),
  customerId: z.number().nullable().optional(),
  subtotal: z.number().min(0),
  discount: z.number().default(0),
  tax: z.number().default(0),
  total: z.number().min(0),
  currency: z.string().default('USD'),
  exchangeRate: z.number().default(1),
  interestRate: z.number().default(0),
  interestAmount: z.number().default(0),
  paymentType: z.enum(['cash', 'installment', 'mixed']),
  paidAmount: z.number().default(0),
  remainingAmount: z.number().default(0),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.number().optional(),
  // Relations (optional for passing data around)
  items: z.array(SaleItemSchema).optional(),
  installments: z.array(InstallmentSchema).optional(), // Add installments
});

export type SaleItem = z.infer<typeof SaleItemSchema>;
export type Installment = z.infer<typeof InstallmentSchema>;
export type Sale = z.infer<typeof SaleSchema>;
