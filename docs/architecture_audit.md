# Nuqta POS — Evidence-Based Architecture Audit

**Date:** 2026-02-17 | **Auditor:** System Architect

---

## 1. Executive Summary

### What Actually Works (with evidence)

| Feature | Status | Evidence |
|---------|--------|----------|
| POS Sale → inventory movements | ✅ | `CreateSaleUseCase.ts:234` calls `this.inventoryRepo.createMovementSync()` per item |
| POS Sale → customer ledger (credit) | ✅ | `CreateSaleUseCase.ts:287` calls `this.customerLedgerRepo.createSync()` when `remainingAmount > 0` |
| POS Sale → customer debt update | ✅ | `SqliteCustomerLedgerRepository.ts:39-41` updates `customers.totalDebt` inside same transaction |
| Purchase → inventory movements | ✅ | `SqlitePurchaseRepository.ts:114-131` inserts `inventory_movements` per item inside transaction |
| Purchase → batch creation | ✅ | `SqlitePurchaseRepository.ts:66-84` creates `product_batches` when `item.expiryDate` is set |
| Purchase → supplier balance | ✅ | `CreatePurchaseUseCase.ts:18-19` calls `supplierRepository.updatePayable()` |
| Inventory expiry alerts | ✅ | `SqliteInventoryRepository.ts:113-136` queries `product_batches` for expiry within 30 days |

### What Is Broken (with evidence)

| Feature | Status | Root Cause (with code) |
|---------|--------|------------------------|
| **Accounting (journals)** | 🔴 SILENT SKIP | `CreateSaleUseCase.ts:325-328`: `if (!revenueAcct?.id) { console.warn(...); return; }` — chart of accounts table is **never seeded** |
| **Stock adjustments → movements** | 🔴 MISSING | `AdjustProductStockUseCase.ts:33`: only calls `this.productRepo.updateStock()` — no `inventoryRepo` injected |
| **Purchase → supplier ledger** | 🔴 NOT WIRED | `CreatePurchaseUseCase.ts:6-9`: constructor only takes `purchaseRepository` and `supplierRepository` — no `supplierLedgerRepo` |
| **Product units (standalone)** | 🔴 NO REPO | Schema `product_units` exists at `schema.ts:106-123` but no `SqliteProductUnitsRepository` file |

### Root Cause: Why It "Feels Bloated"

**One root cause, not five:** The `accounts` table is never populated. This single gap causes a cascade:

```
accounts table EMPTY
  → CreateSaleUseCase.createSaleJournalEntry() silently skips (line 325)
    → journal_entries table stays EMPTY
      → All accounting UI (ChartOfAccounts, BalanceSheet, ProfitLoss, JournalEntries) shows zeros
        → User sees 4 "dead" pages
```

Everything else is either working or fixable with tiny changes. The system is **not** bloated — it's **data-starved**.

---

## 2. Full Call-Chain Traces

### A. Sale Workflow (POS)

```
PosView.vue:handlePaymentConfirm()
  → salesStore.createSale(payload)                    // apps/ui/src/stores/salesStore.ts
    → IPC 'sales:create'                              // apps/ui/src/ipc/salesClient.ts
      → SaleHandler.ts:L35 ipcMain.handle()           // apps/electron/src/ipc/SaleHandler.ts
        → CreateSaleUseCase.execute(input, userId)     // packages/core/src/use-cases/CreateSaleUseCase.ts:416
          → .executeCommitPhase(input, userId)         // line 76

Tables written in executeCommitPhase:
  1. saleRepo.create(saleData)                  → `sales` + `sale_items`       [line 225]
  2. inventoryRepo.createMovementSync({...})    → `inventory_movements`        [line 234] (per item)
  3. productRepo.updateStock(id, -qty)          → `products.stock`             [line 253] (per item)
  4. paymentRepo.create({...})                  → `payments`                   [line 258] (if paidAmount>0)
  5. createSaleJournalEntry(...)                → `journal_entries` + `lines`  [line 271] ⚠️ SKIPPED (see below)
  6. customerLedgerRepo.createSync({...})       → `customer_ledger` + updates `customers.totalDebt` [line 287] (if credit sale)
```

