import { z } from 'zod';

export const BarcodeTemplateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  barcodeType: z.enum(['CODE128', 'EAN13', 'QR']).default('CODE128'),
  showPrice: z.boolean().default(true),
  showName: z.boolean().default(true),
  showBarcode: z.boolean().default(true),
  showExpiry: z.boolean().default(false),
  layoutJson: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
});

export const BarcodePrintJobSchema = z.object({
  id: z.number().optional(),
  templateId: z.number().min(1),
  productId: z.number().min(1),
  productName: z.string().min(1),
  barcode: z.string().nullable().optional(),
  price: z.number().int().optional(),
  expiryDate: z.string().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
  status: z.enum(['pending', 'printing', 'printed', 'failed']).default('pending'),
  printedAt: z.string().datetime().nullable().optional(),
  printError: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  createdBy: z.number().optional(),
});

export type BarcodeTemplate = z.infer<typeof BarcodeTemplateSchema>;
export type BarcodePrintJob = z.infer<typeof BarcodePrintJobSchema>;
