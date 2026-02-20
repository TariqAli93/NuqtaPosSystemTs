# Nuqta Plus — ERP-Grade Architecture Specification

> **Status**: Executable Architecture Document  
> **Date**: 2026-02-20  
> **Database**: SQLite (better-sqlite3 + Drizzle ORM)  
> **Runtime**: Electron desktop, multi-user LAN scenario  
> **Currency**: IQD (integer, thousands-based, no decimals)

---

## CURRENT STATE AUDIT

### What Exists and Works

| Component                                  | Status     | Notes                                                                                                                                                          |
| ------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products` table + repo                    | ✅ Working | Stock cached as `products.stock`                                                                                                                               |
| `product_batches` table + repo             | ⚠️ Partial | Schema exists, batches created on purchase, but **FIFO depletion on sale is NOT implemented**                                                                  |
| `inventory_movements` table + repo         | ✅ Working | Movements logged for purchases, sales, adjustments                                                                                                             |
| `purchases` + `purchase_items`             | ✅ Working | `SqlitePurchaseRepository.createSync` creates batches, movements, stock updates atomically                                                                     |
| `sales` + `sale_items`                     | ⚠️ Partial | Stock decremented from `products.stock` cache only. **No batch-level FIFO depletion**. `sale_items.batchId` is passed through but never calculated server-side |
| `journal_entries` + `journal_lines`        | ✅ Working | Created for sales, purchases, payments, adjustments. Balanced entry validation exists                                                                          |
| `posting_batches`                          | ✅ Working | `PostPeriodUseCase` batch-posts unposted entries                                                                                                               |
| `accounts` (Chart of Accounts)             | ✅ Working | Seeded by `InitializeAccountingUseCase` (6 core accounts)                                                                                                      |
| `audit_logs`                               | ⚠️ Partial | Schema + repo + `AuditService` exist. Only `CreateSaleUseCase` calls audit. Other entities missing                                                             |
| `barcode_templates` + `barcode_print_jobs` | ⚠️ Partial | CRUD repo exists. **No creation flow in UI, no layout engine**                                                                                                 |
| `settings` (KV store)                      | ⚠️ Partial | Flat KV store. Works but not normalized into domains                                                                                                           |
| `withTransaction`                          | ✅ Working | Synchronous SQLite transaction wrapper exists in `db.ts`                                                                                                       |
| Double-entry validation                    | ✅ Working | `createJournalEntrySync` rejects unbalanced entries                                                                                                            |

### Critical Gaps

1. **No FIFO batch depletion on sale** — oldest batches are not consumed; `products.stock` is decremented directly
2. **COGS uses flat `costPrice`** — not weighted-average or batch-specific cost
3. **`posting_batches` not linked to source documents** — no `sourceType`/`sourceId` on posting batch
4. **Audit logging incomplete** — only sale creation is audited; product edits, price changes, settings updates, batch operations are not
5. **No negative stock prevention at batch level**
6. **No posting batch locking** — posted batches can be mutated
7. **Settings not normalized** — all in flat KV, no domain separation
8. **Barcode templates have no UI creation flow**

---

## SECTION 1 — INVENTORY ENGINE

### 1A. Purchase Posting Logic

**Current state**: `SqlitePurchaseRepository.createSync()` already performs atomically:

- Creates purchase header + items
- Creates/updates `product_batches`
- Creates `inventory_movements` (type=`in`, reason=`purchase`)
- Updates `products.stock` cache

**Current state**: `CreatePurchaseUseCase.executeCommitPhase()` adds:

- Payment record
- Supplier ledger entry
- Journal entry (Inventory DR / Cash+AP CR)

**Gap**: No `posting_batch` link on the journal entry. Journal entries are created with `isPosted: false` and batch-posted later by `PostPeriodUseCase`.

**Required Enhancement**: Add FIFO batch cost tracking to purchase items for accurate COGS calculation later.

#### Purchase Flow (Current — Already Correct)

```
┌─────────────────────────────────────────────────────────────────┐
│  withTransaction(sqlite, () => {                                │
│    1. Idempotency check                                        │
│    2. Calculate totals                                         │
│    3. purchaseRepo.createSync(purchase)                         │
│       ├─ INSERT purchases                                      │
│       ├─ For each item:                                        │
│       │   ├─ INSERT/UPDATE product_batches                     │
│       │   ├─ INSERT purchase_items (with batch_id)             │
│       │   ├─ UPDATE products.stock += quantityBase             │
│       │   └─ INSERT inventory_movements (type=in)              │
│       └─ Return created purchase with items                    │
│    4. paymentRepo.createSync(initialPayment)                   │
│    5. supplierLedgerRepo.createSync(if remainingAmount > 0)    │
│    6. accountingRepo.createJournalEntrySync({                  │
│         DR Inventory 1200  = purchase.total                    │
│         CR Cash 1001       = paidAmount                        │
│         CR AP 2100         = remainingAmount                   │
│       })                                                       │
│  })                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1B. Sale Posting Logic — FIFO Batch Depletion

