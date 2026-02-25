import { eq, and, desc, count } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { barcodeTemplates, barcodePrintJobs } from '../schema/schema.js';
import { IBarcodeRepository, BarcodeTemplate, BarcodePrintJob } from '@nuqtaplus/core';

export class SqliteBarcodeRepository implements IBarcodeRepository {
  constructor(private db: DbClient) {}

  async findAllTemplates(): Promise<BarcodeTemplate[]> {
    return (this.db.select().from(barcodeTemplates).all() as BarcodeTemplate[]) || [];
  }

  async createTemplate(template: Partial<BarcodeTemplate>): Promise<BarcodeTemplate> {
    const { id, ...data } = template;
    const result = this.db
      .insert(barcodeTemplates)
      .values(data as any)
      .returning()
      .get();
    return result as BarcodeTemplate;
  }

  async updateTemplate(id: number, template: Partial<BarcodeTemplate>): Promise<BarcodeTemplate> {
    const result = this.db
      .update(barcodeTemplates)
      .set(template as any)
      .where(eq(barcodeTemplates.id, id))
      .returning()
      .get();
    return result as BarcodeTemplate;
  }

  async deleteTemplate(id: number): Promise<void> {
    this.db.delete(barcodeTemplates).where(eq(barcodeTemplates.id, id)).run();
  }

  async getTemplateById(id: number): Promise<BarcodeTemplate | null> {
    const result = this.db.select().from(barcodeTemplates).where(eq(barcodeTemplates.id, id)).get();
    return (result as BarcodeTemplate) || null;
  }

  async findPrintJobs(params?: {
    productId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: BarcodePrintJob[]; total: number }> {
    const conditions = [];

    if (params?.productId) {
      conditions.push(eq(barcodePrintJobs.productId, params.productId));
    }

    if (params?.status) {
      conditions.push(eq(barcodePrintJobs.status, params.status));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const query = this.db
      .select()
      .from(barcodePrintJobs)
      .where(whereClause)
      .orderBy(desc(barcodePrintJobs.createdAt));

    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const items = (query.all() as BarcodePrintJob[]) || [];

    const totalResult = this.db
      .select({ count: count() })
      .from(barcodePrintJobs)
      .where(whereClause)
      .get();

    return { items, total: totalResult?.count || 0 };
  }

  async createPrintJob(job: Partial<BarcodePrintJob>): Promise<BarcodePrintJob> {
    const { id, ...data } = job;
    const result = this.db
      .insert(barcodePrintJobs)
      .values(data as any)
      .returning()
      .get();
    return result as BarcodePrintJob;
  }

  async updatePrintJobStatus(id: number, status: string, error?: string): Promise<void> {
    this.db
      .update(barcodePrintJobs)
      .set({
        status,
        printError: status === 'failed' ? error || 'Print failed' : null,
        printedAt: status === 'printed' ? new Date().toISOString() : null,
      })
      .where(eq(barcodePrintJobs.id, id))
      .run();
  }

  async getPrintJobById(id: number): Promise<BarcodePrintJob | null> {
    const result = this.db.select().from(barcodePrintJobs).where(eq(barcodePrintJobs.id, id)).get();
    return (result as BarcodePrintJob) || null;
  }
}
