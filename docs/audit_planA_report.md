# Plan A Audit Report (Phase 0 + Phase 1)

Date: 2026-02-17
Repo: `d:/dev_projects/nuqta`
Scope: Inventory + Accounting + AR/AP ledgers + UI wiring + TS build issue

## 1) System Wiring Map (Current State)

### 1.1 Create Sale flow
- UI: `apps/ui/src/modules/pos/PosView.vue` -> `salesStore.createSale` -> `salesClient.create`
- IPC: `apps/electron/src/ipc/SaleHandler.ts` (`sales:create`)
- Use case: `packages/core/src/use-cases/CreateSaleUseCase.ts`
- Repos:
  - sale: `SqliteSaleRepository`
  - product stock: `SqliteProductRepository.updateStock`
  - payments: `SqlitePaymentRepository.create`
  - inventory: `SqliteInventoryRepository.createMovementSync`
  - accounting: `SqliteAccountingRepository.createJournalEntry`
  - customer ledger: `SqliteCustomerLedgerRepository.createSync`
- DB tables touched: `sales`, `sale_items`, `payments`, `inventory_movements`, `journal_entries`, `journal_lines`, `customer_ledger`, `customers`
- Transaction boundary: wrapped by `withTransaction(db.sqlite, () => executeCommitPhase(...))` in `SaleHandler`
- Drift points:
  - `sale_items` insert omits `unit_name`, `unit_factor`, `quantity_base`, `batch_id` although schema has these fields.
  - Journal creation does not enforce debit/credit equality guard.
  - Missing stable source uniqueness for accounting/inventory duplication defense (relies only on top-level sale idempotency).
  - `sales:cancel` and `sales:refund` only flip status, no inventory/journal/ledger reversal.

### 1.2 Create Purchase flow
- UI: `PurchaseFormView.vue` -> `purchasesStore.createPurchase` -> `purchasesClient.create`
- IPC: `apps/electron/src/ipc/PurchaseHandler.ts` (`purchases:create`)
- Use case: `packages/core/src/use-cases/CreatePurchaseUseCase.ts`
- Repo: `SqlitePurchaseRepository.create`
- DB tables touched inside repo transaction: `purchases`, `purchase_items`, `products`, `product_batches`, `inventory_movements`
- Drift points:
  - No idempotency key at use-case/repo/schema level.
  - Use-case only updates supplier payable cache; no supplier ledger entry.
  - No accounting journal entry.
  - Inventory movement uses `movement_type='purchase'` (schema/entity expect `in|out|adjust`), causing reconciliation/report drift.
  - UI/IPC payload mismatch risk: handler uses raw `data`, while client sends `{ data: ... }`.

### 1.3 Stock Adjustment flow
- UI: `StockAdjustmentView.vue` -> `inventoryStore.adjustStock` -> IPC `products:adjustStock`
- IPC: `apps/electron/src/ipc/ProductHandler.ts`
- Use case: `AdjustProductStockUseCase`
- Repo: `SqliteProductRepository.updateStock`
- Drift points:
  - No `inventory_movements` entry for adjustments.
  - No optional accounting entry for adjustment/shrinkage.
  - UI sends `idempotencyKey` but flow ignores it.

### 1.4 Customer payment flow (AR)
- UI: `CustomerProfileView.vue` -> `customerLedgerClient.recordPayment`
- IPC: `CustomerLedgerHandler.ts`
- Use case: `RecordCustomerPaymentUseCase`
- Repos: payment + customer_ledger
- Drift points:
  - Handler expects top-level fields but client sends `{ data: ... }`/`{ params: ... }` -> current channel contract mismatch.
  - Use case creates payment + ledger only; accounting journal missing.
  - Balance calculation uses `customers.totalDebt`, not explicit last-ledger balance fetch.
  - No idempotency for payments.

### 1.5 Supplier payment flow (AP)
- UI client exists: `supplierLedgerClient.ts` (no supplier detail page wired yet)
- IPC: `SupplierLedgerHandler.ts`
- Use case: `RecordSupplierPaymentUseCase`
- Repos: supplier_ledger (payment repo injected but unused)
- Drift points:
  - No payment record currently created in use case.
  - No accounting journal entry.
  - `SqliteSupplierLedgerRepository.getBalance` reads `totalPayable` field that does not exist (`suppliers.currentBalance` is actual schema field).
  - No idempotency for payments.