**This is the CRITICAL missing piece.**

#### FIFO Algorithm

```
FUNCTION depleteBatchesFIFO(db, productId, quantityNeeded):
  // Query batches ordered by: expiryDate ASC NULLS LAST, id ASC (FIFO by receipt order)
  batches = SELECT * FROM product_batches
            WHERE product_id = {productId}
              AND quantity_on_hand > 0
              AND status = 'active'
            ORDER BY
              CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
              expiry_date ASC,
              id ASC

  remaining = quantityNeeded
  depletions = []
  totalCost = 0

  FOR batch IN batches:
    IF remaining <= 0: BREAK

    take = MIN(batch.quantity_on_hand, remaining)

    UPDATE product_batches
      SET quantity_on_hand = quantity_on_hand - take
      WHERE id = batch.id

    // If batch fully depleted, mark exhausted
    IF batch.quantity_on_hand - take == 0:
      UPDATE product_batches SET status = 'exhausted' WHERE id = batch.id

    depletions.push({
      batchId: batch.id,
      quantity: take,
      costPerUnit: batch.cost_per_unit
    })

    totalCost += take * batch.cost_per_unit
    remaining -= take

  IF remaining > 0:
    THROW InsufficientStockError("Not enough batch stock for product {productId}")

  RETURN { depletions, totalCost }
```

#### Sale Posting Transaction

```
┌─────────────────────────────────────────────────────────────────┐
│  withTransaction(sqlite, () => {                                │
│    1. Idempotency check                                        │
│    2. Validate items, resolve units                            │
│    3. For each sale item:                                      │
│       a. depleteBatchesFIFO(db, productId, quantityBase)       │
│          → returns depletions[] + batchCOGS                    │
│       b. INSERT inventory_movement per depletion:              │
│          (type=out, reason=sale, batchId=depletion.batchId)    │
│       c. UPDATE products.stock -= quantityBase                 │
│       d. Accumulate totalCOGS from batch costs                 │
│    4. Calculate sale totals (subtotal, discount, tax, interest)│
│    5. INSERT sales header                                      │
│    6. INSERT sale_items (multiple rows per item if multi-batch)│
│    7. INSERT payment (if paidAmount > 0)                       │
│    8. INSERT journal_entry:                                    │
│         DR Cash 1001        = paidAmount                       │
│         DR AR 1100          = remainingAmount                  │
│         CR Revenue 4001     = sale.total                       │
│         DR COGS 5001        = totalCOGS (from FIFO)            │
│         CR Inventory 1200   = totalCOGS (from FIFO)            │
│    9. INSERT customer_ledger (if credit sale)                  │
│  })                                                            │
│  // Side effects (non-transactional):                          │
│  10. Audit log                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Differences from Current Implementation

| Aspect                    | Current                          | Target                                                          |
| ------------------------- | -------------------------------- | --------------------------------------------------------------- |
| Stock source              | `products.stock` cache only      | FIFO from `product_batches` first, then update `products.stock` |
| COGS calculation          | `product.costPrice * qty` (flat) | Sum of `batch.cost_per_unit * depleted_qty` per batch           |
| `sale_items.batchId`      | Client-supplied or null          | Server-calculated from FIFO, may span multiple batches          |
| Negative stock prevention | Check `products.stock >= qty`    | Check sum of `product_batches.quantity_on_hand >= qty`          |
| Batch status              | Never updated on sale            | Set to `exhausted` when `quantity_on_hand = 0`                  |

#### Implementation: New FIFO Depletion Service

File: `packages/core/src/services/FifoDepletionService.ts`

```typescript
export interface BatchDepletion {
  batchId: number;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
}

export interface FifoResult {
  depletions: BatchDepletion[];
  totalCost: number;
}

