# UI Workspace Discovery (Phase 0)

Date: 2026-02-17

## Scope

This discovery focused on:

- products UI and routes
- inventory UI and routes
- accounting UI and routes
- customer/supplier ledger wiring
- renderer store -> IPC -> Electron handler -> repository paths

## What is wired and working

- Sales creation chain is wired end-to-end:
  - `ui -> salesStore -> salesClient -> sales:* IPC -> CreateSaleUseCase -> repos -> DB`
- Purchases creation chain is wired end-to-end:
  - `ui -> purchasesStore -> purchasesClient -> purchases:* IPC -> CreatePurchaseUseCase -> repos -> DB`
- Stock adjustment chain is wired end-to-end through:
  - `products:adjustStock` and `AdjustProductStockUseCase`
- Customer payment and supplier payment are wired through dedicated ledger IPC handlers.
- Accounting read pages are wired to live tables via `accountingStore/accountingClient/accounting:*`.
- Inventory dashboard/movements/reconciliation pages use real IPC queries.

## Present but empty in many installs

- Accounting pages can be empty when:
  - chart of accounts and/or business events were not seeded/executed yet.
- Ledger pages can be empty when:
  - no credit sales or supplier liabilities/payments were created yet.

These are data state issues, not renderer mock data in current pages.

## Missing entirely (for the requested UX target)

- No unified Product Workspace route.
- No unified Finance & Inventory Workspace route.
- No product-specific sales history endpoint.
- No product-specific purchase history endpoint.
- No product units CRUD IPC endpoints (`product_units` table exists but not exposed).
- No direct product batches read/create IPC endpoints (`product_batches` exists, but UI uses partial views).
- No diagnostics panel for table-write truth (journal/ledger/movement counts + last record date).
- No consolidated `productWorkspaceStore` or `ledgerStore`.

## Fragmentation/drift points

- Product UX is split across:
  - `ProductsListView`, `ProductDetailView`, `ProductFormView`, `BarcodePrintView`
- Product detail tabs are partially placeholder:
  - units tab text only
  - batches shown via derived movement data, not a dedicated batch query
- Old routes are page-centric; no workspace-first deep-link strategy.

## Phase 0 conclusion

Core domain pipelines are mostly present. The main problem is UI architecture and missing product-scope query/CRUD endpoints for units/batches/history/diagnostics. The implementation plan is an incremental workspace refactor with compatibility redirects.