### 1.6 Accounting reports read path
- UI: accounting views -> `accountingStore` -> `accountingClient`
- IPC: `AccountingHandler.ts`
- Use cases: `GetAccounts/GetJournalEntries/GetTrialBalance/GetProfitLoss/GetBalanceSheet`
- Repo: `SqliteAccountingRepository`
- Drift points:
  - Report pipeline is wired, but writes are sparse/incomplete (purchase/payment flows do not generate journals), so reports can be empty or misleading.
  - `accounts.balance` is not maintained from journals (informational only), while reports use journal lines.

## 2) Repository Interface Sync/Async Map (Current)

### 2.1 Sync-oriented interfaces
- `ISaleRepository`: sync methods, includes `findByIdempotencyKey`.
- `IProductRepository`: sync methods.
- `ICustomerRepository`: sync methods.
- `IPaymentRepository`: sync methods only (`create`, `findBySaleId`, `delete`).
- `ISettingsRepository`: sync methods.
- `IAuditRepository`: sync methods.
- `ICategoryRepository`, `IUserRepository`: sync methods.

### 2.2 Async-oriented interfaces
- `IPurchaseRepository`: async methods only.
- `ISupplierRepository`: async methods only.
- `IInventoryRepository`: mixed (async reads + `createMovementSync`).
- `ICustomerLedgerRepository`: mixed (`createSync` exists, no `getLastBalanceSync`).
- `ISupplierLedgerRepository`: async only (no sync helpers).
- `IAccountingRepository`: mixed (sync write `createJournalEntry`, async reads).

### 2.3 Drift summary
- Cross-use-case transaction safety is inconsistent because sync and async repos are mixed within workflows that should be atomic.

## 3) Transaction Helper Mechanism
- Defined in `packages/data/src/db.ts`:
  - `withTransaction(sqlite, fn)` wraps better-sqlite3 native transaction.
  - Enforces synchronous callback (throws on async/thenable return).
- Currently used in `SaleHandler` for sale creation and add-payment.
- Purchase/ledger/accounting handlers mostly do not use the same transaction boundary.

## 4) IPC Handlers and Channel Map (Relevant)

### Sales
- `sales:create`, `sales:addPayment`, `sales:getById`, `sales:getAll`, `sales:cancel`, `sales:refund`, `sales:generateReceipt`

### Purchases/Suppliers/Inventory/Accounting
- `purchases:create`, `purchases:getAll`, `purchases:getById`
- `suppliers:create`, `suppliers:update`, `suppliers:delete`, `suppliers:getAll`, `suppliers:getById`
- `inventory:getMovements`, `inventory:getDashboardStats`, `inventory:getExpiryAlerts`
- `accounting:getAccounts`, `accounting:getJournalEntries`, `accounting:getEntryById`, `accounting:getTrialBalance`, `accounting:getProfitLoss`, `accounting:getBalanceSheet`

### Ledgers
- `customerLedger:getLedger`, `customerLedger:recordPayment`, `customerLedger:addAdjustment`
- `supplierLedger:getLedger`, `supplierLedger:recordPayment`

## 5) UI Placeholder/Drift Findings (Targeted Modules)
- Suppliers module is wired to store/client but missing supplier detail page (ledger + history + payable actions).
- Purchases pages are wired, but fields drift from schema (`totalAmount` vs `total`) and detail view lacks payments/ledger/movements context.
- Inventory pages are wired, but no reconciliation report page and adjustments do not produce movement records.
- Accounting pages are wired to real APIs but rely on incomplete journal write coverage.
- Multiple IPC payload-shape mismatches make some pages effectively non-functional despite non-static UI.

## 6) Plan A Target State
- Inventory source of truth: `inventory_movements` ledger for all stock deltas.
- AR/AP source of truth: `customer_ledger` / `supplier_ledger` with cached balances (`customers.totalDebt`, `suppliers.currentBalance`) strictly reconciled.
- Accounting source of truth: balanced `journal_entries` + `journal_lines` for sales, purchases, and payments.
- Every business write flow idempotent by key for sale/purchase/payment.
- Every multi-step write wrapped in one transaction.
- UI routes/pages consume real IPC/store data and show explicit empty-state when no records.

