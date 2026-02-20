# Nuqta POS — Comprehensive Repository Audit

**Generated:** 2026-02-19

---

## 1. UI Routes & Pages

### Top-level route structure (apps/ui/src/app/router/routes.ts)

| #   | Path               | Name           | Component / Target                  | Meta                   |
| --- | ------------------ | -------------- | ----------------------------------- | ---------------------- |
| 1   | `/setup`           | `InitialSetup` | `views/auth/SetupView.vue`          | _(none)_               |
| 2   | `/auth/login`      | `Login`        | `views/auth/LoginView.vue`          | `requiresGuest`        |
| 3   | `/`                | _(redirect)_   | → `/pos`                            | `requiresAuth`         |
| 4   | `/pos`             | `POS`          | `views/pos/PosView.vue`             | `enableBarcode: 'pos'` |
| 5   | `/dashboard`       | `Dashboard`    | `views/dashboard/DashboardView.vue` | —                      |
| 6   | `/forbidden`       | `Forbidden`    | `views/system/ForbiddenView.vue`    | —                      |
| 7   | `/:pathMatch(.*)*` | `NotFound`     | `views/system/NotFoundView.vue`     | —                      |

### Simple-mode routes (modules/simple/routes.ts)

| Path                   | Name                  | Component                                  |
| ---------------------- | --------------------- | ------------------------------------------ |
| `/simple/sales`        | `SimpleSales`         | `views/simple/SimpleSalesView.vue`         |
| `/simple/products`     | `SimpleProductCreate` | `views/simple/SimpleProductCreateView.vue` |
| `/simple/products/new` | _(redirect)_          | → `SimpleProductCreate`                    |

### Customer routes (modules/customers/routes.ts)

| Path                  | Name              | Component                                 | Meta                      |
| --------------------- | ----------------- | ----------------------------------------- | ------------------------- |
| `/customers`          | `Customers`       | `views/customers/CustomersListView.vue`   | —                         |
| `/customers/new`      | `CustomerCreate`  | `views/customers/CustomerFormView.vue`    | `requiresManageCustomers` |
| `/customers/:id`      | `CustomerProfile` | `views/customers/CustomerProfileView.vue` | `requiresLedgers`         |
| `/customers/:id/edit` | `CustomerEdit`    | `views/customers/CustomerFormView.vue`    | `requiresManageCustomers` |

### Product routes (modules/products/routes.ts)

| Path                    | Name               | Target                                           | Meta                                              |
| ----------------------- | ------------------ | ------------------------------------------------ | ------------------------------------------------- |
| `/products`             | `ProductWorkspace` | `views/products/ProductWorkspaceView.vue`        | `requiresAccounting`                              |
| `/products/new`         | `ProductCreate`    | → `ProductWorkspace?action=create`               | `requiresManageProducts, enableBarcode:'product'` |
| `/products/:id`         | `ProductDetail`    | → `ProductWorkspace?productId=<id>`              | `requiresAccounting`                              |
| `/products/:id/edit`    | `ProductEdit`      | → `ProductWorkspace?productId=<id>&action=edit`  | `requiresManageProducts, enableBarcode:'product'` |
| `/products/:id/barcode` | `BarcodePrint`     | → `ProductWorkspace?...tab=units&action=barcode` | `requiresManageProducts`                          |

### Sales routes (modules/sales/routes.ts)

| Path         | Name          | Component                         | Meta                                       |
| ------------ | ------------- | --------------------------------- | ------------------------------------------ |
| `/sales`     | `Sales`       | `views/sales/SalesListView.vue`   | —                                          |
| `/sales/new` | `SaleCreate`  | `views/sales/SaleFormView.vue`    | `requiresCreateSales, enableBarcode:'pos'` |
| `/sales/:id` | `SaleDetails` | `views/sales/SaleDetailsView.vue` | —                                          |

### Supplier routes (modules/suppliers/routes.ts)

| Path                  | Name              | Component                                 | Meta                                          |
| --------------------- | ----------------- | ----------------------------------------- | --------------------------------------------- |
| `/suppliers`          | `Suppliers`       | `views/suppliers/SuppliersListView.vue`   | `requiresPurchasing`                          |
| `/suppliers/new`      | `SupplierCreate`  | `views/suppliers/SupplierFormView.vue`    | `requiresManageSuppliers, requiresPurchasing` |
| `/suppliers/:id`      | `SupplierDetails` | `views/suppliers/SupplierDetailsView.vue` | `requiresPurchasing, requiresLedgers`         |
| `/suppliers/:id/edit` | `SupplierEdit`    | `views/suppliers/SupplierFormView.vue`    | `requiresManageSuppliers, requiresPurchasing` |

### Purchase routes (modules/purchases/routes.ts)

