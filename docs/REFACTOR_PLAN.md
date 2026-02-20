# Nuqta POS — Refactor Plan (The Accounting Story)

## 1. REPO AUDIT SUMMARY

### 1.1 Schema (23 tables)

| Table               | Status | Notes                                                 |
| ------------------- | ------ | ----------------------------------------------------- |
| users               | ✅ OK  | Auth + roles                                          |
| customers           | ✅ OK  | Has cached `totalDebt` (will derive from ledger)      |
| suppliers           | ✅ OK  | Has cached `currentBalance` (will derive from ledger) |
| categories          | ✅ OK  |                                                       |
| products            | ✅ OK  | Has cached `stock` (derive from movements)            |
| product_units       | ✅ OK  | Unit conversions with factorToBase + sellingPrice     |
| product_batches     | ✅ OK  | Batch/expiry tracking                                 |
| sales               | ✅ OK  | Full invoice: paid/remaining/status/idempotency       |
| sale_items          | ✅ OK  | Unit-aware with quantityBase                          |
| purchases           | ✅ OK  | Mirror of sales for procurement                       |
| purchase_items      | ✅ OK  | Unit-aware                                            |
| payments            | ✅ OK  | Polymorphic (sale/purchase/customer/supplier)         |
| inventory_movements | ✅ OK  | Stock ledger with source tracking                     |
| accounts            | ✅ OK  | Chart of accounts                                     |
| journal_entries     | ✅ OK  | GL header with isPosted/isReversed                    |
| journal_lines       | ✅ OK  | Debit/credit lines                                    |
| customer_ledger     | ✅ OK  | AR sub-ledger                                         |
| supplier_ledger     | ✅ OK  | AP sub-ledger                                         |
| barcode_templates   | ✅ OK  |                                                       |
| barcode_print_jobs  | ✅ OK  |                                                       |
| currency_settings   | ✅ OK  | Multi-currency                                        |
| settings            | ✅ OK  | Key-value store                                       |
| audit_logs          | ✅ OK  | Immutable audit trail                                 |

### 1.2 IPC Channels (78 in allowlist)

**Dead/orphan channels (8):**

- `audit:getAll`, `audit:getById` — allowlisted but handler names mismatch
- `categories:getById`, `customers:getById` — allowlisted, never implemented
- `settings:update` — allowlisted, never implemented
- `users:getById`, `users:delete` — allowlisted, never implemented
- `update:installUpdate` — allowlisted, no handler

**Dev-only (5 channels, not in allowlist):**

- `diagnostics:*` — 5 channels in DiagnosticsHandler, gated behind `isDev`

### 1.3 Use-Cases (52 classes)

All accounted for. Key observations:

- `AddPaymentUseCase` already handles AR payment with ledger + journal
- `CreateSaleUseCase` already creates inventory movements + journal entries conditionally
- `CreatePurchaseUseCase` already handles AP + inventory IN
- `accounting.enabled` setting already checked in several use-cases
- **Missing:** `AddPurchasePaymentUseCase` (no dedicated use-case for paying purchase invoices)
- **Missing:** `PostPeriodUseCase`, `ReverseEntryUseCase` (posting batches)

### 1.4 UI Routes (40+ named routes)

**Already consolidated:**

- Products → `ProductWorkspaceView` (list + form + detail + barcode all redirect here)
- Finance/Inventory → `FinanceInventoryWorkspaceView` (accounting + inventory all redirect here)

**Remaining separate views (still needed):**

- Sales: list, form, details
- Purchases: list, form, details
- Customers: list, form, profile
- Suppliers: list, form, details

**Dev artifacts in production:**

- `DiagnosticsHandler` gated behind `isDev` ✅ (already gated)
- Simple mode routes (`SimpleSalesView`, `SimpleProductCreateView`) — orphan/redundant

### 1.5 Dead Code

- `BarcodePrintView.vue`, `ProductDetailView.vue`, `ProductFormView.vue`, `ProductsListView.vue` — superseded by `ProductWorkspaceView.vue` but files still exist
- Simple mode views — unclear purpose, potentially redundant
- Unused IPC channels listed above

---

## 2. REFACTOR BLUEPRINT

### 2.1 Architecture Decisions

**Inventory truth model:** `inventory_movements` is source of truth. `products.stock` is a cache updated atomically in the same transaction that writes movements. ✅ Already enforced.