export interface IFifoDepletionService {
  deplete(productId: number, quantityNeeded: number): FifoResult;
}
```

File: `packages/data/src/repositories/SqliteFifoService.ts`

```typescript
// Uses raw Drizzle queries to:
// 1. SELECT batches WHERE product_id = ? AND quantity_on_hand > 0 AND status = 'active'
//    ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date ASC, id ASC
// 2. Loop and UPDATE each batch
// 3. Return depletions array
// MUST be called inside withTransaction
```

---

## SECTION 2 — ACCOUNTING ENGINE

### 2A. Chart of Accounts Structure

Already seeded by `InitializeAccountingUseCase`. Current accounts:

| Code   | Name (AR)        | Type      | Purpose             |
| ------ | ---------------- | --------- | ------------------- |
| `1001` | الصندوق          | asset     | Cash on hand        |
| `1100` | ذمم العملاء      | asset     | Accounts Receivable |
| `1200` | المخزون          | asset     | Inventory           |
| `2100` | ذمم الموردين     | liability | Accounts Payable    |
| `4001` | إيرادات المبيعات | revenue   | Sales Revenue       |
| `5001` | تكلفة البضاعة    | expense   | Cost of Goods Sold  |

**Recommended Additions for ERP:**

| Code   | Name (AR)                 | Type      | Purpose               |
| ------ | ------------------------- | --------- | --------------------- |
| `1002` | البنك                     | asset     | Bank account          |
| `1300` | المصروفات المدفوعة مقدماً | asset     | Prepaid expenses      |
| `2200` | أوراق الدفع               | liability | Notes payable         |
| `3001` | رأس المال                 | equity    | Owner's equity        |
| `3002` | الأرباح المحتجزة          | equity    | Retained earnings     |
| `4002` | إيرادات أخرى              | revenue   | Other income          |
| `5002` | مصروفات إدارية            | expense   | Admin expenses        |
| `5003` | مصروفات البيع             | expense   | Selling expenses      |
| `5004` | خصم مسموح به              | expense   | Sales discounts given |
| `5005` | إهلاك                     | expense   | Depreciation          |

### 2B. Posting Rules

| Transaction              | Debit               | Credit              | Amount           |
| ------------------------ | ------------------- | ------------------- | ---------------- |
| **Purchase (cash)**      | Inventory 1200      | Cash 1001           | purchase.total   |
| **Purchase (credit)**    | Inventory 1200      | AP 2100             | purchase.total   |
| **Purchase (mixed)**     | Inventory 1200      | Cash 1001 + AP 2100 | paid + remaining |
| **Sale (cash)**          | Cash 1001           | Revenue 4001        | sale.total       |
| **Sale (credit)**        | AR 1100             | Revenue 4001        | sale.total       |
| **Sale (mixed)**         | Cash 1001 + AR 1100 | Revenue 4001        | paid + remaining |
| **Sale COGS**            | COGS 5001           | Inventory 1200      | FIFO batch cost  |
| **Customer payment**     | Cash 1001           | AR 1100             | payment.amount   |
| **Supplier payment**     | AP 2100             | Cash 1001           | payment.amount   |
| **Stock adjustment (-)** | COGS 5001           | Inventory 1200      | qty × costPrice  |
| **Stock adjustment (+)** | Inventory 1200      | Revenue 4002        | qty × costPrice  |

### 2C. Validation Rules

Already implemented in `SqliteAccountingRepository.createJournalEntrySync()`:

```typescript
if (totalDebit !== totalCredit) {
  throw new Error(`Unbalanced journal entry: debit=${totalDebit}, credit=${totalCredit}`);
}
```

**Additional Rules Needed:**

1. **Prevent negative stock at batch level** — FIFO depletion throws `InsufficientStockError` if total available batch stock < requested
2. **Lock posting batch after commit** — Add `status` column to `posting_batches` (`draft`, `posted`, `locked`). Once `locked`, no modifications allowed
3. **Prevent duplicate posting** — `PostPeriodUseCase` already checks `isPosted: false`
4. **Prevent reversal of reversed entries** — Already implemented in `SqlitePostingRepository.createReversalEntry()`

### 2D. Posting Batch Locking

Schema enhancement for `posting_batches`:

```sql
ALTER TABLE posting_batches ADD COLUMN status TEXT NOT NULL DEFAULT 'posted';
-- Valid values: 'draft', 'posted', 'locked'
```

After a posting batch is verified/reconciled → set `status = 'locked'`. Locked batches:

- Cannot be modified
- Cannot have entries removed
- Reversal entries create NEW journal entries (not modify old ones)

---

## SECTION 3 — AUDIT SYSTEM

### 3A. Current State

Schema exists with these fields:

- `userId`, `action`, `entityType`, `entityId`, `timestamp`
- `changedFields` (JSON), `changeDescription`, `ipAddress`, `userAgent`, `metadata` (JSON)

`AuditService` exists with `logCreate`, `logUpdate`, `logDelete`, `logAction` methods.

**Gap**: Only `CreateSaleUseCase` calls audit. All other mutations are unaudited.

### 3B. Entities Requiring Audit

| Entity                | Actions to Audit                            | Priority |
| --------------------- | ------------------------------------------- | -------- |
| `products`            | create, update (name, price, stock), delete | P0       |
| `product_batches`     | create, adjust, exhaust                     | P0       |
| `sales`               | create, cancel                              | P0       |
| `purchases`           | create, cancel                              | P0       |
| `payments`            | create                                      | P0       |
| `inventory_movements` | create (all types)                          | P1       |
| `journal_entries`     | create, reverse                             | P1       |
| `posting_batches`     | create, lock                                | P1       |
| `accounts`            | create, update                              | P1       |
| `customers`           | create, update, delete                      | P1       |
| `suppliers`           | create, update, delete                      | P1       |
| `categories`          | create, update, delete                      | P2       |
| `settings`            | update                                      | P1       |
| `users`               | create, update, deactivate                  | P0       |
| `barcode_templates`   | create, update, delete                      | P2       |

### 3C. Audit Data Format

```json
{
  "id": 142,
  "userId": 1,
  "action": "update",
  "entityType": "product",
  "entityId": 57,
  "timestamp": "2026-02-20T14:30:00.000Z",
  "changedFields": {
    "sellingPrice": { "old": 22000, "new": 25000 },
    "costPrice": { "old": 15000, "new": 16000 }
  },
  "changeDescription": "تعديل سعر البيع والتكلفة للمنتج: رز عنبر ممتاز 5 كغم",
  "metadata": {
    "productName": "رز عنبر ممتاز 5 كغم",
    "sku": "SM-RICE-5KG"
  }
}
```

### 3D. Implementation Pattern

Each use-case that mutates data should:

1. **In commit phase (transactional)**: Capture old values before mutation
2. **In side-effects phase (non-blocking)**: Write audit log

```typescript
// Inside UpdateProductUseCase.executeCommitPhase():
const oldProduct = productRepo.findById(id);
const updatedProduct = productRepo.update(id, changes);

