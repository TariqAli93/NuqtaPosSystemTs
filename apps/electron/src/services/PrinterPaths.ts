import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getNuqtaPrinterExePath(): string {
  const packagedPath = path.join(process.resourcesPath, 'printer', 'NuqtaPrinter.exe');
  if (app.isPackaged) return packagedPath;

  const devPath = path.join(__dirname, '..', '..', 'src', 'Printer', 'NuqtaPrinter.exe');

  if (!fs.existsSync(devPath)) {
    throw new Error(`[Printer] NuqtaPrinter.exe not found. Expected: ${devPath}`);
  }

  return app.isPackaged ? packagedPath : devPath;
}