**Debt truth model:** Option A — `customer_ledger` and `supplier_ledger` are truth. `customers.totalDebt` and `suppliers.currentBalance` are derived caches. ✅ Partially enforced; needs reconciliation enforcement.

**Accounting optionality:** If `accounting.enabled=false`: skip journal entries, hide accounting UI tabs. ✅ Partially implemented in use-cases; needs UI gating.

### 2.2 New Schema Additions

```
posting_batches:
  id, periodType (day/month/year), periodStart, periodEnd,
  postedAt, postedBy, notes, createdAt

journal_entries additions:
  + postingBatchId (nullable FK → posting_batches.id)

settings keys to add:
  - accounting.enabled (true/false)
  - purchases.enabled (true/false)
  - ledgers.enabled (true/false)
  - units.enabled (true/false)
  - payments.onInvoices.enabled (true/false)
  - notifications.lowStockThreshold (number)
  - notifications.expiryDays (number)
  - invoice.prefix (string)
  - invoice.paperSize (string)
  - invoice.logo (string/path)
  - invoice.footerNotes (string)
  - invoice.showQr (true/false)
  - setup.completed (true/false)
```

### 2.3 New Use-Cases

| Use-Case                     | Package | Purpose                                                    |
| ---------------------------- | ------- | ---------------------------------------------------------- |
| `AddPurchasePaymentUseCase`  | core    | Pay purchase invoice → payment + supplier ledger + journal |
| `PostPeriodUseCase`          | core    | Batch-post journal entries for a period                    |
| `ReverseEntryUseCase`        | core    | Create reversing journal entry                             |
| `GetPendingInvoicesUseCase`  | core    | Get sales/purchases with remainingAmount > 0               |
| `CompleteSetupWizardUseCase` | core    | Write all wizard settings atomically                       |

### 2.4 Reduced Page Map

| Route                | View                                | Purpose                          |
| -------------------- | ----------------------------------- | -------------------------------- |
| `/setup`             | `SetupView.vue`                     | Initial setup (existing)         |
| `/setup/wizard`      | `SetupWizardView.vue`               | **NEW** Full wizard (6 steps)    |
| `/pos`               | `PosView.vue`                       | POS terminal                     |
| `/dashboard`         | `DashboardView.vue`                 | Dashboard                        |
| `/products`          | `ProductWorkspaceView.vue`          | Products workspace (existing)    |
| `/sales`             | `SalesListView.vue`                 | Sales list                       |
| `/sales/new`         | `SaleFormView.vue`                  | New sale                         |
| `/sales/:id`         | `SaleDetailsView.vue`               | Sale detail                      |
| `/purchases`         | `PurchasesListView.vue`             | Purchases list                   |
| `/purchases/new`     | `PurchaseFormView.vue`              | New purchase                     |
| `/purchases/:id`     | `PurchaseDetailsView.vue`           | Purchase detail                  |
| `/customers`         | `CustomersListView.vue`             | Customers                        |
| `/customers/:id`     | `CustomerProfileView.vue`           | Customer detail + ledger         |
| `/suppliers`         | `SuppliersListView.vue`             | Suppliers                        |
| `/suppliers/:id`     | `SupplierDetailsView.vue`           | Supplier detail + ledger         |
| `/payments`          | `PendingPaymentsView.vue`           | **NEW** Unified pending payments |
| `/workspace/finance` | `FinanceInventoryWorkspaceView.vue` | Finance workspace (existing)     |
| `/posting`           | `PostingView.vue`                   | **NEW** Posting batches          |
| `/settings`          | `SettingsView.vue`                  | Settings (enhanced)              |
| `/users`             | `UsersView.vue`                     | User management                  |
| `/categories`        | `CategoriesView.vue`                | Categories                       |
| `/profile`           | `ProfileView.vue`                   | User profile                     |

---

## 3. PR PLAN (Step-by-step commits)

### PR 1: Foundation — Settings Keys + Setup Wizard Gating

**Scope:** Schema migration + core use-cases + IPC + wizard UI skeleton

**Commit 1a: Add module toggle settings keys**

- `packages/data/drizzle/0007_setup_wizard_settings.sql` — migration to seed default settings
- `packages/core/src/use-cases/CompleteSetupWizardUseCase.ts` — write all wizard settings
- `packages/core/src/use-cases/GetModuleSettingsUseCase.ts` — get all module toggles
- `packages/core/src/index.ts` — export new use-cases

**Commit 1b: Setup wizard IPC + UI**