## 7) Data Invariants To Enforce
1. Stock: `products.stock == ledger_sum(product)` where ledger sum is +in -out +adjust.
2. Customer debt: `customers.totalDebt == latest customer_ledger.balanceAfter` and equals signed sum.
3. Supplier balance: `suppliers.currentBalance == latest supplier_ledger.balanceAfter` and equals signed sum.
4. Journals: for each `journal_entry`, `sum(debit) == sum(credit)`.
5. Idempotency: same key must return existing sale/purchase/payment and create zero duplicate side-effects.

## 8) Modules Planned For Modification
- Schema/migrations:
  - `packages/data/src/schema/schema.ts`
  - `packages/data/drizzle/*` (new migration for idempotency/indexes)
- Core interfaces/use-cases:
  - `ISaleRepository`, `IPurchaseRepository`, `IPaymentRepository`, `IInventoryRepository`, `IAccountingRepository`, `ICustomerLedgerRepository`, `ISupplierLedgerRepository`
  - `CreateSaleUseCase`, `CreatePurchaseUseCase`, `AdjustProductStockUseCase`, `AddPaymentUseCase`
  - `RecordCustomerPaymentUseCase`, `RecordSupplierPaymentUseCase`
  - new: `ReconcileCustomerDebtUseCase`, `ReconcileSupplierBalanceUseCase`
- Data repositories:
  - `SqliteSaleRepository`, `SqlitePurchaseRepository`, `SqlitePaymentRepository`, `SqliteInventoryRepository`, `SqliteAccountingRepository`, `SqliteCustomerLedgerRepository`, `SqliteSupplierLedgerRepository`, `SqliteSupplierRepository`
- IPC:
  - `SaleHandler`, `PurchaseHandler`, `ProductHandler`, `InventoryHandler`, `CustomerLedgerHandler`, `SupplierLedgerHandler`, `SupplierHandler`, `CustomerHandler`, preload allowlist
- UI wiring:
  - stores/clients/views under suppliers, purchases, inventory, accounting (+ supplier detail/reconciliation views)
- Build config:
  - `packages/core/tsconfig.json` and any related package tsconfigs
- Seed/tests:
  - `packages/data/src/seed.ts`
  - core/data tests for sale/purchase/payment/journal/idempotency/stock

## 9) Verification Plan (Will execute after implementation)

### 9.1 Functional scenarios
- Cash sale, credit sale, mixed sale.
- Purchase with partial payment (AP open).
- Customer payment reducing AR.
- Supplier payment reducing AP.
- Stock adjustment with movement.
- Idempotent retries for sale/purchase/payment.

### 9.2 SQL checks
- Stock drift:
```sql
SELECT p.id, p.name, p.stock AS cached_stock,
       COALESCE(SUM(CASE
         WHEN im.movement_type = 'in' THEN im.quantity_base
         WHEN im.movement_type = 'out' THEN -im.quantity_base
         WHEN im.movement_type = 'adjust' THEN im.quantity_base
         ELSE 0 END), 0) AS ledger_stock,
       p.stock - COALESCE(SUM(CASE
         WHEN im.movement_type = 'in' THEN im.quantity_base
         WHEN im.movement_type = 'out' THEN -im.quantity_base
         WHEN im.movement_type = 'adjust' THEN im.quantity_base
         ELSE 0 END), 0) AS drift
FROM products p
LEFT JOIN inventory_movements im ON im.product_id = p.id
GROUP BY p.id, p.name, p.stock
HAVING drift <> 0;
```
- Purchases missing movements:
```sql
SELECT p.id, p.invoice_number
FROM purchases p
LEFT JOIN inventory_movements im
  ON im.source_type = 'purchase' AND im.source_id = p.id
GROUP BY p.id
HAVING COUNT(im.id) = 0;
```
- Unbalanced journal entries:
```sql
SELECT je.id, je.entry_number,
       COALESCE(SUM(jl.debit),0) AS debit_total,
       COALESCE(SUM(jl.credit),0) AS credit_total
FROM journal_entries je
LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
GROUP BY je.id, je.entry_number
HAVING debit_total <> credit_total;
```
- Customer cache vs ledger:
```sql
SELECT c.id, c.name, c.total_debt AS cached,
       COALESCE((
         SELECT cl.balance_after
         FROM customer_ledger cl
         WHERE cl.customer_id = c.id
         ORDER BY cl.id DESC LIMIT 1
       ), 0) AS ledger_latest
FROM customers c
WHERE c.total_debt <> COALESCE((
  SELECT cl.balance_after
  FROM customer_ledger cl
  WHERE cl.customer_id = c.id
  ORDER BY cl.id DESC LIMIT 1
), 0);
```
- Supplier cache vs ledger:
```sql
SELECT s.id, s.name, s.current_balance AS cached,
       COALESCE((
         SELECT sl.balance_after
         FROM supplier_ledger sl
         WHERE sl.supplier_id = s.id
         ORDER BY sl.id DESC LIMIT 1
       ), 0) AS ledger_latest
FROM suppliers s
WHERE s.current_balance <> COALESCE((
  SELECT sl.balance_after
  FROM supplier_ledger sl
  WHERE sl.supplier_id = s.id
  ORDER BY sl.id DESC LIMIT 1
), 0);
```

