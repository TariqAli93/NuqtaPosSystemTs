# Plan: Implement 9 Production-Grade Capabilities for Nuqta Plus

**TL;DR**: Implement Cloud Sync foundation, backend RBAC enforcement, typed domain errors, core test strategy, auto-update, audit logging, backup/restore, security hardening, and transaction integrity. Proceed in 9 phases targeting the identified gaps: RBAC (UI-only → backend), errors (plain Error → typed), auth (mocked userId → real), cloud-api (skeleton → contract), and observability (no audit/tests → coverage).

## INPUTS VERIFIED ✓

- ✅ User model: single `role` field (enum: admin|cashier|manager|viewer)
- ✅ Build tool: electron-builder + electron-vite
- ✅ Test runner: vitest (installed, no config; 0 tests)
- ✅ Drizzle: Fastify + 10 tables; User table has `role` (string, not array)
- ✅ Auth flow: LoginUseCase returns empty permissions array (TODO)
- ✅ userId tracking: Currently hardcoded to 1 in IPC handlers (needs fix)
- ✅ RBAC: UI-only via permissionMatrix.js; no backend enforcement
- ✅ Errors: Plain Error("string"), no typed errors
- ✅ Cloud-API: Fastify framework exists with incomplete route scaffolding

## PHASE SEQUENCE & DELIVERY STRATEGY

| Phase       | Capability                                                 | Files Changed                                                                                        | Effort | Blocker Risk |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | ------------ |
| **Phase 1** | **Fix auth flow** (userId mocking)                         | LoginUseCase, AuthHandler, CreateSaleUseCase, +3 handlers                                            | Small  | None         |
| **Phase 2** | **Typed domain errors** (A→C combined)                     | Create DomainErrors.ts, update all use cases (6+ files), error mapper                                | Medium | None         |
| **Phase 3** | **Backend RBAC enforcement** (B)                           | Create Permission model + guard, update all handlers, LoginUseCase                                   | Medium | None         |
| **Phase 4** | **Audit log** (F)                                          | AuditEvent entity, IAuditRepository, SqliteAuditRepository, schema migration, integrate 5+ use cases | Medium | None         |
| **Phase 5** | **Test strategy + initial coverage** (D)                   | vitest.config.ts, 6 test files (use cases + integration), test harness for SQLite                    | Large  | None         |
| **Phase 6** | **Backup & Restore** (G)                                   | IPC handlers, backup logic, restore with confirmation, add to data layer                             | Small  | None         |
| **Phase 7** | **Auto-update + release pipeline** (E)                     | Add electron-updater config, build scripts, GitHub Actions stub                                      | Medium | None         |
| **Phase 8** | **Cloud Sync API foundation** (A)                          | Define sync contract types, add tables (device, sync_cursor, change_log), 3 endpoints                | Medium | None         |
| **Phase 9** | **Security hardening** (H) + **transaction integrity** (I) | Preload allowlist, IPC payload validation, DB health check, transaction wrapper                      | Medium | None         |

## CROSS-CUTTING DECISIONS

### 1. RBAC Permission Guard Strategy

**DECISION**: **Option 2: IPC handler guard** (not use case wrapper)

_Reasoning_: IPC is the boundary; guards at boundary prevent unauthorized calls before reaching use cases. Simpler, cleaner separation. Use cases remain pure business logic.

_Implementation_: Central `requirePermission(userId, permission, handler)` middleware.

### 2. Error Mapping Format

**DECISION**: **Extended response object with backward compatibility**

```typescript
// New format (breaking-aware):
{ error: string, code: string, details?: any, statusCode: number }
// Old format still works in responses:
{ error: string }  // Always present; code/details optional
```

_Reasoning_: Keep `{ error: string }` always; add optional fields for rich error info. Existing UI consumers don't break.

### 3. Auth Flow Fix

**DECISION**: **Capture userId from auth context in IPC event**

Extract userId from authenticated context (store in Electron global after login), inject into each IPC handler.

_Reasoning_: Eliminates hardcoded userId mocking; real user tracking for audit/RBAC.

### 4. Test Strategy

**DECISION**: **vitest + SQLite in-memory/temp file**

Create test harness that spins up Drizzle with migrations applied. Cover: permission-denied scenario, sale transaction integrity, validation error mapping.

_Reasoning_: Deterministic; no external deps; SQLite migration testing ensures migrations work.

### 5. Backup Strategy

**DECISION**: **Timestamp-based file storage + retention policy**

Store backups in `appData/nuqtaplus/backups/backup-YYYYMMDD-HHMMSS.db`
Restore requires confirmation token (generated on demand, short-lived).

_Reasoning_: Prevents accidental restore; supports retention cleanup.

### 6. Cloud Sync Contract

**DECISION**: **Minimal, device-centric**

3 endpoints: `POST /sync/register`, `POST /sync/push`, `POST /sync/pull`
Metadata tables: `device`, `sync_cursor`, `change_log` (server-side only)