return {
  updatedProduct,
  auditData: {
    oldValues: { sellingPrice: oldProduct.sellingPrice, costPrice: oldProduct.costPrice },
    newValues: { sellingPrice: changes.sellingPrice, costPrice: changes.costPrice },
  },
};

// Inside executeSideEffectsPhase():
await auditService.logUpdate(
  userId,
  'product',
  product.id,
  auditData.oldValues,
  auditData.newValues
);
```

### 3E. Audit for Settings Changes

```typescript
// Before:
const oldValue = settingsRepo.get(key);
// After:
settingsRepo.set(key, newValue);
auditService.logUpdate(userId, 'setting', 0, { [key]: oldValue }, { [key]: newValue });
```

---

## SECTION 4 — SETTINGS NORMALIZATION

### 4A. Current State

All settings stored in flat `settings` table as `key`/`value` pairs. Keys include:

- `company_settings` (JSON blob)
- `accounting.enabled`, `accounting.coaSeeded`, `accounting.cashAccountCode`, etc.
- `modules.accounting.enabled`, `modules.ledgers.enabled`, etc.
- `currency.base`, various module toggle keys

### 4B. Proposed Normalization

Instead of a full table restructure (which would break existing code), normalize through **key prefixes** with a typed accessor layer:

| Prefix           | Domain              | Example Keys                                                                     |
| ---------------- | ------------------- | -------------------------------------------------------------------------------- |
| `system.`        | System settings     | `system.language`, `system.timezone`, `system.backupPath`                        |
| `pos.`           | POS settings        | `pos.defaultPaymentMethod`, `pos.autoGenerateInvoice`, `pos.printerEnabled`      |
| `accounting.`    | Accounting settings | `accounting.enabled`, `accounting.cashAccountCode`, `accounting.fiscalYearStart` |
| `barcode.`       | Barcode settings    | `barcode.defaultTemplateId`, `barcode.printerType`, `barcode.dpi`                |
| `modules.`       | Module toggles      | `modules.accounting.enabled`, `modules.ledgers.enabled`, `modules.units.enabled` |
| `notifications.` | Notification prefs  | `notifications.lowStock`, `notifications.expiryAlerts`                           |
| `invoice.`       | Invoice settings    | `invoice.showLogo`, `invoice.showTaxNumber`, `invoice.footerText`                |

### 4C. Migration SQL

No schema change needed — the `settings` table already supports arbitrary keys. Migration is a **data migration** to canonicalize existing keys:

```sql
-- Migrate legacy keys to canonical prefixes (idempotent)
INSERT OR IGNORE INTO settings (key, value)
  SELECT 'system.language', value FROM settings WHERE key = 'language';

INSERT OR IGNORE INTO settings (key, value)
  SELECT 'pos.defaultPaymentMethod', value FROM settings WHERE key = 'default_payment_method';

