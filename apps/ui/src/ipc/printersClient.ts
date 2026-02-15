import type { ApiResult } from './contracts';
import { invoke } from './invoke';

export interface Printer {
  name: string;
  isDefault: boolean;
}

export interface PrintOptions {
  receiptHtml: string | unknown; // HTML content to print; treated as string in handler
  printerName: string | unknown; // null or empty means use default printer
  cut: 'none' | 'full' | 'partial' | unknown; // if silent, don't cut the paper
  kickPin: number | unknown; // default to not kicking cash drawer; can be made configurable if needed
  feedLines: number | unknown; // default feed lines after print; can be made configurable if needed
}

export const printersClient = {
  /**
   * Get all available printers on the system
   */
  getAll: (): Promise<ApiResult<Printer[]>> => invoke<Printer[]>('printers:getAll'),

  /**
   * Print receipt content to a printer
   * @param options - Print options including content and optional printer name
   */
  print: (options: PrintOptions): Promise<ApiResult<{ printed: boolean }>> =>
    invoke<{ printed: boolean }>('printers:print', { data: options }),
};