_Reasoning_: Supports future CloudClient without changing UI; device-based sync for offline-first.

### 7. Audit Scope

**DECISION**: **Critical business actions only**

Track: sales:create, sales:delete, products:update, price changes, user/role changes
Include: userId, timestamp, action, entityType, entityId, before/after delta

_Reasoning_: Compliance + forensics; minimal overhead.

## IMPLEMENTATION SEQUENCE (Safe Increments)

```
✓ Phase 1: Fix userId mocking (small, quick win, unblocks other phases)
  ↓
✓ Phase 2: Typed domain errors (foundation for error mapping in all handlers)
  ↓
✓ Phase 3: Backend RBAC guard (uses typed errors + real userId from Phase 1)
  ↓
✓ Phase 4: Audit log (uses use case integration; real userId ensures tracking)
  ↓
✓ Phase 5: Tests (validates Phases 1-4; test harness ready before Phase 6)
  ↓
✓ Phase 6: Backup & Restore (standalone, uses IPC boundary)
  ↓
✓ Phase 7: Auto-update (independent; Electron-specific)
  ↓
✓ Phase 8: Cloud Sync contract (independent; future-proof types)
  ↓
✓ Phase 9: Security + transactions (final hardening; uses all prior phases)
```

## FILE STRUCTURE SUMMARY (New/Modified)

### NEW FILES

- `packages/core/src/errors/DomainErrors.ts` — typed errors
- `packages/core/src/services/PermissionService.ts` — permission guard + role mapping
- `packages/core/src/entities/AuditEvent.ts` — audit log entity
- `packages/core/src/interfaces/IAuditRepository.ts` — audit interface
- `packages/data/src/repositories/SqliteAuditRepository.ts` — audit implementation
- `packages/data/drizzle/001_add_audit_log.sql` — audit table migration
- `packages/data/src/__tests__/test-harness.ts` — SQLite test setup
- `packages/core/src/__tests__/CreateSaleUseCase.test.ts` (+ 5 more)
- `apps/electron/src/services/BackupService.ts` — backup/restore logic
- `apps/electron/src/ipc/BackupHandler.ts` — backup IPC
- `servers/cloud-api/src/types/sync.ts` — sync contract types
- `servers/cloud-api/src/ipc/SyncHandler.ts` — sync endpoints
- `apps/electron/src/preload/channels.allowlist.ts` — IPC allowlist
- Build scripts + GitHub Actions stub

### MODIFIED FILES

- `packages/core/src/use-cases/*.ts` (all 20 use cases: add error handling + audit calls)
- `packages/core/src/index.ts` (export new errors, services)
- `apps/electron/src/ipc/*.ts` (all handlers: add permission guard + error mapping)
- `apps/electron/src/main/index.ts` (register audit handler + auth context)
- `apps/electron/package.json` (add electron-updater)
- `package.json` (add build/release scripts)
- `vitest.config.ts` (create + configure)
- `tsconfig.base.json` (if needed for test paths)

## DECISION CHECKPOINTS (Awaiting User Input)

**BEFORE implementing, confirm:**

### 1. Auth Context Storage

Store authenticated userId in Electron global memory (`global.currentUserId`), or prefer a separate context manager?

- **Option A**: Simple global variable (quick, sufficient for single-window app)
- **Option B**: Context manager class (more formal, testable)

_Recommendation_: Option A (simpler, matches repo style)

### 2. Backup Confirmation Token

Generate ephemeral token on UI request → stored in memory for 60s → requires token on restore IPC?
Or just UI-side confirmation (checkbox) with rate-limiting?

_Recommendation_: Token (prevents accidental deletion via keyboard shortcut)

### 3. Audit Log Detail Level

Store full before/after state for all fields, or only changed fields?

_Recommendation_: Changed fields only (smaller DB footprint, sufficient for compliance)

### 4. Cloud Sync Authentication

Use API key (simple, good for device-first) or JWT (stateless, good for future multi-device)?

_Recommendation_: API key (simpler; can layer JWT later)

### 5. GH Actions or Docs-Only for Release Pipeline?

Repo uses GitHub? (Assuming yes based on `.github/copilot-instructions.md`)

_Recommendation_: Minimal GH Actions stub for CI, docs for manual release process

## DELIVERABLE FORMAT (Ready)

Once decisions are confirmed:

- Show file path + full updated file content for each changed/added file
- Group changes by capability (A..I)
- Include a final checklist stating which items (A..I) are DONE and which are BLOCKED (with exact missing inputs)

---

## READY TO PROCEED?

This plan covers all 9 capabilities (A–I) with:

- ✅ Phase sequence ensuring no circular dependencies
- ✅ File/change list for each phase
- ✅ Clear decisions on RBAC guard, error format, auth flow, test harness, backup strategy, sync contract
- ✅ 5 decision checkpoints for final user confirmation

**Approve this plan**, provide answers to the 5 decision checkpoints, and full implementation will follow with minimal diffs and production-ready code.