-- Existing accounting.* keys already use correct prefix
-- Existing modules.* keys already use correct prefix
```

### 4D. Typed Settings Accessor

File: `packages/core/src/services/SettingsAccessor.ts`

```typescript
export class SettingsAccessor {
  constructor(private repo: ISettingsRepository) {}

  // System
  getLanguage(): string {
    return this.repo.get('system.language') || 'ar';
  }
  getTimezone(): string {
    return this.repo.get('system.timezone') || 'Asia/Baghdad';
  }

  // POS
  getDefaultPaymentMethod(): string {
    return this.repo.get('pos.defaultPaymentMethod') || 'cash';
  }
  isPrinterEnabled(): boolean {
    return this.repo.get('pos.printerEnabled') !== 'false';
  }

  // Accounting
  isAccountingEnabled(): boolean {
    const v = this.repo.get('accounting.enabled') ?? this.repo.get('modules.accounting.enabled');
    return v !== 'false';
  }

  // Barcode
  getDefaultTemplateId(): number | null {
    const v = this.repo.get('barcode.defaultTemplateId');
    return v ? parseInt(v, 10) : null;
  }
}
```

---

## SECTION 5 — BARCODE TEMPLATE SYSTEM

### 5A. Current Schema

Already exists:

```typescript
barcodeTemplates: {
  (id,
    name,
    width,
    height,
    barcodeType,
    showPrice,
    showName,
    showBarcode,
    showExpiry,
    layoutJson,
    isDefault,
    createdAt);
}

barcodePrintJobs: {
  (id,
    templateId,
    productId,
    productName,
    barcode,
    price,
    expiryDate,
    quantity,
    status,
    printedAt,
    printError,
    createdAt,
    createdBy);
}
```

### 5B. Layout JSON Definition

The `layoutJson` field stores a JSON structure defining the visual layout:

```json
{
  "version": 1,
  "orientation": "landscape",
  "padding": { "top": 2, "right": 2, "bottom": 2, "left": 2 },
  "elements": [
    {
      "type": "barcode",
      "x": 5,
      "y": 5,
      "width": 50,
      "height": 20,
      "format": "CODE128",
      "field": "barcode",
      "fontSize": 8,
      "showText": true
    },
    {
      "type": "text",
      "x": 5,
      "y": 28,
      "width": 50,
      "field": "productName",
      "fontSize": 10,
      "fontWeight": "bold",
      "align": "center",
      "maxLines": 2
    },
    {
      "type": "text",
      "x": 5,
      "y": 38,
      "width": 25,
      "field": "price",
      "fontSize": 12,
      "fontWeight": "bold",
      "prefix": "",
      "suffix": " IQD"
    },
    {
      "type": "text",
      "x": 30,
      "y": 38,
      "width": 25,
      "field": "expiryDate",
      "fontSize": 8,
      "prefix": "EXP: ",
      "dateFormat": "MM/YYYY"
    }
  ]
}
```

### 5C. Print Job Workflow

```
1. User selects product(s) in UI
2. User selects template (or uses default)
3. UI creates print job(s):
   POST /barcode/print-jobs
   { templateId, productId, quantity }
4. System resolves product data (name, barcode, price, expiryDate)
5. Print job created with status='pending'
6. Print renderer:
   a. Loads template + layoutJson
   b. For each job:
      - Renders barcode image (JsBarcode / qrcode)
      - Applies layout elements
      - Generates printable HTML/PDF
7. Sends to printer (Electron native print dialog or silent print)
8. Update job status: 'printing' → 'printed' or 'failed'
```

### 5D. Template Import/Export

```typescript
interface BarcodeTemplateExport {
  version: 1;
  template: {
    name: string;
    width: number;
    height: number;
    barcodeType: string;
    showPrice: boolean;
    showName: boolean;
    showBarcode: boolean;
    showExpiry: boolean;
    layoutJson: string; // The raw JSON layout
  };
}

// Export: JSON.stringify(template) → save as .nuqta-template file
// Import: read file → validate schema → insert as new template
```

### 5E. Product Linking

Products link to barcode jobs via `barcodePrintJobs.productId`. Templates are shared (not per-product). A product's barcode value comes from `products.barcode` or batch-specific codes.

---

## SECTION 6 — SQLITE BEST PRACTICES

### 6A. Already Implemented ✅

```typescript
// In createDb():
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');
```

### 6B. Recommended Additions

```sql
-- Add to createDb() pragmas:
PRAGMA busy_timeout = 5000;    -- Wait 5s for locks instead of failing immediately
PRAGMA cache_size = -8000;     -- 8MB page cache (negative = KB)
PRAGMA temp_store = MEMORY;    -- Temp tables in memory
PRAGMA mmap_size = 268435456;  -- 256MB memory-mapped I/O
```

### 6C. Indexing Strategy

**Existing indexes** (from schema): All critical foreign keys and lookup fields are indexed.

**Recommended additions:**

```sql
-- FIFO batch depletion (critical for sale performance)
CREATE INDEX IF NOT EXISTS idx_batches_fifo
  ON product_batches(product_id, status, expiry_date, id)
  WHERE quantity_on_hand > 0 AND status = 'active';

