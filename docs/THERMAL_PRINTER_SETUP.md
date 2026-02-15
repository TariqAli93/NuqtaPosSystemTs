# Thermal Receipt Printer Setup & Testing

## Overview

This document describes the ESC/POS USB thermal printer integration for automatic receipt printing after POS sales.

## Features Implemented

✅ **Raw ESC/POS USB Communication**

- Direct USB device communication using `node-escpos` library
- No HTML/webContents printing - sends raw ESC/POS bytes to printer

✅ **Print Status Tracking**

- Database fields: `print_status` ('pending'|'printing'|'printed'|'failed'), `printed_at`, `print_error`
- Idempotency: won't print twice if called multiple times with same sale ID

✅ **Guaranteed Paper Cut**

- Sends ESC/POS cut command after receipt prints
- Supports full cut (0x1D 0x56 0x00) or partial cut (0x1D 0x56 0x01)
- Configurable via `cutMode` setting

✅ **Cash Drawer Kick**

- Sends ESC/POS drawer kick command (0x1B 0x70 0x00 0x19 0x19)
- Opens drawer for cash payments (or all payments if configured)
- Uses standard pin 2 with 50ms pulse duration

✅ **Print Queue Management**

- Serializes multiple print jobs to prevent conflicts
- Promise-based queue ensures jobs execute in order

✅ **Fixed-Width Thermal Layout**

- 32 characters per line for 58mm paper (default)
- 48 characters per line for 80mm paper
- Right-aligned Arabic text formatting
- Properly formatted line items, totals, and receipt footer

## Architecture

```
PosView.vue (UI)
    ↓ window.electron.invoke('pos:afterPay', {saleId})
preload/index.ts (IPC allowlist)
    ↓
AfterPayHandler.ts (Orchestrator)
    ↓
    ├─→ ReceiptBuilderService.ts (Format text)
    │       ↓
    │   EscposUsbPrinterService.ts (Raw USB)
    │       ↓
    │   USB Thermal Printer (Hardware)
    │
    └─→ Database (Status tracking)
```

## Configuration

### Required Settings (in settings table)

| Key                       | Type    | Default | Description                                    |
| ------------------------- | ------- | ------- | ---------------------------------------------- |
| `receiptWidthMm`          | number  | 58      | Paper width: 58mm or 80mm                      |
| `cutPaperAfterPrint`      | boolean | true    | Auto-cut paper after print                     |
| `cutMode`                 | string  | 'full'  | Cut mode: 'full' or 'partial'                  |
| `openDrawerAfterPay`      | boolean | true    | Open drawer for cash payments                  |
| `openDrawerOnAllPayments` | boolean | false   | Open drawer for all payment types              |
| `printerVendorId`         | number  | null    | USB vendor ID (optional, auto-detect if null)  |
| `printerProductId`        | number  | null    | USB product ID (optional, auto-detect if null) |
| `receiptFooterText`       | string  | null    | Custom footer text for receipts                |

### Setting Up Printer IDs

If auto-detection fails, you can specify the USB vendor/product IDs:

1. Connect your POS-80 printer via USB
2. Find the IDs:
   - **Windows**: Device Manager → Universal Serial Bus devices → Properties → Details → Hardware IDs
   - **Linux**: Run `lsusb` command
   - **macOS**: Run `system_profiler SPUSBDataType`

3. Add to database:

```sql
INSERT INTO settings (key, value) VALUES ('printerVendorId', '0x0fe6');
INSERT INTO settings (key, value) VALUES ('printerProductId', '0x811e');
```

Common POS-80 vendor IDs:

- `0x0fe6` (ICS Advent)
- `0x04b8` (Epson)
- `0x0519` (Star Micronics)

## Testing Procedure

### Prerequisites

1. **USB Thermal Printer** (POS-80 or compatible ESC/POS printer)
2. **USB Cable** connected to computer
3. **Thermal Paper Roll** installed
4. **Printer powered on**

### Step 1: Configure Settings

