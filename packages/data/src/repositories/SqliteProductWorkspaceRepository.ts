import { sql } from 'drizzle-orm';
import { DbClient } from '../db.js';

export interface ProductPurchaseHistoryRow {
  purchaseId: number;
  invoiceNumber: string;
  supplierId: number;
  supplierName: string | null;
  status: string | null;
  createdAt: string | null;
  total: number | null;
  quantity: number;
  quantityBase: number;
  unitName: string | null;
  unitFactor: number | null;
  unitCost: number;
  lineSubtotal: number;
  batchId: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
}

export interface ProductSalesHistoryRow {
  saleId: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  status: string | null;
  createdAt: string | null;
  total: number | null;
  quantity: number;
  quantityBase: number;
  unitName: string | null;
  unitFactor: number | null;
  unitPrice: number;
  subtotal: number;
  batchId: number | null;
}

export interface ProductHistoryQuery {
  limit?: number;
  offset?: number;
}

export class SqliteProductWorkspaceRepository {
  constructor(private db: DbClient) {}

  findPurchaseHistoryByProduct(
    productId: number,
    params?: ProductHistoryQuery
  ): { items: ProductPurchaseHistoryRow[]; total: number } {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const items = this.db.all(sql`
      SELECT
        pi.purchase_id AS purchaseId,
        p.invoice_number AS invoiceNumber,
        p.supplier_id AS supplierId,
        s.name AS supplierName,
        p.status AS status,
        p.created_at AS createdAt,
        p.total AS total,
        pi.quantity AS quantity,
        pi.quantity_base AS quantityBase,
        pi.unit_name AS unitName,
        pi.unit_factor AS unitFactor,
        pi.unit_cost AS unitCost,
        pi.line_subtotal AS lineSubtotal,
        pi.batch_id AS batchId,
        b.batch_number AS batchNumber,
        pi.expiry_date AS expiryDate
      FROM purchase_items pi
      JOIN purchases p ON p.id = pi.purchase_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN product_batches b ON b.id = pi.batch_id
      WHERE pi.product_id = ${productId}
      ORDER BY p.created_at DESC, pi.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as unknown as ProductPurchaseHistoryRow[];

    const totalRow = this.db.get(sql`
      SELECT COUNT(*) AS total
      FROM purchase_items pi
      WHERE pi.product_id = ${productId}
    `) as { total?: number } | undefined;

    return {
      items,
      total: totalRow?.total || 0,
    };
  }

  findSalesHistoryByProduct(
    productId: number,
    params?: ProductHistoryQuery
  ): { items: ProductSalesHistoryRow[]; total: number } {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const items = this.db.all(sql`
      SELECT
        si.sale_id AS saleId,
        s.invoice_number AS invoiceNumber,
        s.customer_id AS customerId,
        c.name AS customerName,
        s.status AS status,
        s.created_at AS createdAt,
        s.total AS total,
        si.quantity AS quantity,
        si.quantity_base AS quantityBase,
        si.unit_name AS unitName,
        si.unit_factor AS unitFactor,
        si.unit_price AS unitPrice,
        si.subtotal AS subtotal,
        si.batch_id AS batchId
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE si.product_id = ${productId}
      ORDER BY s.created_at DESC, si.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as unknown as ProductSalesHistoryRow[];

    const totalRow = this.db.get(sql`
      SELECT COUNT(*) AS total
      FROM sale_items si
      WHERE si.product_id = ${productId}
    `) as { total?: number } | undefined;

    return {
      items,
      total: totalRow?.total || 0,
    };
  }
}