- `apps/electron/src/ipc/SetupWizardHandler.ts`
- `apps/ui/src/views/auth/SetupWizardView.vue` — 6-step wizard
- `apps/ui/src/modules/auth/routes.ts` — add wizard route
- `apps/ui/src/composables/useModuleSettings.ts` — reactive module toggles

**Commit 1c: Module gating in navigation**

- Update sidebar/navigation to hide modules based on settings
- Guard routes with module checks

### PR 2: Posting Batches

**Commit 2a: Schema + repo + use-case**

- `packages/data/drizzle/0008_posting_batches.sql` — migration
- Schema addition: `postingBatches` table + `journal_entries.postingBatchId`
- `packages/data/src/repositories/SqlitePostingRepository.ts`
- `packages/core/src/use-cases/posting/PostPeriodUseCase.ts`
- `packages/core/src/use-cases/posting/ReverseEntryUseCase.ts`

**Commit 2b: IPC + UI**

- `apps/electron/src/ipc/PostingHandler.ts`
- `apps/ui/src/views/posting/PostingView.vue`

### PR 3: Purchase Payment Flow

**Commit 3a: Use-case**

- `packages/core/src/use-cases/AddPurchasePaymentUseCase.ts`

**Commit 3b: Pending Payments UI**

- `apps/ui/src/views/payments/PendingPaymentsView.vue`
- IPC handler additions

### PR 4: Cleanup

- Remove dead view files
- Remove orphan IPC channels from allowlist
- Remove simple mode routes (or merge into main)
- Clean up diagnostics handler

---

## 4. SYSTEM WIRING MATRIX (Post-Refactor Target)

| Domain      | Schema                                      | Repository                     | Use-Case                               | IPC                       | UI                       |
| ----------- | ------------------------------------------- | ------------------------------ | -------------------------------------- | ------------------------- | ------------------------ |
| Products    | ✅ products, product_units, product_batches | ✅ SqliteProductRepository     | ✅ CRUD + GetProducts                  | ✅ products:\*            | ✅ ProductWorkspace      |
| Sales       | ✅ sales, sale_items                        | ✅ SqliteSaleRepository        | ✅ CreateSale + GetSales               | ✅ sales:\*               | ✅ Sales views           |
| Purchases   | ✅ purchases, purchase_items                | ✅ SqlitePurchaseRepository    | ✅ CreatePurchase + GetPurchases       | ✅ purchases:\*           | ✅ Purchases views       |
| Payments    | ✅ payments                                 | ✅ SqlitePaymentRepository     | ✅ AddPayment + **AddPurchasePayment** | ✅ payments:\*            | ✅ **PendingPayments**   |
| Inventory   | ✅ inventory_movements                      | ✅ SqliteInventoryRepository   | ✅ Adjust + Reconcile + Movements      | ✅ inventory:\*           | ✅ FinanceWorkspace      |
| Customers   | ✅ customers, customer_ledger               | ✅ Both repos                  | ✅ CRUD + Ledger                       | ✅ customers:_ + ledger:_ | ✅ Customer views        |
| Suppliers   | ✅ suppliers, supplier_ledger               | ✅ Both repos                  | ✅ CRUD + Ledger                       | ✅ suppliers:_ + ledger:_ | ✅ Supplier views        |
| Accounting  | ✅ accounts, journal_entries, journal_lines | ✅ SqliteAccountingRepository  | ✅ All reports + Initialize            | ✅ accounting:\*          | ✅ FinanceWorkspace      |
| **Posting** | ✅ **posting_batches**                      | ✅ **SqlitePostingRepository** | ✅ **PostPeriod + Reverse**            | ✅ **posting:\***         | ✅ **PostingView**       |
| Settings    | ✅ settings, currency_settings              | ✅ SqliteSettingsRepository    | ✅ Get/Set + Company + Currency        | ✅ settings:\*            | ✅ Settings + **Wizard** |
| Barcodes    | ✅ barcode_templates, barcode_print_jobs    | ✅ SqliteBarcodeRepository     | ✅ via IPC                             | ✅ barcode:\*             | ✅ ProductWorkspace      |
| Users       | ✅ users                                    | ✅ SqliteUserRepository        | ✅ CRUD + Auth                         | ✅ users:_ + auth:_       | ✅ Users + Auth          |
| Audit       | ✅ audit_logs                               | ✅ SqliteAuditRepository       | ✅ AuditService                        | ✅ audit:\*               | ✅ (admin only)          |