## 10) Execution Order
1. Schema + migration updates (idempotency/indexes).
2. Repository/interface transaction-safe extensions.
3. Rewrite sale/purchase/adjustment/payment use-cases to ledger-driven atomic flows.
4. IPC injection + payload normalization + channel additions.
5. Seed rewiring to produce consistent movements/journals/ledgers.
6. UI wiring corrections + empty states + reconciliation screen.
7. TS config/dist overwrite fix.
8. Tests + verification queries run and report results.

## 11) Implementation Summary (Phases 2–8)

### 11.1 Schema and Idempotency
- Added idempotency columns + unique indexes for:
  - `sales.idempotency_key`
  - `purchases.idempotency_key`
  - `payments.idempotency_key`
- Migration added: `packages/data/drizzle/0006_plan_a_idempotency.sql`
- Schema updated in `packages/data/src/schema/schema.ts`.

### 11.2 Repository Contract and Transaction-Safe Sync APIs
- Added/implemented sync or lookup methods required for atomic commit phases:
  - `IPurchaseRepository.createSync`, `findByIdempotencyKey`
  - `IPaymentRepository.createSync`, `findByIdempotencyKey`, `findByPurchaseId`, `findByCustomerId`, `findBySupplierId`
  - `IAccountingRepository.createJournalEntrySync`
  - `ICustomerLedgerRepository.getLastBalanceSync`, `findByPaymentIdSync`
  - `ISupplierLedgerRepository.createSync`, `getLastBalanceSync`, `findByPaymentIdSync`
  - `IInventoryRepository.getMovements` filter extensions
  - `IProductRepository.updateBatchStock`
  - `ISupplierRepository.findByIdSync` (to support supplier-payment commit transactions)

### 11.3 Ledger-Driven Use Cases
- `CreateSaleUseCase`
  - idempotent short-circuit by sale key,
  - writes inventory movements for each item,
  - updates stock and batch stock cache,
  - creates payment via `createSync`,
  - writes customer ledger for remaining AR,
  - writes balanced sale journal (Cash/AR, Revenue, COGS, Inventory) with missing-account graceful skip.
- `CreatePurchaseUseCase`
  - idempotent short-circuit by purchase key,
  - creates purchase + items,
  - writes `inventory_movements` (`in`, `reason=purchase`, `sourceType=purchase`),
  - writes initial payment (if any),
  - writes supplier ledger AP invoice for remaining balance,
  - writes balanced purchase journal (Inventory Dr, Cash/AP Cr).
- `AdjustProductStockUseCase`
  - always writes `inventory_movements` (`adjust`),
  - updates product/batch cache stock,
  - optional accounting adjustment journal.
- `AddPaymentUseCase`
  - payment idempotency support,
  - updates sale paid/remaining,
  - writes customer ledger payment entry,
  - writes payment journal (Cash Dr / AR Cr).