**Evidence for journal entry skip** — [CreateSaleUseCase.ts:317-328](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreateSaleUseCase.ts#L317-L328):
```typescript
private createSaleJournalEntry(...): void {
    const cashAcct = this.accountingRepo.findAccountByCode(ACCT_CASH);   // '1001'
    const revenueAcct = this.accountingRepo.findAccountByCode(ACCT_REVENUE); // '4001'
    // ...
    if (!revenueAcct?.id) {
      console.warn('[CreateSaleUseCase] Chart of accounts not configured, skipping journal entry');
      return;   // ← SILENT SKIP: accounts table is empty, so this ALWAYS returns
    }
    // ... lines 330-391 never execute
}
```

**Proof accounts table is never seeded:**
- [seed.ts](file:///d:/dev_projects/nuqta/packages/data/src/seed.ts): grep `accounts` → **0 results**
- [presets.ts](file:///d:/dev_projects/nuqta/packages/data/src/presets.ts): no `accounts` property in [Preset](file:///d:/dev_projects/nuqta/packages/data/src/presets.ts#87-96) interface (line 87-95)
- All 7 migration [.sql](file:///d:/dev_projects/nuqta/packages/data/drizzle/0002_normal_gorgon.sql) files: grep `INSERT.*accounts` → **0 results**
- No `initializeChartOfAccounts` or equivalent function exists anywhere

---

### B. Purchase Workflow

```
PurchaseFormView.vue:onSubmit()
  → purchasesStore.createPurchase(payload)          // apps/ui/src/stores/purchasesStore.ts
    → IPC 'purchases:create'                         // apps/ui/src/ipc/purchasesClient.ts
      → PurchaseHandler.ts:L17 ipcMain.handle()      // apps/electron/src/ipc/PurchaseHandler.ts
        → CreatePurchaseUseCase.execute(data)         // packages/core/src/use-cases/CreatePurchaseUseCase.ts:11
          → purchaseRepository.create(data)           // line 13, handled by SqlitePurchaseRepository
          → supplierRepository.updatePayable(...)     // line 19, updates suppliers.currentBalance
```

**Inside SqlitePurchaseRepository.create()** — all within `db.transaction()` at [line 24](file:///d:/dev_projects/nuqta/packages/data/src/repositories/SqlitePurchaseRepository.ts#L24-L136):

```typescript
const created = this.db.transaction((tx) => {
  // 1. Insert purchase header                    → `purchases` table      [line 26-46]
  // 2. Per item:
  //    a. Create batch if expiryDate provided    → `product_batches`      [line 67-84]
  //    b. Insert purchase item                   → `purchase_items`       [line 86-102]
  //    c. Update product stock                   → `products.stock`       [line 105-111]
  //    d. Create inventory movement              → `inventory_movements`  [line 114-131]
  return header;
});
```

**Evidence for inventory movement creation** — [SqlitePurchaseRepository.ts:113-131](file:///d:/dev_projects/nuqta/packages/data/src/repositories/SqlitePurchaseRepository.ts#L113-L131):
```typescript
// Create Inventory Movement
tx.insert(inventoryMovements)
  .values({
    productId: item.productId,
    batchId: batchId,
    movementType: 'purchase',
    reason: `Purchase Invoice ${header.invoiceNumber}`,
    quantityBase: item.quantityBase,
    stockBefore: currentProduct?.stock || 0,
    stockAfter: (currentProduct?.stock || 0) + item.quantityBase,
    costPerUnit: item.unitCost,
    sourceType: 'purchase',
    sourceId: header.id,
  })
  .run();
```

**What's missing from purchase workflow:**
- ❌ No `supplierLedger` entry — [CreatePurchaseUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts#5-25) constructor (line 6-9) doesn't inject `ISupplierLedgerRepository`
- ❌ No journal entry — [CreatePurchaseUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts#5-25) doesn't inject [IAccountingRepository](file:///d:/dev_projects/nuqta/packages/core/src/interfaces/IAccountingRepository.ts#3-42)
- ❌ No idempotency check — `purchases` table has no `idempotencyKey` column

---

### C. Stock Adjustment Workflow

```
StockAdjustmentView.vue:adjustStock()
  → inventoryStore.adjustStock(payload)            // apps/ui/src/stores/inventoryStore.ts
    → IPC 'products:adjustStock'                    // apps/ui/src/ipc/inventoryClient.ts
      → ProductHandler.ts ipcMain.handle()          // apps/electron/src/ipc/ProductHandler.ts
        → AdjustProductStockUseCase.execute(id, qty) // packages/core/src/use-cases/AdjustProductStockUseCase.ts:7
```

**Full use-case** — [AdjustProductStockUseCase.ts:4-42](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/AdjustProductStockUseCase.ts#L4-L42):
```typescript
export class AdjustProductStockUseCase {
  constructor(private productRepo: IProductRepository) {} // ← No inventoryRepo!

  async execute(productId: number, quantityChange: number): Promise<void> {
    // ... validation ...
    await this.productRepo.updateStock(productId, quantityChange); // ← Only writes products.stock
    // ← NO inventory movement created
    // ← NO journal entry
    // ← NO audit trail (beyond product table update)
  }
}
```

**Impact:** Stock adjustments (damage, theft, correction) are invisible in the movements ledger. Running a stock audit query like `SUM(inventory_movements)` will show drift against `products.stock`.

---

### D. Accounting Read Path (What the UI sees)

```
ChartOfAccountsView.vue:onMounted()
  → accountingStore.fetchAccounts()                // apps/ui/src/stores/accountingStore.ts
    → IPC 'accounting:getAccounts'                  // apps/ui/src/ipc/accountingClient.ts
      → AccountingHandler.ts:L21                    // apps/electron/src/ipc/AccountingHandler.ts
        → GetAccountsUseCase.execute()              // packages/core/src/use-cases/
          → accountingRepo.getAccounts()            // SqliteAccountingRepository.ts:54-57
            → SELECT * FROM accounts                // ← Returns EMPTY array (never seeded)
```

**Evidence** — [SqliteAccountingRepository.ts:54-57](file:///d:/dev_projects/nuqta/packages/data/src/repositories/SqliteAccountingRepository.ts#L54-L57):
```typescript
async getAccounts(): Promise<Account[]> {
    const rows = this.db.select().from(accounts).orderBy(accounts.code).all();
    return rows as unknown as Account[];   // ← Returns [] because `accounts` table is empty
}
```

Same pattern for `ProfitLossView`, `BalanceSheetView`, `JournalEntriesView` — all read from empty tables. **No mock data.** The UI is correctly wired, fetching real data — it's just that the data is empty.

---

### E. Customer Ledger Read Path

```
CustomerLedgerView.vue:onMounted()
  → customerLedgerStore.fetchLedger(customerId)
    → IPC 'customerLedger:getLedger'
      → CustomerLedgerHandler.ts
        → GetCustomerLedgerUseCase.execute()
          → customerLedgerRepo.findAll({customerId})   // SqliteCustomerLedgerRepository.ts:54-88
            → SELECT * FROM customer_ledger WHERE customer_id = ?
```

**Status:** The pipeline works end-to-end. `customer_ledger` DOES get entries written for credit sales (via `CreateSaleUseCase:287`). **If any credit sales exist in the DB, this UI will show real data.**

---

### F. Supplier Ledger Read Path

```
SupplierLedgerView (if exists)
  → supplierLedgerStore.fetchLedger(supplierId)
    → IPC 'supplierLedger:getLedger'
      → SupplierLedgerHandler.ts:L22
        → GetSupplierLedgerUseCase.execute()
          → supplierLedgerRepo.findAll({supplierId})    // SqliteSupplierLedgerRepository.ts:49-83
            → SELECT * FROM supplier_ledger WHERE supplier_id = ?
```

**Status:** Read pipeline works, but `supplier_ledger` is **never written to** because [CreatePurchaseUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts#5-25) doesn't inject the supplier ledger repo. The `RecordSupplierPaymentUseCase` at `SupplierLedgerHandler.ts:16` CAN write to it, but that's only for manual payments — not automated on purchase creation.

---

## 3. DB Path Verification

**Electron main process** — [index.ts:33](file:///d:/dev_projects/nuqta/apps/electron/src/main/index.ts#L33):
```typescript
const defaultDbPath = path.join(app.getPath('userData'), 'Databases', 'nuqta_plus.db');
// app.getPath('userData') → C:\Users\<user>\AppData\Roaming\CodelNuqtaPlus (set at line 29)
```

**Seed script** — [seed.ts:812-817](file:///d:/dev_projects/nuqta/packages/data/src/seed.ts#L812-L817):
```typescript
const defaultDbPath = path.join(
    process.env.APPDATA || path.join(os.homedir(), '.config'),
    'CodelNuqtaPlus',
    'Databases',
    'nuqta_plus.db'
);
```

**Migrate script** — [migrate.ts:11-18](file:///d:/dev_projects/nuqta/packages/data/src/migrate.ts#L11-L18):
Same `APPDATA/CodelNuqtaPlus/Databases/nuqta_plus.db` pattern.

**Verdict:** ✅ All three resolve to the same path. DB path mismatch is **NOT** a problem.

---

## 4. Root Cause Diagnosis: "Sections Show Static/Empty"

| Module | Root Cause | Category |
|--------|------------|----------|
| **Accounting (Chart of Accounts)** | `accounts` table never seeded → [getAccounts()](file:///d:/dev_projects/nuqta/packages/core/src/interfaces/IAccountingRepository.ts#6-7) returns `[]` | **(C) Data gap** — not mock, not IPC issue, not DB mismatch. Correct IPC, correct repo, empty table. |
| **Accounting (Journals)** | `accounts` empty → [createSaleJournalEntry()](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreateSaleUseCase.ts#305-393) guard at line 325 silently returns → `journal_entries` stays empty | **(C) Data gap** — cascading from empty accounts. Code IS wired to write journals (lines 379-391). |
| **Accounting (P&L/Balance Sheet)** | Queries `journal_lines` which are empty (see above) → all sums return 0 | **(C) Cascading data gap** |
| **Supplier Ledger** | [CreatePurchaseUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts#5-25) doesn't inject `ISupplierLedgerRepository` → ledger never written on purchase | **(B) Use-case not wired** — repo exists, IPC exists, but write path missing |
| **Product Units** | Schema exists, no `SqliteProductUnitsRepository`, no IPC handler, no UI CRUD | **(B) Not implemented** beyond schema |

> **None of the modules use mock/static arrays.** Every UI page calls real IPC → real repo → real DB. The "static" appearance is 100% a data population problem and one wiring gap.

---

## 5. Wiring Gaps Matrix

| Module | Schema | Repo | Use-Case Write | Use-Case Read | IPC | UI | Shows Real Data? | Missing Link | Fix |
|--------|--------|------|---------------|---------------|-----|----|-----------------|--------------| --- |
| **Sales** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Yes | — | — |
| **Payments** | ✅ | ✅ | ✅ `CreateSaleUseCase:258` | ✅ | ✅ | ✅ | ✅ Yes | — | — |
| **Inventory Movements** | ✅ | ✅ | ✅ Sale:234, Purchase:114 | ✅ | ✅ | ✅ | ✅ Yes | [AdjustProductStockUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/AdjustProductStockUseCase.ts#4-43) doesn't write | **S** |
| **Customer Ledger** | ✅ | ✅ | ✅ `CreateSaleUseCase:287` | ✅ | ✅ | ✅ | ✅ (credit sales) | — | — |
| **Product Batches** | ✅ | ❌ standalone | ✅ `SqlitePurchaseRepo:66-84` | ✅ `SqliteInventoryRepo:77-81,118-128` | ❌ no CRUD | ⚠️ read-only via inventory | ✅ (if purchases have expiry) | No standalone CRUD repo/IPC | **M** |
| **Chart of Accounts** | ✅ | ✅ | ❌ Never seeded | ✅ `SqliteAccountingRepo:54` | ✅ | ✅ | ❌ Empty | Seed data for `accounts` table | **S** |
| **Journal Entries** | ✅ | ✅ | ⚠️ Code exists at line 379 but guard skips | ✅ `SqliteAccountingRepo:59` | ✅ | ✅ | ❌ Empty | Fix depends on seeding accounts (above) | **S** |
| **Supplier Ledger** | ✅ | ✅ | ❌ [CreatePurchaseUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts#5-25) doesn't inject | ✅ | ✅ | ✅ | ❌ Empty | Wire `supplierLedgerRepo` into [CreatePurchaseUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts#5-25) | **S** |
| **Product Units** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Full CRUD pipeline needed | **L** |
| **Purchase Idempotency** | ❌ no column | — | ❌ | — | — | ✅ (UI sends key) | — | Add column + use-case guard | **S** |

**Effort key:** S = < 1 day, M = 1-3 days, L = 1+ week

---

## 6. Duplication & Drift Analysis

### `products.stock` vs `SUM(inventory_movements)`

| Stock Writer | Creates Movement? | Evidence |
|-------------|-------------------|----------|
| [CreateSaleUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreateSaleUseCase.ts#58-422) | ✅ Yes (line 234 + 253) | Movement `out/sale` + [updateStock(-qty)](file:///d:/dev_projects/nuqta/packages/core/src/__tests__/fakes.ts#49-55) |
| `SqlitePurchaseRepo.create()` | ✅ Yes (line 114 + 105) | Movement `purchase` + direct stock update |
| [AdjustProductStockUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/AdjustProductStockUseCase.ts#4-43) | ❌ **No** (line 33 only) | [updateStock()](file:///d:/dev_projects/nuqta/packages/core/src/__tests__/fakes.ts#49-55) only — **causes drift** |

**Reconciliation mechanism:** None exists. No [ReconcileStockUseCase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/ReconcileStockUseCase.ts#25-91), no SQL trigger, no scheduled job.

### `customers.totalDebt` vs `customer_ledger`
Both are updated atomically in `SqliteCustomerLedgerRepository.createSync()` (line 14-49):
```typescript
const created = this.db.transaction((tx) => {
  const newEntry = tx.insert(customerLedger).values({...}).returning().get();
  tx.update(customers).set({ totalDebt: entry.balanceAfter }).where(...).run();
  return newEntry;
});
```
**Verdict:** ✅ Consistent — `totalDebt` is updated in same transaction as ledger entry.

### `suppliers.currentBalance` — Dual Update Problem
Two separate code paths update it:
1. `CreatePurchaseUseCase.ts:19` → `supplierRepository.updatePayable(id, remainingAmount)` — adds to balance
2. `SqliteSupplierLedgerRepository.ts:34-40` → `tx.update(suppliers).set({ currentBalance: entry.balanceAfter })` — sets absolute

**Problem:** Path 1 runs but path 2 never runs (purchase doesn't write supplier ledger). If `RecordSupplierPaymentUseCase` is called later, it will SET `currentBalance` to `balanceAfter` from its own calculation, potentially conflicting with the incremental updates from path 1.

---

## 7. Minimal Fix Plan (Top 10)

| # | Fix | Exact File(s) | What To Do | Impact |
|---|-----|--------------|------------|--------|
| **1** | **Seed chart of accounts** | [packages/data/src/seed.ts](file:///d:/dev_projects/nuqta/packages/data/src/seed.ts) | Add INSERT for accounts: `1001` Cash, `1100` AR, `1200` Inventory, `4001` Revenue, `5001` COGS. OR add to migration as default data. | 🔴 **Unlocks ALL accounting** — journal entries, P&L, balance sheet will start working |
| **2** | **AdjustProductStockUseCase → add movements** | [packages/core/src/use-cases/AdjustProductStockUseCase.ts](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/AdjustProductStockUseCase.ts) | Inject [IInventoryRepository](file:///d:/dev_projects/nuqta/packages/core/src/interfaces/IInventoryRepository.ts#4-21), call [createMovementSync()](file:///d:/dev_projects/nuqta/packages/data/src/repositories/SqliteInventoryRepository.ts#15-23) after [updateStock()](file:///d:/dev_projects/nuqta/packages/core/src/__tests__/fakes.ts#49-55) | Fixes stock drift for manual adjustments |
| **3** | **CreatePurchaseUseCase → write supplier ledger** | [packages/core/src/use-cases/CreatePurchaseUseCase.ts](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts) + [apps/electron/src/ipc/PurchaseHandler.ts](file:///d:/dev_projects/nuqta/apps/electron/src/ipc/PurchaseHandler.ts) | Add `ISupplierLedgerRepository` to constructor, call [create()](file:///d:/dev_projects/nuqta/packages/data/src/seed.ts#167-168) after purchase | Supplier ledger UI starts showing data |
| **4** | **CreatePurchaseUseCase → write journal entry** | [packages/core/src/use-cases/CreatePurchaseUseCase.ts](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts) | Add [IAccountingRepository](file:///d:/dev_projects/nuqta/packages/core/src/interfaces/IAccountingRepository.ts#3-42), create AP/Inventory journal entry on purchase (mirroring sale pattern) | Complete double-entry for purchases |
| **5** | **Unify supplier balance update** | `CreatePurchaseUseCase.ts:19` + `SqliteSupplierLedgerRepository.ts:34` | Remove direct [updatePayable()](file:///d:/dev_projects/nuqta/packages/data/src/repositories/SqliteSupplierRepository.ts#67-80) from use-case; let ledger repo's transaction handle the balance update (like customer ledger does) | Prevents dual-update drift |
| **6** | **Add `idempotencyKey` to purchases** | [packages/data/src/schema/schema.ts](file:///d:/dev_projects/nuqta/packages/data/src/schema/schema.ts) (new migration), [CreatePurchaseUseCase.ts](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreatePurchaseUseCase.ts) | Add column, add guard like `CreateSaleUseCase:82-89` | Prevents duplicate purchases |
| **7** | **Auto-seed accounts on first run** | [apps/electron/src/services/MigrationService.ts](file:///d:/dev_projects/nuqta/apps/electron/src/services/MigrationService.ts) | After `migrate()`, check if `accounts` table is empty, insert default chart of accounts | Works for new installations without running seed |
| **8** | **Add stock reconciliation query** | New file: [packages/core/src/use-cases/ReconcileStockUseCase.ts](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/ReconcileStockUseCase.ts) | Query `SUM(movements)` vs `products.stock`, return discrepancies | Detects drift from fix #2 backfill |
| **9** | **Product units: basic CRUD** | New: `SqliteProductUnitsRepository.ts` + IPC handler + UI page | CRUD for `product_units` table, connect to product detail view | Enables multi-unit selling |
| **10** | **Transaction boundary for CreateSaleUseCase** | `packages/core/src/use-cases/CreateSaleUseCase.ts:225-296` | Wrap entire [executeCommitPhase](file:///d:/dev_projects/nuqta/packages/core/src/use-cases/CreateSaleUseCase.ts#75-304) steps 5-10 in a single `db.transaction()` | Prevents partial writes on failure |

**Priority order:** Fix 1 first (30 min, unlocks 4 dead pages), then 2 (1 hr), then 3 (1 hr), then rest.

---

## 8. Verification Queries

```sql
-- 1. Verify accounts table is empty (root cause)
SELECT COUNT(*) AS count FROM accounts;
-- Expected: 0 (confirms no chart of accounts seeded)

-- 2. Verify journal_entries is empty (consequence of #1)
SELECT COUNT(*) AS count FROM journal_entries;
-- Expected: 0

-- 3. Stock drift detection (products.stock vs movements)
SELECT
  p.id, p.name, p.stock AS cached,
  COALESCE(SUM(CASE
    WHEN im.movement_type IN ('purchase','adjustment_in') THEN im.quantity_base
    WHEN im.movement_type IN ('out','sale') THEN -im.quantity_base
    ELSE 0
  END), 0) AS from_movements,
  p.stock - COALESCE(SUM(CASE
    WHEN im.movement_type IN ('purchase','adjustment_in') THEN im.quantity_base
    WHEN im.movement_type IN ('out','sale') THEN -im.quantity_base
    ELSE 0
  END), 0) AS drift
FROM products p
LEFT JOIN inventory_movements im ON im.product_id = p.id
GROUP BY p.id
HAVING drift != 0;
-- Any rows = stock adjustments happened outside movement tracking

-- 4. Verify customer_ledger has entries (for credit sales)
SELECT COUNT(*) AS ledger_entries FROM customer_ledger;
-- If credit sales exist in seed, this should be > 0

-- 5. Verify supplier_ledger is empty (known gap)
SELECT COUNT(*) AS count FROM supplier_ledger;
-- Expected: 0 (CreatePurchaseUseCase doesn't write here)
```