| Path             | Name              | Component                                 | Meta                                          |
| ---------------- | ----------------- | ----------------------------------------- | --------------------------------------------- |
| `/purchases`     | `Purchases`       | `views/purchases/PurchasesListView.vue`   | `requiresPurchasing`                          |
| `/purchases/new` | `PurchaseCreate`  | `views/purchases/PurchaseFormView.vue`    | `requiresManagePurchases, requiresPurchasing` |
| `/purchases/:id` | `PurchaseDetails` | `views/purchases/PurchaseDetailsView.vue` | `requiresPurchasing`                          |

### Inventory & Finance routes (modules/inventory/routes.ts)

| Path                         | Name                        | Target                                               | Meta                                      |
| ---------------------------- | --------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `/workspace/finance`         | `FinanceInventoryWorkspace` | `views/finance/FinanceInventoryWorkspaceView.vue`    | `requiresAccounting`                      |
| `/inventory`                 | `Inventory`                 | → `FinanceInventoryWorkspace?section=inventory`      | `requiresAccounting`                      |
| `/inventory/movements`       | `InventoryMovements`        | → `FinanceInventoryWorkspace?section=inventory`      | `requiresAccounting`                      |
| `/inventory/adjustments/new` | `StockAdjustment`           | → `FinanceInventoryWorkspace?section=inventory`      | `requiresAdjustStock, requiresAccounting` |
| `/inventory/reconciliation`  | `InventoryReconciliation`   | → `FinanceInventoryWorkspace?section=reconciliation` | `requiresAccounting`                      |

### Accounting routes (modules/accounting/routes.ts)

| Path                                | Name                 | Target                                                                  | Meta                 |
| ----------------------------------- | -------------------- | ----------------------------------------------------------------------- | -------------------- |
| `/accounting`                       | `Accounting`         | → `FinanceInventoryWorkspace?section=accounting&accountingTab=accounts` | `requiresAccounting` |
| `/accounting/journal`               | `JournalEntries`     | → `...accountingTab=journal`                                            | `requiresAccounting` |
| `/accounting/journal/:id`           | `JournalEntryDetail` | → `...accountingTab=journal&entryId=<id>`                               | `requiresAccounting` |
| `/accounting/reports/trial-balance` | `TrialBalance`       | → `...accountingTab=trial`                                              | `requiresAccounting` |
| `/accounting/reports/pnl`           | `ProfitLoss`         | → `...accountingTab=pnl`                                                | `requiresAccounting` |
| `/accounting/reports/balance-sheet` | `BalanceSheet`       | → `...accountingTab=balance`                                            | `requiresAccounting` |

### Singleton routes

| Path          | Name         | Component                             | Meta                     |
| ------------- | ------------ | ------------------------------------- | ------------------------ |
| `/settings`   | `Settings`   | `views/settings/SettingsView.vue`     | `requiresManageSettings` |
| `/users`      | `Users`      | `views/users/UsersView.vue`           | `requiresManageSettings` |
| `/categories` | `Categories` | `views/categories/CategoriesView.vue` | `requiresManageProducts` |
| `/profile`    | `Profile`    | `views/profile/ProfileView.vue`       | —                        |
| `/about`      | `About`      | `views/about/AboutView.vue`           | —                        |

### Route summary

- **Total distinct named routes:** 40
- **Total view components:** 41 .vue files in `views/`
- **Layouts:** `PosLayout.vue`, `AuthLayout.vue`

---

## 2. IPC Channels

### Preload allowlist (apps/electron/src/preload/index.ts)

**Total allowed channels: 78**

