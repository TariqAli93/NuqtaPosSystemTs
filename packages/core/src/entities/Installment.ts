import { z } from 'zod';

export const InstallmentSchema = z.object({
  id: z.number().optional(),
  saleId: z.number().nullable().optional(),
  customerId: z.number().nullable().optional(),
  installmentNumber: z.number().int().min(1),
  dueAmount: z.number().min(0),
  paidAmount: z.number().default(0),
  remainingAmount: z.number().default(0),
  currency: z.string().default('IQD'),
  dueDate: z.string(), // Date string
  paidDate: z.string().nullable().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.number().optional(),
});

export type Installment = z.infer<typeof InstallmentSchema>;