-- Inventory movement source lookup
-- Already exists: idx_inv_mov_source ON (source_type, source_id)

-- Journal entry posting status
CREATE INDEX IF NOT EXISTS idx_journal_unposted
  ON journal_entries(is_posted, entry_date)
  WHERE is_posted = 0;

-- Audit log efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs(entity_type, entity_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user_time
  ON audit_logs(user_id, timestamp);

-- Settings key lookup (already has UNIQUE on key)

-- Sale items by product (for top-selling queries)
CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON sale_items(product_id, sale_id);

-- Payments by idempotency key
-- Already exists: idx_payments_idempotency
```

### 6D. CHECK Constraints

Add via migration:

```sql
-- Ensure movement types are valid
-- (Drizzle doesn't support CHECK natively, add via raw SQL migration)

-- In migration file:
ALTER TABLE inventory_movements ADD CONSTRAINT chk_movement_type
  CHECK (movement_type IN ('in', 'out', 'adjust'));

-- Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT.
-- These must be added as table-level constraints in initial schema
-- or via CREATE TABLE ... AS SELECT pattern for existing tables.

-- For NEW tables or schema recreation:
CREATE TABLE IF NOT EXISTS inventory_movements_v2 (
  ...
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjust')),
  ...
);
```

**Practical approach**: Add CHECK constraints in Drizzle schema definition for new migrations. For existing tables, enforce in application code (which is already done).

### 6E. Triggers (Conservative Use)

SQLite triggers should be used sparingly. Recommended only for:

```sql
-- Auto-update products.updatedAt on any change
CREATE TRIGGER IF NOT EXISTS trg_products_updated_at
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
END;

-- Auto-update batch status when quantity reaches 0
CREATE TRIGGER IF NOT EXISTS trg_batch_exhausted
AFTER UPDATE OF quantity_on_hand ON product_batches
WHEN NEW.quantity_on_hand <= 0 AND OLD.quantity_on_hand > 0
BEGIN
  UPDATE product_batches SET status = 'exhausted' WHERE id = NEW.id;
END;
```

**Do NOT use triggers for**: Journal entries, audit logs, inventory movements — these require business logic context that triggers cannot provide.

### 6F. Race Condition Prevention

SQLite in WAL mode with `busy_timeout = 5000` handles concurrent reads well. For writes:

1. **All multi-table writes use `withTransaction()`** — already enforced
2. **Idempotency keys prevent duplicate operations** — already on sales, purchases, payments
3. **FIFO depletion is deterministic** — ORDER BY `expiry_date ASC, id ASC` gives same result regardless of timing
4. **Electron desktop = single process** — no multi-process write contention
5. **LAN scenario**: Only one Electron instance writes to the DB file. If multi-writer is needed, use a lock file or single-writer architecture with IPC.

### 6G. FIFO Ordering Determinism

The FIFO query MUST be deterministic:

```sql
SELECT * FROM product_batches
WHERE product_id = ?
  AND quantity_on_hand > 0
  AND status = 'active'
ORDER BY
  CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,  -- non-null dates first
  expiry_date ASC,                                     -- earliest expiry first
  id ASC                                               -- tie-breaker: first received
```

This ensures:

- Batches with expiry dates are consumed before non-expiry batches
- Among batches with expiry dates, earliest expiry goes first (FEFO within FIFO)
- Among same-expiry batches, first-received (lowest id) goes first
- Fully deterministic — same query always returns same order

---

## IMPLEMENTATION PRIORITY

### Phase 1 — FIFO Engine (Critical)

1. Create `FifoDepletionService` interface in core
2. Implement `SqliteFifoService` in data layer
3. Refactor `CreateSaleUseCase` to use FIFO depletion instead of flat stock
4. Update COGS calculation to use batch-level costs
5. Add FIFO index to `product_batches`
6. Write integration tests for FIFO depletion

### Phase 2 — Accounting Hardening

1. Add `status` column to `posting_batches` (migration)
2. Add posting batch locking logic
3. Extend Chart of Accounts with additional accounts
4. Add balance reconciliation checks

### Phase 3 — Audit Completeness

1. Add audit calls to all mutation use-cases
2. Implement old/new value capture pattern
3. Add audit for settings changes

### Phase 4 — Settings & Barcode

1. Implement `SettingsAccessor` typed service
2. Build barcode template creation UI flow
3. Implement print job rendering pipeline

### Phase 5 — SQLite Optimizations

1. Add recommended pragmas
2. Create migration for additional indexes
3. Add triggers for auto-updates

---

## DRIZZLE MIGRATION FILE

File: `packages/data/drizzle/0009_erp_engine.sql`

```sql
-- ============================================================
-- Migration 0009: ERP Engine Enhancements
-- ============================================================

-- 1. Add status column to posting_batches for locking
ALTER TABLE posting_batches ADD COLUMN status TEXT NOT NULL DEFAULT 'posted';

-- 2. Add partial index for FIFO batch queries
CREATE INDEX IF NOT EXISTS idx_batches_fifo_active
  ON product_batches(product_id, expiry_date, id)
  WHERE quantity_on_hand > 0 AND status = 'active';

-- 3. Add index for unposted journal entries
CREATE INDEX IF NOT EXISTS idx_journal_unposted
  ON journal_entries(is_posted, entry_date)
  WHERE is_posted = 0;

-- 4. Add audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs(entity_type, entity_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user_time
  ON audit_logs(user_id, timestamp);

-- 5. Add sale items product index
CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON sale_items(product_id, sale_id);

-- 6. Additional chart of accounts (idempotent)
INSERT OR IGNORE INTO accounts (code, name, name_ar, account_type, is_system, is_active, balance)
VALUES
  ('1002', 'البنك', 'البنك', 'asset', 1, 1, 0),
  ('3001', 'رأس المال', 'رأس المال', 'equity', 1, 1, 0),
  ('3002', 'الأرباح المحتجزة', 'الأرباح المحتجزة', 'equity', 1, 1, 0),
  ('4002', 'إيرادات أخرى', 'إيرادات أخرى', 'revenue', 1, 1, 0),
  ('5002', 'مصروفات إدارية', 'مصروفات إدارية', 'expense', 1, 1, 0),
  ('5003', 'مصروفات البيع', 'مصروفات البيع', 'expense', 1, 1, 0),
  ('5004', 'خصم مسموح به', 'خصم مسموح به', 'expense', 1, 1, 0);
```

---

## APPENDIX A — FIFO DEPLETION IMPLEMENTATION (EXECUTABLE)

### Core Interface

```typescript
// packages/core/src/services/FifoDepletionService.ts

export interface BatchDepletion {
  batchId: number;
  batchNumber: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
}

export interface FifoDepletionResult {
  depletions: BatchDepletion[];
  totalCost: number;
  weightedAverageCost: number;
}

export interface IFifoDepletionService {
  /**
   * Deplete stock from oldest batches first (FIFO/FEFO).
   * MUST be called inside a transaction.
   * Throws InsufficientStockError if total batch stock < quantityNeeded.
   */
  deplete(productId: number, quantityNeeded: number): FifoDepletionResult;

  /**
   * Get available batch stock for a product (sum of quantity_on_hand).
   */
  getAvailableStock(productId: number): number;
}
```

### SQLite Implementation

```typescript
// packages/data/src/services/SqliteFifoService.ts

import { sql, eq, and, gt } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { productBatches } from '../schema/schema.js';
import { InsufficientStockError } from '@nuqtaplus/core';
import type { IFifoDepletionService, FifoDepletionResult, BatchDepletion } from '@nuqtaplus/core';

export class SqliteFifoService implements IFifoDepletionService {
  constructor(private db: DbClient) {}

  deplete(productId: number, quantityNeeded: number): FifoDepletionResult {
    if (quantityNeeded <= 0) {
      return { depletions: [], totalCost: 0, weightedAverageCost: 0 };
    }

    // Query batches in FIFO/FEFO order
    const batches = this.db
      .select()
      .from(productBatches)
      .where(
        and(
          eq(productBatches.productId, productId),
          gt(productBatches.quantityOnHand, 0),
          eq(productBatches.status, 'active')
        )
      )
      .orderBy(
        sql`CASE WHEN ${productBatches.expiryDate} IS NULL THEN 1 ELSE 0 END`,
        sql`${productBatches.expiryDate} ASC`,
        sql`${productBatches.id} ASC`
      )
      .all();

    let remaining = quantityNeeded;
    const depletions: BatchDepletion[] = [];
    let totalCost = 0;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const take = Math.min(batch.quantityOnHand, remaining);
      const costPerUnit = batch.costPerUnit || 0;
      const batchCost = take * costPerUnit;

      // Update batch quantity
      const newQty = batch.quantityOnHand - take;
      this.db
        .update(productBatches)
        .set({
          quantityOnHand: newQty,
          status: newQty <= 0 ? 'exhausted' : 'active',
        })
        .where(eq(productBatches.id, batch.id))
        .run();

      depletions.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: take,
        costPerUnit,
        totalCost: batchCost,
      });

      totalCost += batchCost;
      remaining -= take;
    }

    if (remaining > 0) {
      throw new InsufficientStockError(`Insufficient batch stock for product ${productId}`, {
        productId,
        requested: quantityNeeded,
        available: quantityNeeded - remaining,
      });
    }

    return {
      depletions,
      totalCost,
      weightedAverageCost: quantityNeeded > 0 ? totalCost / quantityNeeded : 0,
    };
  }

  getAvailableStock(productId: number): number {
    const result = this.db
      .select({ total: sql<number>`COALESCE(SUM(quantity_on_hand), 0)` })
      .from(productBatches)
      .where(
        and(
          eq(productBatches.productId, productId),
          gt(productBatches.quantityOnHand, 0),
          eq(productBatches.status, 'active')
        )
      )
      .get();

    return result?.total || 0;
  }
}
```

---

## APPENDIX B — TRANSACTION WRAPPER PATTERNS

### Pattern 1: Sale with FIFO (Synchronous Transaction)

```typescript
// In SaleHandler.ts (IPC layer):
const result = withTransaction(sqlite, () => {
  return createSaleUseCase.executeCommitPhase(input, userId);
});
// Non-transactional side effects:
await createSaleUseCase.executeSideEffectsPhase(result);
```

### Pattern 2: Purchase Posting (Already Correct)

```typescript
const result = withTransaction(sqlite, () => {
  return createPurchaseUseCase.executeCommitPhase(input, userId);
});
```

### Pattern 3: Stock Adjustment

```typescript
const movement = withTransaction(sqlite, () => {
  return adjustStockUseCase.executeCommitPhase(input, userId);
});
```

### Pattern 4: Period Posting

```typescript
const batch = withTransaction(sqlite, () => {
  return postPeriodUseCase.execute(input, userId);
});
```

All patterns follow the same rule: **`withTransaction` callback MUST be synchronous** (enforced by `SyncResult<T>` type).

---

## APPENDIX C — DATA INTEGRITY CHECKS

### Reconciliation Queries

```sql
-- 1. Verify products.stock matches sum of inventory_movements
SELECT
  p.id,
  p.name,
  p.stock AS cached_stock,
  COALESCE(SUM(
    CASE
      WHEN im.movement_type = 'in' THEN im.quantity_base
      WHEN im.movement_type = 'out' THEN -im.quantity_base
      WHEN im.movement_type = 'adjust' THEN im.quantity_base
    END
  ), 0) AS ledger_stock,
  p.stock - COALESCE(SUM(
    CASE
      WHEN im.movement_type = 'in' THEN im.quantity_base
      WHEN im.movement_type = 'out' THEN -im.quantity_base
      WHEN im.movement_type = 'adjust' THEN im.quantity_base
    END
  ), 0) AS drift