| Group                   | Channels                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Products (14)**       | `products:getAll`, `products:getById`, `products:findByBarcode`, `products:create`, `products:update`, `products:delete`, `products:adjustStock`, `products:getPurchaseHistory`, `products:getSalesHistory`, `products:getUnits`, `products:createUnit`, `products:updateUnit`, `products:deleteUnit`, `products:setDefaultUnit`, `products:getBatches`, `products:createBatch` |
| **Sales (6)**           | `sales:create`, `sales:getAll`, `sales:getById`, `sales:addPayment`, `sales:cancel`, `sales:refund`, `sales:generateReceipt`                                                                                                                                                                                                                                                    |
| **Auth (8)**            | `auth:login`, `auth:logout`, `auth:getCurrentUser`, `auth:checkInitialSetup`, `auth:createFirstUser`, `auth:refresh`, `auth:verifyCredentials`, `auth:changePassword`, `auth:validateToken`                                                                                                                                                                                     |
| **Setup (4)**           | `setup:initialize`, `setup:setAccountingEnabled`, `setup:seedChartOfAccounts`, `setup:getAccountingSetupStatus`                                                                                                                                                                                                                                                                 |
| **Dashboard (1)**       | `dashboard:getStats`                                                                                                                                                                                                                                                                                                                                                            |
| **Customers (5)**       | `customers:getAll`, `customers:getById`, `customers:create`, `customers:update`, `customers:delete`                                                                                                                                                                                                                                                                             |
| **Categories (5)**      | `categories:getAll`, `categories:getById`, `categories:create`, `categories:update`, `categories:delete`                                                                                                                                                                                                                                                                        |
| **Users (5)**           | `users:getAll`, `users:getById`, `users:create`, `users:update`, `users:delete`                                                                                                                                                                                                                                                                                                 |
| **Settings (6)**        | `settings:get`, `settings:set`, `settings:getCurrency`, `settings:update`, `settings:getCompany`, `settings:setCompany`, `settings:getAppVersion`                                                                                                                                                                                                                               |
| **Audit (2)**           | `audit:getAll`, `audit:getById`                                                                                                                                                                                                                                                                                                                                                 |
| **Backup (6)**          | `backup:create`, `backup:list`, `backup:generateToken`, `backup:restore`, `backup:delete`, `backup:getStats`                                                                                                                                                                                                                                                                    |
| **Updates (2)**         | `update:checkForUpdates`, `update:installUpdate`                                                                                                                                                                                                                                                                                                                                |
| **Printers (2)**        | `printers:getAll`, `printers:print`                                                                                                                                                                                                                                                                                                                                             |
| **POS (1)**             | `pos:afterPay`                                                                                                                                                                                                                                                                                                                                                                  |
| **Suppliers (5)**       | `suppliers:getAll`, `suppliers:getById`, `suppliers:create`, `suppliers:update`, `suppliers:delete`                                                                                                                                                                                                                                                                             |
| **Purchases (3)**       | `purchases:getAll`, `purchases:getById`, `purchases:create`                                                                                                                                                                                                                                                                                                                     |
| **Inventory (4)**       | `inventory:getMovements`, `inventory:getDashboardStats`, `inventory:getExpiryAlerts`, `inventory:reconcileStock`                                                                                                                                                                                                                                                                |
| **Customer Ledger (4)** | `customerLedger:getLedger`, `customerLedger:recordPayment`, `customerLedger:addAdjustment`, `customerLedger:reconcileDebt`                                                                                                                                                                                                                                                      |
| **Barcode (5)**         | `barcode:getTemplates`, `barcode:createTemplate`, `barcode:deleteTemplate`, `barcode:getPrintJobs`, `barcode:createPrintJob`                                                                                                                                                                                                                                                    |
| **Accounting (6)**      | `accounting:getAccounts`, `accounting:getJournalEntries`, `accounting:getEntryById`, `accounting:getTrialBalance`, `accounting:getProfitLoss`, `accounting:getBalanceSheet`                                                                                                                                                                                                     |
| **Supplier Ledger (3)** | `supplierLedger:getLedger`, `supplierLedger:recordPayment`, `supplierLedger:reconcileBalance`                                                                                                                                                                                                                                                                                   |

### Registered IPC handlers (apps/electron/src/ipc/) — All channels actually handled