Add default printer settings to database (optional, has defaults):

```bash
# Using pnpm seed or manually in Prisma Studio
pnpm db:seed
```

Or manually via SQL:

```sql
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('receiptWidthMm', '58'),
  ('cutPaperAfterPrint', 'true'),
  ('cutMode', 'full'),
  ('openDrawerAfterPay', 'true');
```

### Step 2: Start the Desktop App

```bash
pnpm dev
```

### Step 3: Create a Test Sale

1. Navigate to POS module
2. Add products to cart
3. Click "Pay" (دفع)
4. Complete payment as "Cash" (نقدي)

### Step 4: Verify Printing

**Expected Behavior:**

1. **Receipt prints** with:
   - Company name/logo area
   - Invoice number
   - Date and cashier name
   - Line items (name, qty, price, subtotal)
   - Subtotal, discount, tax, total
   - Payment method
   - Footer text
   - Blank lines for paper cut area

2. **Paper cuts** automatically (full or partial based on `cutMode`)

3. **Cash drawer opens** (if payment is cash and `openDrawerAfterPay=true`)

4. **Console logs** in Electron Dev Tools:
   ```
   [AfterPay] Result: { ok: true, data: { printed: true, cutDone: true, drawerOpened: true } }
   [AfterPay] Receipt printed: true Cut done: true Drawer opened: true
   ```

### Step 5: Test Idempotency

Try clicking "Pay" multiple times rapidly (or call `posClient.afterPay(saleId)` again):

**Expected:** Only one receipt prints. Subsequent calls return immediately without printing.

### Step 6: Test Print Queue

Create multiple sales in quick succession without waiting:

**Expected:** All receipts print in order without corruption or data loss.

## Troubleshooting

### Issue: "Failed to initialize USB device: usb.on is not a function"

**Causes:**

- Version mismatch between `escpos` and `escpos-usb` packages
- Native USB module not properly compiled for Electron runtime
- USB driver compatibility issues with alpha versions of escpos packages

**Solutions:**

1. **Verify package versions match:**

   ```bash
   # Check current versions
   cat apps/electron/package.json | grep -E "escpos|escpos-usb"

   # Should both be 3.0.0-alpha.4
   ```

2. **Reinstall native modules:**

   ```bash
   # Clean install
   rm -rf node_modules package pnpm-lock.yaml
   pnpm install --force
   ```

3. **Rebuild native USB module for Electron:**

   ```bash
   # Rebuild for Electron runtime
   npx electron-rebuild -w usb -f
   ```

4. **Run printer diagnostics:**
   - Use the `printers:diagnostics` IPC channel from the Settings UI
   - This will check USB driver availability and list detected devices
   - Follow the recommendations in the diagnostic report

5. **If all else fails, downgrade to stable versions (when available) or use alternative printing method (HTML/webContents)**

### Issue: "Device busy or not found"

**Causes:**

- Printer not connected via USB
- Printer powered off
- USB drivers missing
- Printer in use by another application

**Solutions:**

1. Check USB connection and power
2. Close any other software using the printer
3. Try different USB port
4. Restart computer (Windows sometimes locks USB devices)
5. Install printer's USB driver from manufacturer

### Issue: "Print job succeeded but paper didn't cut"

**Causes:**

- Printer doesn't support ESC/POS cut command
- Cut mode setting incorrect
- Printer's auto-cutter disabled

**Solutions:**

1. Check printer manual for ESC/POS compatibility
2. Try changing `cutMode` from 'full' to 'partial'
3. Enable auto-cutter in printer's DIP switches (hardware setting)
4. Set `cutPaperAfterPrint` to `false` to disable

### Issue: "Cash drawer didn't open"

**Causes:**

- Drawer not connected to printer's RJ-11/RJ-12 port
- Printer doesn't support drawer kick
- Wrong pin configuration

**Solutions:**