- `RecordCustomerPaymentUseCase`, `RecordSupplierPaymentUseCase`
  - now create payment records + ledger entries + accounting entries,
  - idempotent by payment key,
  - supplier payment now has commit-phase sync path.

### 11.4 Reconciliation Utilities
- Added and exported:
  - `ReconcileStockUseCase`
  - `ReconcileCustomerDebtUseCase`
  - `ReconcileSupplierBalanceUseCase`
- Added IPC channels:
  - `inventory:reconcileStock`
  - `customerLedger:reconcileDebt`
  - `supplierLedger:reconcileBalance`

### 11.5 IPC End-to-End Wiring
- Fixed/normalized payload parsing (`{data}`, `{params}`, `{id}`) and error handling in:
  - `PurchaseHandler`, `SupplierHandler`, `InventoryHandler`,
  - `CustomerLedgerHandler`, `SupplierLedgerHandler`,
  - `ProductHandler`, `SaleHandler`, `BarcodeHandler`, conflict handler.
- Ensured transaction boundaries (`withTransaction`) around commit-phase multi-write events.
- `sales:cancel` now performs stock reversal movements (`reason=return`) and updates stock cache in-transaction before status cancellation.
- Updated preload allowlist for new channels.

### 11.6 UI Wiring (Suppliers / Purchases / Inventory / Accounting)
- Suppliers:
  - added `SupplierDetailsView.vue` with real supplier data,
  - purchase history table,
  - supplier ledger table,
  - supplier payment action wired to IPC.
  - route added: `SupplierDetails`.
- Purchases:
  - `PurchaseDetailsView.vue` now shows items + payments + inventory movements from real purchase payload.
  - fixed field drifts (`total`, `lineSubtotal`, `currentBalance` usage in related views).
- Inventory:
  - added `StockReconciliationView.vue` (check + repair modes),
  - route added: `InventoryReconciliation`,
  - dashboard button added to reconciliation screen.
- Accounting:
  - accounting pages consume real stores/IPC backed by now-populated journal tables.

### 11.7 Seed Wiring
- Seed now uses real accounting + customer/supplier ledger repos (removed stubs).
- Seed sales/purchases/payments include deterministic idempotency keys.
- Purchase seed payload aligned with new `CreatePurchaseUseCase` input.

### 11.8 TypeScript Dist Overwrite Fix
- Updated exclusions to prevent `dist` from being treated as input:
  - `packages/core/tsconfig.json`
  - `packages/core/tsconfig.build.json`
  - `packages/data/tsconfig.json`
  - `packages/data/tsconfig.build.json`
- Added `\"dist\", \"**/dist\", \"node_modules\"` in relevant exclude arrays.

## 12) Verification Results

### 12.1 Build/Typecheck (Executed)
- `pnpm -C packages/core build` -> PASS
- `pnpm -C packages/data build` -> PASS
- `pnpm -C apps/electron exec tsc -p tsconfig.json --noEmit` -> PASS
- `pnpm -C apps/ui exec vue-tsc --noEmit -p tsconfig.json` -> PASS
- `pnpm -C apps/electron exec electron-vite build` -> PASS (main/preload/renderer bundles)

### 12.2 Core Business-Flow Tests (Executed)
- Command:
  - `pnpm -C packages/core exec vitest run src/__tests__/CreateProductUseCase.test.ts src/__tests__/CreateSaleUseCase.test.ts src/__tests__/TransactionPhases.test.ts src/__tests__/CreatePurchaseUseCase.test.ts src/__tests__/AddPaymentUseCase.test.ts`
- Result: PASS (`21 passed`)
- Coverage includes:
  - cash sale,
  - credit sale,
  - insufficient stock,
  - sale idempotency,
  - purchase with remaining balance,
  - purchase idempotency,
  - payment idempotency,
  - journal balancing assertions.

### 12.3 Known Verification Limitation
- `packages/data` runtime tests currently fail in this environment due native module ABI mismatch:
  - `better-sqlite3` binary compiled for a different `NODE_MODULE_VERSION`.
- This is an environment/runtime issue, not a TypeScript wiring issue.
- `pnpm -C packages/data db:seed -- --preset supermarket` currently fails for the same ABI reason (cannot load `better_sqlite3.node` under current Node runtime).