| Handler File                 | Channels Registered                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AccountingHandler.ts**     | `accounting:getAccounts`, `accounting:getJournalEntries`, `accounting:getEntryById`, `accounting:getTrialBalance`, `accounting:getProfitLoss`, `accounting:getBalanceSheet`                                                                                                                                                                                                     |
| **AuditHandler.ts**          | `audit:getTrail`, `audit:getUserActions`, `audit:getByDateRange`, `audit:getByAction`, `audit:getStatistics`, `audit:cleanup`                                                                                                                                                                                                                                                   |
| **AuthHandler.ts**           | `auth:login`, `auth:verifyCredentials`, `auth:checkInitialSetup`, `auth:createFirstUser`, `setup:initialize`, `setup:setAccountingEnabled`, `setup:seedChartOfAccounts`, `setup:getAccountingSetupStatus`, `auth:refresh`, `auth:logout`, `auth:changePassword`, `auth:getCurrentUser`, `auth:validateToken`                                                                    |
| **BackupHandler.ts**         | `backup:create`, `backup:list`, `backup:generateToken`, `backup:restore`, `backup:delete`, `backup:getStats`                                                                                                                                                                                                                                                                    |
| **BarcodeHandler.ts**        | `barcode:getTemplates`, `barcode:createTemplate`, `barcode:getPrintJobs`, `barcode:createPrintJob`, `barcode:deleteTemplate`                                                                                                                                                                                                                                                    |
| **CategoryHandler.ts**       | `categories:getAll`, `categories:create`, `categories:update`, `categories:delete`                                                                                                                                                                                                                                                                                              |
| **CustomerHandler.ts**       | `customers:getAll`, `customers:create`, `customers:update`, `customers:delete`                                                                                                                                                                                                                                                                                                  |
| **CustomerLedgerHandler.ts** | `customerLedger:getLedger`, `customerLedger:recordPayment`, `customerLedger:addAdjustment`, `customerLedger:reconcileDebt`                                                                                                                                                                                                                                                      |
| **DashboardHandler.ts**      | `dashboard:getStats`                                                                                                                                                                                                                                                                                                                                                            |
| **DiagnosticsHandler.ts**    | `diagnostics:getFinanceInventoryStatus`, `diagnostics:createTestTransaction`, `diagnostics:createTestSaleCash`, `diagnostics:createTestSaleCredit`, `diagnostics:createTestPurchase`                                                                                                                                                                                            |
| **InventoryHandler.ts**      | `inventory:getMovements`, `inventory:getDashboardStats`, `inventory:getExpiryAlerts`, `inventory:reconcileStock`                                                                                                                                                                                                                                                                |
| **PosHandler.ts**            | `pos:afterPay`                                                                                                                                                                                                                                                                                                                                                                  |
| **PrinterHandler.ts**        | `printers:getAll`, `printers:print`                                                                                                                                                                                                                                                                                                                                             |
| **ProductHandler.ts**        | `products:getAll`, `products:getPurchaseHistory`, `products:getSalesHistory`, `products:getUnits`, `products:createUnit`, `products:updateUnit`, `products:deleteUnit`, `products:setDefaultUnit`, `products:getBatches`, `products:createBatch`, `products:getById`, `products:findByBarcode`, `products:create`, `products:update`, `products:delete`, `products:adjustStock` |
| **PurchaseHandler.ts**       | `purchases:create`, `purchases:getAll`, `purchases:getById`                                                                                                                                                                                                                                                                                                                     |
| **SaleHandler.ts**           | `sales:create`, `sales:addPayment`, `sales:getById`, `sales:getAll`, `sales:cancel`, `sales:refund`, `sales:generateReceipt`                                                                                                                                                                                                                                                    |
| **SettingsHandler.ts**       | `settings:get`, `settings:set`, `settings:getCurrency`, `settings:getCompany`, `settings:setCompany`, `settings:getAppVersion`                                                                                                                                                                                                                                                  |
| **SupplierHandler.ts**       | `suppliers:create`, `suppliers:update`, `suppliers:delete`, `suppliers:getAll`, `suppliers:getById`                                                                                                                                                                                                                                                                             |
| **SupplierLedgerHandler.ts** | `supplierLedger:getLedger`, `supplierLedger:recordPayment`, `supplierLedger:reconcileBalance`                                                                                                                                                                                                                                                                                   |
| **UpdateHandler.ts**         | `update:checkForUpdates`, `update:getCurrentVersion`, `update:isUpdateAvailable`, `update:downloadUpdate`, `update:installAndRestart`                                                                                                                                                                                                                                           |
| **UserHandler.ts**           | `users:getAll`, `users:create`, `users:update`                                                                                                                                                                                                                                                                                                                                  |

### Allowlist ↔ Handler Mismatches

| Issue                            | Details                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **In allowlist but NOT handled** | `audit:getAll`, `audit:getById`, `categories:getById`, `customers:getById`, `settings:update`, `users:getById`, `users:delete`, `update:installUpdate`                                                                                                                                                                                                                                                                           |
| **Handled but NOT in allowlist** | `audit:getTrail`, `audit:getUserActions`, `audit:getByDateRange`, `audit:getByAction`, `audit:getStatistics`, `audit:cleanup`, `update:getCurrentVersion`, `update:isUpdateAvailable`, `update:downloadUpdate`, `update:installAndRestart`, `diagnostics:getFinanceInventoryStatus`, `diagnostics:createTestTransaction`, `diagnostics:createTestSaleCash`, `diagnostics:createTestSaleCredit`, `diagnostics:createTestPurchase` |

> **Note:** The `diagnostics:*` channels are intentionally omitted from the preload allowlist (comment: "Diagnostics — DEV ONLY (not exposed in production preload)"). The 5 `update:*` extra channels and 6 `audit:*` channels exist in handlers but can never be called from the renderer because they are not in the allowlist.

---

## 3. Use-Cases (packages/core/src/use-cases/)

### Top-level use-cases (38 files, 38 classes)