FROM products p
LEFT JOIN inventory_movements im ON im.product_id = p.id
GROUP BY p.id
HAVING drift != 0;

-- 2. Verify batch stock matches product stock
SELECT
  p.id,
  p.name,
  p.stock AS product_stock,
  COALESCE(SUM(pb.quantity_on_hand), 0) AS batch_stock,
  p.stock - COALESCE(SUM(pb.quantity_on_hand), 0) AS drift
FROM products p
LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
GROUP BY p.id
HAVING drift != 0;

-- 3. Verify all journal entries are balanced
SELECT
  je.id,
  je.entry_number,
  SUM(jl.debit) AS total_debit,
  SUM(jl.credit) AS total_credit,
  SUM(jl.debit) - SUM(jl.credit) AS imbalance
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
GROUP BY je.id
HAVING imbalance != 0;

-- 4. Verify customer debt matches ledger
SELECT
  c.id,
  c.name,
  c.total_debt AS cached_debt,
  COALESCE(
    (SELECT balance_after FROM customer_ledger
     WHERE customer_id = c.id ORDER BY id DESC LIMIT 1),
    0
  ) AS ledger_debt,
  c.total_debt - COALESCE(
    (SELECT balance_after FROM customer_ledger
     WHERE customer_id = c.id ORDER BY id DESC LIMIT 1),
    0
  ) AS drift
FROM customers c
HAVING drift != 0;
```

These queries should be run periodically (e.g., daily backup routine) and exposed via a "System Health" dashboard panel.
