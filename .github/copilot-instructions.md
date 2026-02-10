# Copilot instructions

## Big picture architecture

- Monorepo (pnpm + Turbo): desktop app in apps/electron, UI in apps/ui, shared domain in packages/core, SQLite data layer in packages/data, cloud API in servers/cloud-api.
- Desktop flow: Vue UI (apps/ui) -> IPC via preload allowlist -> Electron main handlers (apps/electron/src/ipc/_) -> core use-cases (packages/core/src/use-cases/_) -> Drizzle/SQLite repositories (packages/data/src/repositories/\*).
- Cloud flow: Vue UI uses CloudClient (apps/ui/src/client/CloudClient.ts) -> Fastify routes (servers/cloud-api/src/routes/\*) -> shared core + data repositories.
- Client selection: apps/ui/src/client/index.ts picks OfflineClient vs CloudClient via VITE_APP_MODE (default offline).

## IPC and security patterns (desktop)

- Only call channels in the allowlist in apps/electron/src/preload/index.ts; new IPC channels must be added there.
- IPC handlers use assertPayload/buildValidationError (apps/electron/src/services/IpcPayloadValidator.ts) and return mapErrorToIpcResponse (apps/electron/src/services/IpcErrorMapperService.ts).
- Permissions enforced at IPC boundary via requirePermission (apps/electron/src/services/PermissionGuardService.ts) using UserContextService (apps/electron/src/services/UserContextService.ts).
- Multi-write operations wrap in withTransaction(db.sqlite, fn) from packages/data/src/db.ts (must be synchronous; async uses Drizzle db.transaction).

## Data layer and migrations

- SQLite DB path resolves from argv[2] or NUQTA_DB_PATH or default app data location; see apps/electron/src/main/index.ts and packages/data/src/migrate.ts.
- Migrations run via drizzle in packages/data/src/migrate.ts; command: pnpm db:migrate (root script).

## UI client conventions

- OfflineClient (apps/ui/src/client/OfflineClient.ts) uses window.electron.invoke with payload builders; sanitize/normalize payloads before IPC.
- CloudClient uses shared axios plugin with auth refresh and Arabic error translations (apps/ui/src/plugins/axios.js).

## Key workflows

- Dev desktop app: pnpm dev (builds packages then runs Electron via electron-vite).
- Build: pnpm build (packages + UI + Electron).
- Tests: pnpm test (core + data + electron IPC), pnpm test:e2e (Playwright).
- SQLite native module rebuild: pnpm rebuild:sqlite (runs after install via postinstall).

## Where to extend

- New domain behavior: add core use-case + interfaces in packages/core, repository in packages/data, then wire IPC handler in apps/electron/src/ipc and UI client in apps/ui/src/client.
- Cloud API endpoints: add Fastify route under servers/cloud-api/src/routes and mirror in CloudClient.