| File                              | Exported Class                 |
| --------------------------------- | ------------------------------ |
| `AddPaymentUseCase.ts`            | `AddPaymentUseCase`            |
| `AdjustProductStockUseCase.ts`    | `AdjustProductStockUseCase`    |
| `CheckInitialSetupUseCase.ts`     | `CheckInitialSetupUseCase`     |
| `CreateCategoryUseCase.ts`        | `CreateCategoryUseCase`        |
| `CreateCustomerUseCase.ts`        | `CreateCustomerUseCase`        |
| `CreateProductUseCase.ts`         | `CreateProductUseCase`         |
| `CreatePurchaseUseCase.ts`        | `CreatePurchaseUseCase`        |
| `CreateSaleUseCase.ts`            | `CreateSaleUseCase`            |
| `CreateSupplierUseCase.ts`        | `CreateSupplierUseCase`        |
| `CreateUserUseCase.ts`            | `CreateUserUseCase`            |
| `DeleteCategoryUseCase.ts`        | `DeleteCategoryUseCase`        |
| `DeleteCustomerUseCase.ts`        | `DeleteCustomerUseCase`        |
| `DeleteProductUseCase.ts`         | `DeleteProductUseCase`         |
| `DeleteSupplierUseCase.ts`        | `DeleteSupplierUseCase`        |
| `GetCategoriesUseCase.ts`         | `GetCategoriesUseCase`         |
| `GetCompanySettingsUseCase.ts`    | `GetCompanySettingsUseCase`    |
| `GetCurrencySettingsUseCase.ts`   | `GetCurrencySettingsUseCase`   |
| `GetCustomersUseCase.ts`          | `GetCustomersUseCase`          |
| `GetDashboardStatsUseCase.ts`     | `GetDashboardStatsUseCase`     |
| `GetExpiryAlertsUseCase.ts`       | `GetExpiryAlertsUseCase`       |
| `GetInventoryDashboardUseCase.ts` | `GetInventoryDashboardUseCase` |
| `GetInventoryMovementsUseCase.ts` | `GetInventoryMovementsUseCase` |
| `GetProductsUseCase.ts`           | `GetProductsUseCase`           |
| `GetPurchaseByIdUseCase.ts`       | `GetPurchaseByIdUseCase`       |
| `GetPurchasesUseCase.ts`          | `GetPurchasesUseCase`          |
| `GetSaleByIdUseCase.ts`           | `GetSaleByIdUseCase`           |
| `GetSaleUseCase.ts`               | `GetSaleUseCase`               |
| `GetSettingUseCase.ts`            | `GetSettingUseCase`            |
| `GetSupplierByIdUseCase.ts`       | `GetSupplierByIdUseCase`       |
| `GetSuppliersUseCase.ts`          | `GetSuppliersUseCase`          |
| `GetUsersUseCase.ts`              | `GetUsersUseCase`              |
| `InitializeAppUseCase.ts`         | `InitializeAppUseCase`         |
| `LoginUseCase.ts`                 | `LoginUseCase`                 |
| `ReconcileStockUseCase.ts`        | `ReconcileStockUseCase`        |
| `RegisterFirstUserUseCase.ts`     | `RegisterFirstUserUseCase`     |
| `SetCompanySettingsUseCase.ts`    | `SetCompanySettingsUseCase`    |
| `SetSettingUseCase.ts`            | `SetSettingUseCase`            |
| `UpdateCategoryUseCase.ts`        | `UpdateCategoryUseCase`        |
| `UpdateCustomerUseCase.ts`        | `UpdateCustomerUseCase`        |
| `UpdateProductUseCase.ts`         | `UpdateProductUseCase`         |
| `UpdateSupplierUseCase.ts`        | `UpdateSupplierUseCase`        |
| `UpdateUserUseCase.ts`            | `UpdateUserUseCase`            |

### accounting/ subdirectory (7 files)