## 13) SQL Verification Checklist (Run Against App DB)

1. Stock drift should be empty:
```sql
SELECT p.id, p.name, p.stock AS cached_stock,
       COALESCE(SUM(CASE
         WHEN im.movement_type = 'in' THEN im.quantity_base
         WHEN im.movement_type = 'out' THEN -im.quantity_base
         WHEN im.movement_type = 'adjust' THEN im.quantity_base
         ELSE 0 END), 0) AS ledger_stock,
       p.stock - COALESCE(SUM(CASE
         WHEN im.movement_type = 'in' THEN im.quantity_base
         WHEN im.movement_type = 'out' THEN -im.quantity_base
         WHEN im.movement_type = 'adjust' THEN im.quantity_base
         ELSE 0 END), 0) AS drift
FROM products p
LEFT JOIN inventory_movements im ON im.product_id = p.id
GROUP BY p.id, p.name, p.stock
HAVING drift <> 0;
```

2. Purchases missing movements should be empty:
```sql
SELECT p.id, p.invoice_number
FROM purchases p
LEFT JOIN inventory_movements im
  ON im.source_type = 'purchase' AND im.source_id = p.id
GROUP BY p.id
HAVING COUNT(im.id) = 0;
```

3. Unbalanced journal entries should be empty:
```sql
SELECT je.id, je.entry_number,
       COALESCE(SUM(jl.debit),0) AS debit_total,
       COALESCE(SUM(jl.credit),0) AS credit_total
FROM journal_entries je
LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
GROUP BY je.id, je.entry_number
HAVING debit_total <> credit_total;
```

4. Customer cache/ledger drift should be empty:
```sql
SELECT c.id, c.name, c.total_debt AS cached,
       COALESCE((
         SELECT cl.balance_after
         FROM customer_ledger cl
         WHERE cl.customer_id = c.id
         ORDER BY cl.id DESC LIMIT 1
       ), 0) AS ledger_latest
FROM customers c
WHERE c.total_debt <> COALESCE((
  SELECT cl.balance_after
  FROM customer_ledger cl
  WHERE cl.customer_id = c.id
  ORDER BY cl.id DESC LIMIT 1
), 0);
```

5. Supplier cache/ledger drift should be empty:
```sql
SELECT s.id, s.name, s.current_balance AS cached,
       COALESCE((
         SELECT sl.balance_after
         FROM supplier_ledger sl
         WHERE sl.supplier_id = s.id
         ORDER BY sl.id DESC LIMIT 1
       ), 0) AS ledger_latest
FROM suppliers s
WHERE s.current_balance <> COALESCE((
  SELECT sl.balance_after
  FROM supplier_ledger sl
  WHERE sl.supplier_id = s.id
  ORDER BY sl.id DESC LIMIT 1
), 0);
```

6. Idempotency duplicates should be empty:
```sql
SELECT idempotency_key, COUNT(*) c
FROM sales
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING c > 1;

SELECT idempotency_key, COUNT(*) c
FROM purchases
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING c > 1;

SELECT idempotency_key, COUNT(*) c
FROM payments
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING c > 1;
```

## 14) Local DB Snapshot (Executed on 2026-02-17)

Database: `C:\Users\dev\AppData\Roaming\CodelNuqtaPlus\Databases\nuqta_plus.db`

Observed counts:
- `products`: 12
- `inventory_movements`: 3
- `sales`: 5
- `purchases`: 1
- `payments`: 5
- `journal_entries`: 0
- `journal_lines`: 0
- `customer_ledger`: 0
- `supplier_ledger`: 0

Observed reconciliation counters:
- `stock_drift`: 0
- `purchases_missing_movements`: 0
- `unbalanced_journals`: 0
- `customer_cache_drift`: 0
- `supplier_cache_drift`: 1
- duplicate idempotency keys (`sales/purchases/payments`): 0

Notes:
- This DB snapshot appears to predate the new accounting/ledger write wiring (journals and ledgers are still empty).
- To validate non-empty accounting/ledger screens end-to-end, run new transactions (or seed) after resolving the local native `better-sqlite3` ABI mismatch in Node runtime.
