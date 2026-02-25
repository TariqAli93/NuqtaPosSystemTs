import { BarcodeLayoutV1Schema, type BarcodePrintJob, type BarcodeTemplate } from '@nuqtaplus/core';
import { DatabaseType, SqliteBarcodeRepository, SqliteSettingsRepository } from '@nuqtaplus/data';
import { printReceipt } from '../ipc/PrinterHandler.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseLayout(layoutJson?: string | null): { version: 1; elements: any[] } | null {
  if (!layoutJson) return null;
  try {
    const parsed = JSON.parse(layoutJson);
    const validated = BarcodeLayoutV1Schema.safeParse(parsed);
    if (!validated.success) return null;
    return validated.data;
  } catch {
    return null;
  }
}

function renderJobHtml(job: BarcodePrintJob, template: BarcodeTemplate): string {
  const layout = parseLayout(template.layoutJson);
  const width = template.width || 50;
  const height = template.height || 30;

  if (!layout || layout.elements.length === 0) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
          <div style="width:${width}mm;height:${height}mm;padding:2mm;box-sizing:border-box;border:1px solid #ddd;">
            <div style="font-size:9px;font-weight:bold;">${escapeHtml(job.productName)}</div>
            <div style="font-size:8px;">${escapeHtml(job.barcode || '-')}</div>
            <div style="font-size:9px;margin-top:2mm;">${job.price ?? 0} IQD</div>
            ${job.expiryDate ? `<div style="font-size:7px;">EXP: ${escapeHtml(job.expiryDate)}</div>` : ''}
          </div>
        </body>
      </html>
    `;
  }

  const content = layout.elements
    .map((element) => {
      const x = element.x ?? 0;
      const y = element.y ?? 0;
      const widthStyle = element.width ? `width:${element.width}mm;` : '';
      const heightStyle = element.height ? `height:${element.height}mm;` : '';
      const fontSize = element.fontSize ? `font-size:${element.fontSize}px;` : 'font-size:9px;';
      const bold = element.bold ? 'font-weight:bold;' : '';

      if (element.type === 'barcode') {
        return `<div style="position:absolute;left:${x}mm;top:${y}mm;${widthStyle}${heightStyle}${fontSize}${bold}">${escapeHtml(job.barcode || '-')}</div>`;
      }
      if (element.type === 'productName') {
        return `<div style="position:absolute;left:${x}mm;top:${y}mm;${fontSize}${bold}">${escapeHtml(job.productName)}</div>`;
      }
      if (element.type === 'price') {
        return `<div style="position:absolute;left:${x}mm;top:${y}mm;${fontSize}${bold}">${job.price ?? 0} IQD</div>`;
      }
      if (element.type === 'expiry') {
        return `<div style="position:absolute;left:${x}mm;top:${y}mm;${fontSize}${bold}">${escapeHtml(job.expiryDate || '')}</div>`;
      }
      return '';
    })
    .join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
        <div style="position:relative;width:${width}mm;height:${height}mm;overflow:hidden;">
          ${content}
        </div>
      </body>
    </html>
  `;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class BarcodePrintJobExecutor {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly barcodeRepo: SqliteBarcodeRepository;
  private readonly settingsRepo: SqliteSettingsRepository;

  constructor(private db: DatabaseType, private intervalMs = 3000, private batchSize = 10) {
    this.barcodeRepo = new SqliteBarcodeRepository(db.db);
    this.settingsRepo = new SqliteSettingsRepository(db.db);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    void this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private resolvePrinterName(): string {
    const configured =
      this.settingsRepo.get('barcode.printerName') ||
      this.settingsRepo.get('pos.printerName') ||
      process.env.NUQTA_BARCODE_PRINTER;
    if (!configured) {
      throw new Error('No barcode printer configured');
    }
    return configured;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.barcodeRepo.findPrintJobs({
        status: 'pending',
        limit: this.batchSize,
        offset: 0,
      });
      if (!pending.items.length) return;

      for (const job of pending.items) {
        if (!job.id) continue;
        await this.barcodeRepo.updatePrintJobStatus(job.id, 'printing');
        try {
          const template = await this.barcodeRepo.getTemplateById(job.templateId);
          if (!template) {
            throw new Error(`Template ${job.templateId} not found`);
          }
          const printerName = this.resolvePrinterName();
          const receiptHtml = renderJobHtml(job, template);
          const result = await printReceipt({
            receiptHtml,
            printerName,
          });
          if (!result.ok || !result.printed) {
            throw new Error(result.errors?.join(', ') || 'Print command failed');
          }
          await this.barcodeRepo.updatePrintJobStatus(job.id, 'printed');
        } catch (error) {
          await this.barcodeRepo.updatePrintJobStatus(job.id, 'failed', formatError(error));
        }
      }
    } finally {
      this.running = false;
    }
  }
}