1. Verify drawer cable is connected to printer (not directly to computer)
2. Check printer manual for drawer kick support
3. Try adjusting pulse duration in `EscposUsbPrinterService.ts` line 78:
   ```typescript
   device.write(Buffer.from([0x1b, 0x70, 0x00, 0x32, 0x32])); // Longer pulse
   ```

### Issue: "Printed text is garbled or incorrect encoding"

**Causes:**

- Printer using different character encoding
- Text not in correct codepage

**Solutions:**

1. Check printer's codepage setting (usually CP864 for Arabic)
2. Update `EscposUsbPrinterService.ts` encoding initialization
3. Try different codepage in printer's DIP switches

### Issue: "Print status stuck on 'printing'"

**Causes:**

- Print job threw error before updating status
- Database transaction failed

**Solutions:**

1. Check `print_error` column in sales table
2. Manually reset status:
   ```sql
   UPDATE sales SET print_status = 'failed', print_error = 'Manual reset' WHERE id = <sale_id>;
   ```
3. Check Electron logs for error details

### Issue: "Cannot find USB device"

**Solutions:**

1. Specify USB vendor/product IDs in settings (see Configuration section)
2. Check Windows Device Manager for "Unknown USB Device" errors
3. Update USB drivers
4. Try printer on different computer to verify hardware

## Development Notes

### Files Modified/Created

**Core Services:**

- `apps/electron/src/services/EscposUsbPrinterService.ts` - USB printer communication
- `apps/electron/src/services/ReceiptBuilderService.ts` - Text formatting for thermal printers

**Database:**

- `packages/data/src/schema/schema.ts` - Added print status fields
- `packages/data/drizzle/0001_add_receipt_tracking.sql` - Migration

**IPC Handler:**

- `apps/electron/src/ipc/AfterPayHandler.ts` - Post-payment orchestrator
- `apps/electron/src/preload/index.ts` - Added 'pos:afterPay' to allowlist
- `apps/electron/src/main/index.ts` - Registered AfterPayHandler

**UI Client:**

- `apps/ui/src/ipc/posClient.ts` - Renderer-side IPC wrapper
- `apps/ui/src/modules/pos/PosView.vue` - Integrated afterPay call

### Dependencies

```json
{
  "escpos": "3.0.0-alpha.4",
  "escpos-usb": "3.0.0-alpha.4"
}
```

**Important Notes:**

- Both packages MUST be the same version to avoid compatibility issues
- Alpha versions may have bugs or API incompatibilities
- The `usb` package (node-usb) is a transitive dependency that requires native compilation
- Native modules must be rebuilt for Electron runtime using `electron-rebuild`
- If you encounter "usb.on is not a function" errors, see the Troubleshooting section above

### ESC/POS Command Reference

| Command      | Hex                      | Description                      |
| ------------ | ------------------------ | -------------------------------- |
| Initialize   | 0x1B 0x40                | Reset printer to default state   |
| Feed paper   | 0x1B 0x64 0x03           | Feed 3 lines                     |
| Full cut     | 0x1D 0x56 0x00           | Cut paper completely             |
| Partial cut  | 0x1D 0x56 0x01           | Cut paper with small tab         |
| Drawer kick  | 0x1B 0x70 0x00 0x19 0x19 | Open drawer (pin 2, 25ms pulses) |
| Bold on      | 0x1B 0x45 0x01           | Enable bold text                 |
| Bold off     | 0x1B 0x45 0x00           | Disable bold text                |
| Center align | 0x1B 0x61 0x01           | Center text                      |
| Right align  | 0x1B 0x61 0x02           | Right-align text (for Arabic)    |
| Left align   | 0x1B 0x61 0x00           | Left-align text (default)        |

## Next Steps

- [ ] Test with actual POS-80 printer hardware
- [ ] Add printer settings UI in Settings module
- [ ] Add print preview feature (optional)
- [ ] Add print history view in Sales module
- [ ] Support network (Ethernet/WiFi) thermal printers
- [ ] Add logo/image printing capability
- [ ] Support multiple printers (kitchen, receipt, etc.)
