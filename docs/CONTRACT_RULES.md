# API Contract Rules

> Single source of truth: `packages/core/src/contract.ts`

## 1. Every handler returns `ApiResult<T>`

```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
```

Both IPC handlers and Fastify routes MUST return this shape — no raw data, no `{ success: true }`, no `{ error: message }`.

## 2. No nested wrapper keys

Payloads carry the DTO directly under `data`:

| Operation  | Payload shape                                  |
| ---------- | ---------------------------------------------- |
| Create     | `{ data: DTO }`                                |
| Read one   | `{ id: N }`                                    |
| Update     | `{ id: N, data: DTO }`                         |
| List/Query | `{ params: { ... } }`                          |
| Settings   | `{ key: string }` / `{ data: { key, value } }` |

**Wrong:** `{ data: { sale: CreateSaleInput, userId: 1 } }`  
**Right:** `{ data: CreateSaleInput }`

## 3. UI never sends `userId` in offline mode

- Offline (Electron): `UserContextService.getUserId()` resolves the user at the IPC boundary.
- Cloud: auth middleware attaches `request.user` from JWT. The request body does NOT contain userId.

## 4. Single error mapper

All caught errors flow through one function:

```ts
mapErrorToResult(error: unknown): ApiResult<never>
```

This calls `toApiError()` which maps:

| Error class              | `code`               | `status`          |
| ------------------------ | -------------------- | ----------------- |
| `ValidationError`        | `VALIDATION_ERROR`   | 400               |
| `NotFoundError`          | `NOT_FOUND`          | 404               |
| `UnauthorizedError`      | `UNAUTHORIZED`       | 401               |
| `PermissionDeniedError`  | `PERMISSION_DENIED`  | 403               |
| `ConflictError`          | `CONFLICT`           | 409               |
| `InsufficientStockError` | `INSUFFICIENT_STOCK` | 409               |
| `InvalidStateError`      | `INVALID_STATE`      | 409               |
| Generic `DomainError`    | its `.code`          | its `.statusCode` |
| `Error` / unknown        | `INTERNAL_ERROR`     | (no status)       |

## 5. Payload validation at the boundary only

- IPC: `assertPayload()` + domain-specific validators (e.g. `validateCreateSalePayload`) run in the handler **before** calling use-cases.
- Cloud: Fastify request validation or inline checks in the route handler.
- Use-cases themselves assume valid input.

## Helpers cheat-sheet

```ts
import { ok, fail, failWith, mapErrorToResult, isOk, isErr } from '@nuqtaplus/core';

// Success
return ok(data);          // { ok: true, data }
return ok(null);          // { ok: true, data: null }

// Explicit failure
return failWith('NOT_FOUND', 'Sale not found', 404);

// Catch-all in try/catch
} catch (error: unknown) {
  return mapErrorToResult(error);
}

// Type guards
if (isOk(result)) { result.data ... }
if (isErr(result)) { result.error.code ... }
```