| File                             | Exported Symbol(s)                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GetAccountsUseCase.ts`          | `GetAccountsUseCase`                                                                                 |
| `GetBalanceSheetUseCase.ts`      | `GetBalanceSheetUseCase`                                                                             |
| `GetEntryByIdUseCase.ts`         | `GetEntryByIdUseCase`                                                                                |
| `GetJournalEntriesUseCase.ts`    | `GetJournalEntriesUseCase`                                                                           |
| `GetProfitLossUseCase.ts`        | `GetProfitLossUseCase`                                                                               |
| `GetTrialBalanceUseCase.ts`      | `GetTrialBalanceUseCase`                                                                             |
| `InitializeAccountingUseCase.ts` | `ACCOUNTING_SETTING_KEYS` (const), `DEFAULT_ACCOUNTING_CODES` (const), `InitializeAccountingUseCase` |

### customer-ledger/ subdirectory (4 files)

| File                                    | Exported Class                       |
| --------------------------------------- | ------------------------------------ |
| `AddCustomerLedgerAdjustmentUseCase.ts` | `AddCustomerLedgerAdjustmentUseCase` |
| `GetCustomerLedgerUseCase.ts`           | `GetCustomerLedgerUseCase`           |
| `ReconcileCustomerDebtUseCase.ts`       | `ReconcileCustomerDebtUseCase`       |
| `RecordCustomerPaymentUseCase.ts`       | `RecordCustomerPaymentUseCase`       |

### supplier-ledger/ subdirectory (3 files)

| File                                 | Exported Class                    |
| ------------------------------------ | --------------------------------- |
| `GetSupplierLedgerUseCase.ts`        | `GetSupplierLedgerUseCase`        |
| `ReconcileSupplierBalanceUseCase.ts` | `ReconcileSupplierBalanceUseCase` |
| `RecordSupplierPaymentUseCase.ts`    | `RecordSupplierPaymentUseCase`    |

**Total use-cases: 52 exported classes/constants across 52 files.**

---

## 4. Repositories (packages/data/src/repositories/)

| File                                  | Exported Class                     | Implements Interface          |
| ------------------------------------- | ---------------------------------- | ----------------------------- |
| `SqliteAccountingRepository.ts`       | `SqliteAccountingRepository`       | `IAccountingRepository`       |
| `SqliteAuditRepository.ts`            | `SqliteAuditRepository`            | `IAuditRepository`            |
| `SqliteBarcodeRepository.ts`          | `SqliteBarcodeRepository`          | `IBarcodeRepository`          |
| `SqliteCategoryRepository.ts`         | `SqliteCategoryRepository`         | `ICategoryRepository`         |
| `SqliteCustomerLedgerRepository.ts`   | `SqliteCustomerLedgerRepository`   | `ICustomerLedgerRepository`   |
| `SqliteCustomerRepository.ts`         | `SqliteCustomerRepository`         | `ICustomerRepository`         |
| `SqliteInventoryRepository.ts`        | `SqliteInventoryRepository`        | `IInventoryRepository`        |
| `SqlitePaymentRepository.ts`          | `SqlitePaymentRepository`          | `IPaymentRepository`          |
| `SqliteProductRepository.ts`          | `SqliteProductRepository`          | `IProductRepository`          |
| `SqliteProductWorkspaceRepository.ts` | `SqliteProductWorkspaceRepository` | _(no interface — standalone)_ |
| `SqlitePurchaseRepository.ts`         | `SqlitePurchaseRepository`         | `IPurchaseRepository`         |
| `SqliteSaleRepository.ts`             | `SqliteSaleRepository`             | `ISaleRepository`             |
| `SqliteSettingsRepository.ts`         | `SqliteSettingsRepository`         | `ISettingsRepository`         |
| `SqliteSupplierLedgerRepository.ts`   | `SqliteSupplierLedgerRepository`   | `ISupplierLedgerRepository`   |
| `SqliteSupplierRepository.ts`         | `SqliteSupplierRepository`         | `ISupplierRepository`         |
| `SqliteUserRepository.ts`             | `SqliteUserRepository`             | `IUserRepository`             |

**Total: 16 repositories (15 with core interfaces + 1 standalone ProductWorkspace).**

Corresponding interfaces in `packages/core/src/interfaces/`:

`IAccountingRepository`, `IAuditRepository`, `IBarcodeRepository`, `ICategoryRepository`, `ICustomerLedgerRepository`, `ICustomerRepository`, `IInventoryRepository`, `IPaymentRepository`, `IProductRepository`, `IPurchaseRepository`, `ISaleRepository`, `ISettingsRepository`, `ISupplierLedgerRepository`, `ISupplierRepository`, `IUserRepository`

---

## 5. Schema (packages/data/src/schema/schema.ts)

Single file: **535 lines**, defines **18 tables**:

| #   | Table Name           | SQLite Table          | Key Columns                                                                                                                                          | Description                                                                          |
| --- | -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `users`              | `users`               | `id` (PK auto), `username` (unique), `password`, `role`, `isActive`                                                                                  | User accounts with roles (admin/manager/cashier)                                     |
| 2   | `customers`          | `customers`           | `id` (PK auto), `name`, `phone`, `totalPurchases`, `totalDebt`                                                                                       | Customer records with debt tracking                                                  |
| 3   | `suppliers`          | `suppliers`           | `id` (PK auto), `name`, `openingBalance`, `currentBalance`                                                                                           | Supplier records with AP balance                                                     |
| 4   | `categories`         | `categories`          | `id` (PK auto), `name` (unique)                                                                                                                      | Product categories                                                                   |
| 5   | `products`           | `products`            | `id` (PK auto), `name`, `sku` (unique), `barcode`, `categoryId`, `costPrice`, `sellingPrice`, `stock`, `supplierId`                                  | Product catalog with pricing & stock                                                 |
| 6   | `productUnits`       | `product_units`       | `id` (PK auto), `productId`, `unitName`, `factorToBase`, `barcode`, `sellingPrice`                                                                   | Unit packaging with conversion factors (idx: product, unique product+unit)           |
| 7   | `productBatches`     | `product_batches`     | `id` (PK auto), `productId`, `batchNumber`, `expiryDate`, `quantityOnHand`, `purchaseId`                                                             | Batch/expiry tracking (idx: product, expiry, unique product+batch)                   |
| 8   | `sales`              | `sales`               | `id` (PK auto), `invoiceNumber` (unique), `customerId`, `total`, `paymentType`, `paidAmount`, `remainingAmount`, `status`, `idempotencyKey` (unique) | Sales invoices with payment status & receipt tracking                                |
| 9   | `saleItems`          | `sale_items`          | `id` (PK auto), `saleId`, `productId`, `quantity`, `unitPrice`, `batchId`                                                                            | Line items per sale                                                                  |
| 10  | `purchases`          | `purchases`           | `id` (PK auto), `invoiceNumber`, `supplierId`, `total`, `paidAmount`, `remainingAmount`, `idempotencyKey` (unique)                                   | Purchase invoices (idx: supplier, unique invoice+supplier, unique idempotency)       |
| 11  | `purchaseItems`      | `purchase_items`      | `id` (PK auto), `purchaseId`, `productId`, `quantity`, `unitCost`, `batchId`                                                                         | Line items per purchase (idx: purchase, product)                                     |
| 12  | `payments`           | `payments`            | `id` (PK auto), `saleId`, `purchaseId`, `customerId`, `supplierId`, `amount`, `paymentMethod`, `idempotencyKey` (unique)                             | Payment records linking to sales/purchases (idx: sale, purchase, customer, supplier) |
| 13  | `inventoryMovements` | `inventory_movements` | `id` (PK auto), `productId`, `movementType`, `reason`, `quantityBase`, `stockBefore`, `stockAfter`, `sourceType`, `sourceId`                         | Stock ledger (idx: product, date, source)                                            |
| 14  | `accounts`           | `accounts`            | `id` (PK auto), `code` (unique), `name`, `accountType`, `parentId`, `isSystem`, `balance`                                                            | Chart of accounts (double-entry)                                                     |
| 15  | `journalEntries`     | `journal_entries`     | `id` (PK auto), `entryNumber` (unique), `entryDate`, `description`, `sourceType`, `sourceId`, `totalAmount`                                          | Journal entry headers (idx: date, source)                                            |
| 16  | `journalLines`       | `journal_lines`       | `id` (PK auto), `journalEntryId`, `accountId`, `debit`, `credit`                                                                                     | Debit/credit lines per journal entry (idx: entry, account)                           |
| 17  | `customerLedger`     | `customer_ledger`     | `id` (PK auto), `customerId`, `transactionType`, `amount`, `balanceAfter`, `saleId`, `paymentId`, `journalEntryId`                                   | Accounts receivable ledger (idx: customer, date)                                     |
| 18  | `supplierLedger`     | `supplier_ledger`     | `id` (PK auto), `supplierId`, `transactionType`, `amount`, `balanceAfter`, `purchaseId`, `paymentId`, `journalEntryId`                               | Accounts payable ledger (idx: supplier, date)                                        |
| 19  | `barcodeTemplates`   | `barcode_templates`   | `id` (PK auto), `name`, `width`, `height`, `barcodeType`, `layoutJson`, `isDefault`                                                                  | Barcode label templates                                                              |
| 20  | `barcodePrintJobs`   | `barcode_print_jobs`  | `id` (PK auto), `templateId`, `productId`, `barcode`, `quantity`, `status`                                                                           | Print queue for barcode labels (idx: status, product)                                |
| 21  | `currencySettings`   | `currency_settings`   | `id` (PK auto), `currencyCode` (unique), `exchangeRate`, `isBaseCurrency`                                                                            | Currency configuration                                                               |
| 22  | `settings`           | `settings`            | `id` (PK auto), `key` (unique), `value`                                                                                                              | Key-value settings store                                                             |
| 23  | `auditLogs`          | `audit_logs`          | `id` (PK auto), `userId`, `action`, `entityType`, `entityId`, `timestamp`, `changedFields`                                                           | Audit trail                                                                          |

---

## 6. Settings Architecture

### Schema layer

- **`settings`** table: Generic key-value store (`key` unique, `value` text)
- **`currency_settings`** table: Dedicated currency config (code, name, symbol, exchange rate, base flag)
- Company settings are stored as JSON value(s) in the `settings` table (not a separate table)

### Core entity (packages/core/src/entities/Settings.ts)

- `CurrencySettingsSchema` (Zod) — validates currency rows
- `SettingsSchema` (Zod) — validates generic key-value entries
- `CompanySettingsSchema` (Zod) — validates company info: `name`, `address`, `phone`, `phone2`, `email`, `taxId`, `logo`, `currency` (ISO 4217), `lowStockThreshold`

### Core interface (packages/core/src/interfaces/ISettingsRepository.ts)

```typescript
export interface ISettingsRepository {
  getCurrencySettings(): { defaultCurrency: string; usdRate: number; iqdRate: number };
  get(key: string): string | null;
  set(key: string, value: string): void;
  getCompanySettings(): CompanySettings | null;
  setCompanySettings(settings: CompanySettings): void;
}
```

### Use-cases

| Use-Case                     | Purpose                       |
| ---------------------------- | ----------------------------- |
| `GetSettingUseCase`          | Read a single setting by key  |
| `SetSettingUseCase`          | Write a single setting by key |
| `GetCurrencySettingsUseCase` | Read currency config          |
| `GetCompanySettingsUseCase`  | Read company profile          |
| `SetCompanySettingsUseCase`  | Write company profile         |

### Repository

- `SqliteSettingsRepository` implements `ISettingsRepository`

### IPC channels

- `settings:get` — read individual setting (admin/manager)
- `settings:set` — write individual setting (admin only)
- `settings:getCurrency` — read currency (any role)
- `settings:getCompany` — read company (any role)
- `settings:setCompany` — write company (admin only)
- `settings:getAppVersion` — read Electron app version (any role)
- `settings:update` — **in allowlist but NOT implemented in any handler** ⚠️

### UI layer

- **Route:** `/settings` → `SettingsView.vue` (requires `manageSettings`)
- **View:** Manages company info (name, email, phone, phone2, address, taxId, currency, lowStockThreshold) plus receipt printer selection (stored in localStorage only)
- **Store:** `settingsStore` in `apps/ui/src/stores/settingsStore.ts`
- **Client:** `settingsClient` in `apps/ui/src/ipc/settingsClient.ts`

---

## 7. Dead Code / Dev Artifacts / Diagnostics

### DiagnosticsHandler.ts (apps/electron/src/ipc/DiagnosticsHandler.ts)

**430 lines** of dev-only test-transaction code. Registers 5 IPC channels:

| Channel                                 | Purpose                                                                         | Production Guard                                     |
| --------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `diagnostics:getFinanceInventoryStatus` | Queries raw SQLite tables for row counts, checks chart of accounts completeness | ❌ **No production guard** — runs in any environment |
| `diagnostics:createTestTransaction`     | Alias for credit sale creation                                                  | ✅ Blocked in production via `NODE_ENV` check        |
| `diagnostics:createTestSaleCash`        | Creates a dev cash sale with dev customer                                       | ✅ Blocked in production                             |
| `diagnostics:createTestSaleCredit`      | Creates a dev credit sale with dev customer                                     | ✅ Blocked in production                             |
| `diagnostics:createTestPurchase`        | Creates a dev purchase with dev supplier                                        | ✅ Blocked in production                             |

**Key findings:**

- All 5 channels are **NOT in the preload allowlist**, so they cannot be invoked from the renderer process. The comment says "DEV ONLY (not exposed in production preload)".
- However, `diagnostics:getFinanceInventoryStatus` has **no `NODE_ENV` guard** — if the channel were somehow exposed, it would run in production.
- The test transaction handlers create entities with names like "Developer Test Customer", "Developer Test Supplier", "Developer Test Product" — these could pollute real data if guards fail.

### AboutView.vue diagnostics (apps/ui/src/views/about/AboutView.vue)

The About page has a "Copy Diagnostics" button that:

- Builds a string of system info (app version, platform, etc.)
- Copies to clipboard via `navigator.clipboard.writeText()`
- This is **user-facing production functionality** (support diagnostics), not dev-only — this is fine.

### Audit handler dead channels

The `AuditHandler.ts` registers 6 channels (`audit:getTrail`, `audit:getUserActions`, `audit:getByDateRange`, `audit:getByAction`, `audit:getStatistics`, `audit:cleanup`) but the preload allowlist only has `audit:getAll` and `audit:getById` — neither of which are actually implemented. This means:

- The audit UI (if any) cannot call the real handlers
- The allowlisted names don't match any handler

### Update handler dead channels

`UpdateHandler.ts` registers 5 channels but only 2 are in the allowlist (`update:checkForUpdates`, `update:installUpdate`). The handler registers `update:checkForUpdates` (matches), but also `update:getCurrentVersion`, `update:isUpdateAvailable`, `update:downloadUpdate`, `update:installAndRestart` — none of which are in the allowlist. The allowlisted `update:installUpdate` is **not implemented**.

### User handler missing operations

`UserHandler.ts` only implements `users:getAll`, `users:create`, `users:update`. The allowlisted `users:getById` and `users:delete` have **no handler implementations**.

### Category/Customer handler missing getById

`CategoryHandler.ts` does not implement `categories:getById` (allowlisted). `CustomerHandler.ts` does not implement `customers:getById` (allowlisted).

---

## Summary Statistics

| Area                        | Count                       |
| --------------------------- | --------------------------- |
| UI Routes (named)           | 40                          |
| View Components (.vue)      | 41                          |
| Preload Allowlist Channels  | 78                          |
| Handler Files               | 21                          |
| Registered Handler Channels | ~95 (including diagnostics) |
| In allowlist, no handler    | 8 channels                  |
| Handled, not in allowlist   | 15 channels                 |
| Core Use-Cases              | 52                          |
| Data Repositories           | 16                          |
| Core Interfaces             | 15                          |
| Schema Tables               | 23                          |
| Entity/Zod types            | 16 files                    |
