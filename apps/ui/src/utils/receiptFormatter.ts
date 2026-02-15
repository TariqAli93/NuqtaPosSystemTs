import type { Sale } from '../types/domain';
import type { CompanySettings } from '../types/domain';

export interface ReceiptData {
  sale: Sale;
  companySettings: CompanySettings | null;
}

/**
 * Format a sale as a text receipt for thermal printer.
 * Uses Arabic text and proper formatting for 58mm thermal printers.
 */
export function formatReceipt(data: ReceiptData): string {
  const { sale, companySettings } = data;
  const width = 32; // Characters width for 58mm thermal printer

  const lines: string[] = [];

  // Header - Company Info
  if (companySettings?.name) {
    lines.push(centerText(companySettings.name, width));
  }
  if (companySettings?.address) {
    lines.push(centerText(companySettings.address, width));
  }
  if (companySettings?.phone) {
    lines.push(centerText(`هاتف: ${companySettings.phone}`, width));
  }
  lines.push(separator(width));

  // Invoice Info
  lines.push(`رقم الفاتورة: ${sale.invoiceNumber}`);
  if (sale.createdAt) {
    const date = new Date(sale.createdAt);
    lines.push(`التاريخ: ${date.toLocaleDateString('ar-IQ')}`);
    lines.push(`الوقت: ${date.toLocaleTimeString('ar-IQ')}`);
  }
  lines.push(separator(width));

  // Items
  lines.push('الصنف                الكمية  السعر');
  lines.push(separator(width, '-'));

  if (sale.items && sale.items.length > 0) {
    sale.items.forEach((item: any) => {
      // Product name (may wrap)
      lines.push(item.productName);
      // Quantity x Price = Subtotal
      const qty = item.quantity.toString();
      const price = formatCurrency(item.unitPrice, sale.currency);
      const subtotal = formatCurrency(item.subtotal, sale.currency);
      const itemLine = `${qty} × ${price}`;
      lines.push(rightAlign(`${itemLine} = ${subtotal}`, width));

      if (item.discount && item.discount > 0) {
        lines.push(rightAlign(`خصم: ${formatCurrency(item.discount, sale.currency)}`, width));
      }
    });
  }

  lines.push(separator(width));

  // Totals
  lines.push(formatTotal('المجموع الفرعي:', sale.subtotal, sale.currency, width));

  if (sale.discount > 0) {
    lines.push(formatTotal('الخصم:', sale.discount, sale.currency, width));
  }

  if (sale.tax > 0) {
    lines.push(formatTotal('الضريبة:', sale.tax, sale.currency, width));
  }

  lines.push(separator(width, '='));
  lines.push(formatTotal('الإجمالي:', sale.total, sale.currency, width, true));
  lines.push(separator(width, '='));

  // Payment Info
  lines.push(formatTotal('المدفوع:', sale.paidAmount, sale.currency, width));

  if (sale.remainingAmount > 0) {
    lines.push(formatTotal('المتبقي:', sale.remainingAmount, sale.currency, width));
  }

  // Payment Type
  const paymentTypeMap: Record<string, string> = {
    cash: 'نقدي',
    installment: 'تقسيط',
    mixed: 'مختلط',
  };
  lines.push(`طريقة الدفع: ${paymentTypeMap[sale.paymentType] || sale.paymentType}`);

  if (sale.notes) {
    lines.push(separator(width));
    lines.push(`ملاحظات: ${sale.notes}`);
  }

  // Footer
  lines.push(separator(width));
  lines.push(centerText('شكراً لزيارتكم', width));
  lines.push(centerText('نتمنى رؤيتكم قريباً', width));
  lines.push('');
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function separator(width: number, char: string = '='): string {
  return char.repeat(width);
}

function rightAlign(text: string, width: number): string {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    IQD: 'د.ع',
    EUR: '€',
    GBP: '£',
    SAR: 'ر.س',
    AED: 'د.إ',
  };

  const symbol = currencySymbols[currency] || currency;
  return `${amount.toFixed(2)} ${symbol}`;
}

function formatTotal(
  label: string,
  amount: number,
  currency: string,
  width: number,
  bold: boolean = false
): string {
  const amountStr = formatCurrency(amount, currency);
  const totalLength = label.length + amountStr.length;
  const padding = Math.max(1, width - totalLength);
  return label + ' '.repeat(padding) + amountStr;
}
