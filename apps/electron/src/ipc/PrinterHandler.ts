// PrinterHandler.ts
import { ipcMain } from 'electron';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToResult } from '../services/IpcErrorMapperService.js';
import { assertPayload } from '../services/IpcPayloadValidator.js';
import { spawn } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { getNuqtaPrinterExePath } from '../services/PrinterPaths.js';

const NUQTA_PRINTER_PATH = getNuqtaPrinterExePath();

type PrintRequest = {
  receiptHtml: string;
  printerName: string;
  cut?: 'full' | 'partial' | 'none';
  kickPin?: 0 | 1; // drawer pin
  feedLines?: number; // default 5
};

type PrintResponse = {
  ok: boolean;
  printed: boolean;
  cutDone: boolean;
  drawerOpened: boolean;
  errors?: string[];
};

// ✅ shared function: use this from AfterPay + IPC
export async function printReceipt(req: PrintRequest): Promise<PrintResponse> {
  const errors: string[] = [];

  // Write HTML to a temp file to avoid command-line length issues on Windows
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuqta-receipt-'));
  const htmlPath = path.join(tmpDir, `receipt-${Date.now()}.html`);
  fs.writeFileSync(htmlPath, req.receiptHtml ?? '', 'utf-8');

  const htmlToBase64 = Buffer.from(req.receiptHtml ?? '', 'utf-8').toString('base64');

  const cut = req.cut ?? 'full';
  const feedLines = Number.isFinite(req.feedLines) ? String(req.feedLines) : '5';
  const kickPin = (req.kickPin ?? 0) === 1 ? '1' : '0';

  // NuqtaPrinter.exe print --printer "XP-80T" --text "Text Here" --cut full --kick 0 --feed 5

  // NOTE:
  // - If your C# app does NOT support --html-file, change it to whatever it supports.
  // - This is the single place to change the contract.
  const args = [
    'print',
    '--printer',
    req.printerName,
    '--text', // <-- signals that we're passing text content (vs a raw file or something)
    htmlToBase64, // <-- pass the HTML content as a base64-encoded string argument
    '--cut',
    cut === 'none' ? 'none' : cut,
    '--kick',
    kickPin,
    '--feed',
    feedLines,
  ];

  const { exitCode, stdout, stderr } = await runProcess(NUQTA_PRINTER_PATH, args, 45_000);

  // cleanup temp
  try {
    fs.unlinkSync(htmlPath);
    fs.rmdirSync(tmpDir);
  } catch {
    // ignore cleanup errors
  }

  if (stderr?.trim()) errors.push(stderr.trim());

  if (exitCode !== 0) {
    errors.push(`Printer process exited with code ${exitCode}`);
    return { ok: false, printed: false, cutDone: false, drawerOpened: false, errors };
  }

  // If C# returns JSON, use it; otherwise assume success
  const parsed = tryParseJson(stdout);
  if (parsed && typeof parsed === 'object') {
    return {
      ok: parsed.ok ?? true,
      printed: parsed.printed ?? true,
      cutDone: parsed.cutDone ?? cut !== 'none',
      drawerOpened: parsed.drawerOpened ?? kickPin === '1',
      errors: parsed.errors?.length ? parsed.errors : errors.length ? errors : undefined,
    };
  }

  return {
    ok: true,
    printed: true,
    cutDone: cut !== 'none',
    drawerOpened: kickPin === '1',
    errors: errors.length ? errors : undefined,
  };
}

export function registerPrinterHandlers(): void {
  ipcMain.handle('printers:getAll', async (_event) => {
    try {
      requirePermission({ permission: 'sales:create' });

      return await new Promise((resolve) => {
        const child = spawn(NUQTA_PRINTER_PATH, ['list']);
        let stdoutBuffer = '';
        let stderrBuffer = '';

        child.stdout.on('data', (data) => (stdoutBuffer += data.toString()));
        child.stderr.on('data', (data) => (stderrBuffer += data.toString()));

        child.on('close', (code) => {
          if (stderrBuffer) console.error(`[nuqta-printer:list] stderr:`, stderrBuffer);
          if (code !== 0) {
            resolve(mapErrorToResult(new Error(`Printer process exited with code ${code}`)));
            return;
          }
          const printersParsed = JSON.parse(stdoutBuffer);
          resolve(ok({ ok: true, printers: printersParsed.printers || [] }));
        });

        child.on('error', (err) => resolve(mapErrorToResult(err)));
      });
    } catch (error: unknown) {
      return mapErrorToResult(error);
    }
  });

  ipcMain.handle(
    'printers:print',
    async (
      _event,
      payload: {
        receiptHtml: unknown;
        printerName: unknown;
        cut?: unknown;
        kickPin?: unknown;
        feedLines?: unknown;
      }
    ) => {
      try {
        requirePermission({ permission: 'sales:create' });

        const body = assertPayload('printers:print', payload, ['data']);

        const res = await printReceipt({
          receiptHtml: String(body.receiptHtml ?? ''),
          printerName: String(body.printerName ?? ''),
          cut: (body.cut as any) ?? 'full',
          kickPin: (body.kickPin as any) ?? 0,
          feedLines: (body.feedLines as any) ?? 5,
        });

        console.log(res);

        return ok(res);
      } catch (error: unknown) {
        return mapErrorToResult(error);
      }
    }
  );
}

function runProcess(exe: string, args: string[], timeoutMs: number) {
  return new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Printer process timeout'));
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}

function tryParseJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}
