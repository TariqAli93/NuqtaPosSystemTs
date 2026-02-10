# Phase 8: Cloud Sync API Foundation

## Overview

Phase 8 establishes the foundational cloud synchronization infrastructure for Nuqta Plus. This enables offline-first devices to safely and efficiently sync their local changes with a central cloud database.

**Status**: ✅ Implementation Complete  
**Repository**: `servers/cloud-api`  
**Database**: SQLite (in-memory for cloud API)

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    NUQTA PLUS SYNC ARCHITECTURE             │
└─────────────────────────────────────────────────────────────┘

Local Device (Electron/Vue)
├── Local SQLite DB
├── Change Log (local)
└── OfflineClient → IPC → Sync Handler

                    ↕ HTTP

Cloud API (Fastify)
├── Device Registry (devices table)
├── Sync Cursors (sync_cursors table)
├── Change Log (change_log table)
├── Conflict Log (conflict_log table)
└── SyncService (business logic)

                    ↕ Events/Webhooks

Downstream Systems
├── Analytics
├── Reporting
└── Integrations
```

### Core Concepts

#### Device Registration

- Each Nuqta Plus installation registers as a unique device
- Receives API key for authentication
- Metadata tracks device type, location, version
- API key enables secure, stateless authentication

#### Sync Cursor

- Tracks synchronization progress per device
- Prevents duplicate change processing
- Enables resumable sync (crash/network recovery)
- `lastChangeId` = ID of last successfully applied change

#### Change Tracking

- All changes (Create/Update/Delete) recorded server-side
- Timestamp, entityType, entityId, and serialized data stored
- Enables full audit trail and compliance
- Supports conflict detection and resolution

#### Conflict Resolution

- **Last-Write-Wins (LWW)** strategy by default
- Server timestamp is source of truth
- Conflicts logged for manual review
- Extensible for custom resolution policies

---

## API Endpoints

### Device Management

#### Register Device

```http
POST /sync/register

Request Body:
{
  "name": "Store A - Register 1",
  "type": "desktop",                    // desktop | mobile | tablet
  "version": "1.0.0",
  "platform": "Windows",
  "metadata": { "location": "Main Store" }
}

Response:
{
  "success": true,
  "device": {
    "id": "device-uuid",
    "name": "Store A - Register 1",
    "type": "desktop",
    "version": "1.0.0",
    "platform": "Windows",
    "status": "active",
    "createdAt": 1234567890,
    "metadata": { ... }
  },
  "apiKey": "base64-encoded-api-key"
}
```

#### Get Sync Status

```http
GET /sync/status?deviceId=device-id&apiKey=api-key

Response:
{
  "success": true,
  "status": {
    "deviceId": "device-id",
    "lastSyncAt": 1234567890,
    "isSyncing": false,
    "pendingChanges": 5,
    "cursorId": 42,
    "status": "synced"
  }
}
```

#### Get Sync Stats (Admin)

```http
GET /sync/stats

Response:
{
  "success": true,
  "stats": {
    "activeDevices": 15,
    "totalChanges": 42000,
    "pendingConflicts": 3,
    "lastUpdateAt": "2024-01-15T10:30:00Z"
  }
}
```

### Sync Operations

#### Push Changes (Device → Server)

```http
POST /sync/push

Request Body:
{
  "deviceId": "device-id",
  "apiKey": "api-key",
  "cursorId": 10,                    // Last successfully synced change
  "changes": [
    {
      "id": 1,
      "operation": "create",         // create | update | delete
      "entityType": "Sale",
      "entityId": "sale-123",
      "timestamp": 1234567890,       // Client timestamp (ms)
      "data": { "amount": 500, ... }
    },
    {
      "id": 2,
      "operation": "update",
      "entityType": "Product",
      "entityId": "product-456",
      "timestamp": 1234567891,
      "data": { "price": 100 }
    }
  ]
}

Response:
{
  "success": true,
  "syncedCount": 2,
  "newCursorId": 12,                 // Update local cursor to this
  "serverTimestamp": 1234567892,
  "errors": []                       // If any changes failed
}
```

#### Pull Changes (Server → Device)

```http
POST /sync/pull

Request Body:
{
  "deviceId": "device-id",
  "apiKey": "api-key",
  "fromCursorId": 10,                // Start from this change ID
  "limit": 100                       // Max changes to fetch (default: 1000)
}

Response:
{
  "success": true,
  "changes": [
    {
      "id": 11,
      "operation": "create",
      "entityType": "Product",
      "entityId": "product-789",
      "timestamp": 1234567890,
      "data": { ... },
      "isSynced": true
    },
    ...
  ],
  "hasMore": true,                   // If true, more changes available
  "newCursorId": 15,                 // Update local cursor to this
  "serverTimestamp": 1234567892
}
```

### Device Admin

#### Suspend Device

```http
POST /sync/suspend/{deviceId}

Response:
{
  "success": true,
  "message": "Device suspended"
}
```

#### Delete Device

```http
DELETE /sync/{deviceId}

Response:
{
  "success": true,
  "message": "Device deleted"
}
```

---

## Database Schema

### devices Table

```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                 -- desktop | mobile | tablet
  api_key TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  platform TEXT NOT NULL,             -- Windows | macOS | Linux | iOS | Android
  last_sync_at INTEGER,               -- Unix timestamp (ms)
  created_at INTEGER NOT NULL,        -- Unix timestamp (ms)
  status TEXT DEFAULT 'active',       -- active | inactive | suspended
  metadata TEXT                       -- JSON string
);
```

### sync_cursors Table

```sql
CREATE TABLE sync_cursors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  last_change_id INTEGER DEFAULT 0,
  last_sync_at INTEGER NOT NULL,
  cursor TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

### change_log Table

```sql
CREATE TABLE change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  operation TEXT NOT NULL,            -- create | update | delete
  entity_type TEXT NOT NULL,          -- Sale | Product | Customer | ...
  entity_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,         -- Client timestamp (ms)
  server_timestamp INTEGER NOT NULL,  -- Server timestamp (ms) - source of truth
  data TEXT,                          -- JSON string of entity data
  deleted_at INTEGER,
  is_synced INTEGER DEFAULT 1,
  conflict_resolved INTEGER DEFAULT 0,
  user_id INTEGER,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

### conflict_log Table

```sql
CREATE TABLE conflict_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_log_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  client_value TEXT,                  -- JSON string
  server_value TEXT,                  -- JSON string
  resolution TEXT DEFAULT 'pending',  -- pending | server-wins | client-wins | merged
  resolved_value TEXT,                -- JSON string
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (change_log_id) REFERENCES change_log(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

---

## TypeScript Types

### Device

```typescript
interface Device {
  id: string; // UUID
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  apiKey: string; // Secret key (never exposed after registration)
  version: string;
  platform: string;
  lastSyncAt: number | null;
  createdAt: number;
  status: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
}
```

### SyncPushRequest

```typescript
interface SyncPushRequest {
  deviceId: string;
  apiKey: string;
  changes: ChangeLogEntry[];
  cursorId: number; // Last successfully synced change ID
}
```

### SyncPullRequest

```typescript
interface SyncPullRequest {
  deviceId: string;
  apiKey: string;
  fromCursorId?: number;
  limit?: number; // Default: 1000
}
```

---

## File Structure

```
servers/cloud-api/
├── src/
│   ├── db/
│   │   ├── index.ts                 # Database initialization
│   │   └── schema.ts                # Drizzle schema definitions
│   ├── services/
│   │   └── SyncService.ts           # Core sync business logic
│   ├── routes/
│   │   └── sync.ts                  # Fastify route handlers
│   ├── types/
│   │   └── sync.ts                  # TypeScript interfaces
│   ├── __tests__/
│   │   └── sync.test.ts             # Integration tests
│   └── server.ts                    # Fastify application setup
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Implementation Details

### SyncService Class

#### Methods

**registerDevice(request: DeviceRegisterRequest)**

- Generates unique device ID (UUID)
- Creates random 32-byte API key (base64)
- Stores device in database
- Initializes sync cursor
- Returns device + API key (shown only once)

**authenticateDevice(deviceId: string, apiKey: string)**

- Queries devices table
- Verifies API key match
- Returns device if valid, null otherwise
- Non-blocking; safe for repeated calls

**pushChanges(request: SyncPushRequest)**

- Authenticates device
- Validates device status (must be 'active')
- Iterates through changes
- Records each change in change_log table
- Detects conflicts (existing changes on same entity)
- Applies last-write-wins strategy
- Updates sync cursor to `cursorId + changes.length`
- Returns count of accepted changes + errors

**pullChanges(request: SyncPullRequest)**

- Authenticates device
- Fetches changes from `fromCursorId` onwards
- Respects limit parameter (max 1000)
- Fetches one extra to detect if more available
- Returns changes + hasMore flag + newCursorId
- Device updates its local cursor after apply

**getSyncStatus(deviceId: string, apiKey: string)**

- Authenticates device
- Queries sync_cursors for current cursor
- Counts pending changes in change_log
- Returns status object with metrics

**getSyncStats()**

- Counts active devices
- Counts total changes logged
- Counts pending conflicts
- Admin endpoint (future: add auth)

---

## Conflict Resolution

### Strategy: Last-Write-Wins (LWW)

When two devices modify the same entity:

1. **Detection**: Duplicate (entity_type, entity_id) entries in change_log
2. **Resolution**: Server timestamp (`server_timestamp`) determines winner
3. **Storage**: Winner's version applied; loser's version logged in conflict_log
4. **Auditing**: All conflicts tracked for manual review

### Example Conflict

```
Device A: Update Sale #100 amount from 500 → 600 (timestamp: 10:00:00)
Device B: Update Sale #100 amount from 500 → 650 (timestamp: 10:00:05)

Server receives both changes:
- Change A server_timestamp: 10:00:15 (arrived first)
- Change B server_timestamp: 10:00:18 (arrived later)

Resolution:
- Change B wins (later server_timestamp)
- Final amount: 650
- Conflict logged: A's value (600) vs B's value (650) → B wins
```

### Future Enhancement: Custom Resolution

Extensible to support:

- Merge strategies (sum quantities, concat lists)
- User-defined policies (business rules)
- Automatic conflict resolution API

---

## Security Considerations

### API Key Management

✅ **Generated securely** via `crypto.randomBytes(32)`  
✅ **Base64 encoded** for transmission  
✅ **Unique per device** (enforced by DB constraint)  
✅ **Never logged** (security best practice)  
✅ **Shown only once** at registration

🔐 **To-Do**: Hash API keys at rest (use bcrypt)

### Authentication

- API key validation on every request
- Device status check (must be 'active')
- No session state (stateless authentication)

🔐 **Future**:

- JWT tokens for temporary access
- OAuth2 for mobile devices
- Rate limiting per device/IP

### Data Privacy

- All data encrypted in transit (HTTPS only in production)
- Metadata in JSON format (supports custom fields)
- User ID tracking for audit trail
- GDPR-ready: device deletion cascades

---

## Testing

### Unit Tests

Located in `servers/cloud-api/src/__tests__/sync.test.ts`

**Test Coverage**:

- Device registration (unique keys, API key generation)
- Authentication (valid/invalid credentials)
- Push changes (accepted count, error handling, cursor update)
- Pull changes (pagination, hasMore flag)
- Sync status (metrics accuracy)
- Sync stats (aggregation)
- Device suspension/deletion
- Conflict handling (last-write-wins)
- API key security (length validation)
- Change tracking (all operations)

**Run Tests**:

```bash
npm -w servers/cloud-api run test
```

### Integration Testing

Recommended tools:

- **Postman** for API testing (import sync.postman_collection.json)
- **k6** for load testing
- **Docker Compose** for end-to-end testing with mock devices

---

## Deployment & Operations

### Environment Variables

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=file:./nuqta_cloud.db    # Production DB path
API_KEY_EXPIRY=90d                     # Optional: API key rotation
SYNC_RATE_LIMIT=100/min                # Requests per minute per device
```

### Monitoring

**Metrics to track**:

- Active devices (gauge)
- Changes/minute (rate)
- Sync latency (histogram)
- Conflict rate (gauge)
- Authentication failures (counter)
- Error rate by endpoint (counter)

**Recommended tools**:

- Prometheus for metrics collection
- Grafana for dashboards
- Sentry for error tracking

### Scaling

**Bottlenecks to watch**:

1. Database queries (add indexes as needed)
2. Change_log table size (archive old changes)
3. Authentication lookups (cache API keys)

**Optimization strategies**:

- Implement change log retention policy (30-90 days)
- Batch pull requests (reduce round-trips)
- Connection pooling (if upgrading to PostgreSQL)
- Read replicas for analytics queries

---

## Integration with Electron Client

### OfflineClient Extension

The Electron UI should extend `OfflineClient` to use cloud sync:

```typescript
// apps/ui/src/client/OfflineClient.ts

export interface IAppClient {
  // ... existing methods ...

  // Cloud sync methods
  sync: {
    registerDevice: (request: DeviceRegisterRequest) => Promise<DeviceRegisterResponse>;
    pushChanges: (request: SyncPushRequest) => Promise<SyncPushResponse>;
    pullChanges: (request: SyncPullRequest) => Promise<SyncPullResponse>;
    getSyncStatus: () => Promise<SyncStatus>;
  };
}
```

### Sync Workflow

```typescript
// Example: Two-way sync in Electron
async function performSync() {
  try {
    // 1. Push local changes
    const pushResult = await client.sync.pushChanges({
      deviceId: this.deviceId,
      apiKey: this.apiKey,
      changes: getLocalChanges(),
      cursorId: this.lastSyncCursor,
    });

    // 2. Update cursor
    this.lastSyncCursor = pushResult.newCursorId;

    // 3. Pull remote changes
    const pullResult = await client.sync.pullChanges({
      deviceId: this.deviceId,
      apiKey: this.apiKey,
      fromCursorId: this.lastSyncCursor,
    });

    // 4. Apply changes locally
    for (const change of pullResult.changes) {
      applyChange(change);
    }

    // 5. Update cursor & status
    this.lastSyncCursor = pullResult.newCursorId;

    if (pullResult.hasMore) {
      // More changes available; continue pulling
      await performSync();
    }
  } catch (e) {
    // Handle sync error
    this.syncStatus = 'error';
    throw e;
  }
}
```

---

## Future Enhancements (Phase 9+)

### Planned Features

1. **Selective Sync**
   - Device subscriptions (e.g., only sync sales for Store A)
   - Entity type filtering
   - Data partitioning

2. **Conflict Resolution UI**
   - Dashboard to view pending conflicts
   - Manual merge interface
   - Policy-based auto-resolution

3. **Cloud Gateway**
   - Request aggregation
   - Change batching
   - Compression

4. **Analytics & Reporting**
   - Sync health dashboard
   - Device telemetry
   - Change distribution analysis

5. **Multi-Tenant Support**
   - Organization-level isolation
   - Cross-org sync policies
   - Audit logging per tenant

6. **Time-Series Change Tracking**
   - Historical versioning
   - Point-in-time recovery
   - Temporal queries

---

## FAQ

**Q: How are API keys stored securely?**  
A: Currently stored in plaintext (phase 8). Phase 9 will implement bcrypt hashing with salt.

**Q: Can we use PostgreSQL instead of SQLite?**  
A: Yes! The schema is compatible with drizzle-orm's PostgreSQL driver. Update `db/index.ts` to use `drizzle/postgres-js`.

**Q: What happens if a device goes offline during sync?**  
A: Sync can be resumed from the saved cursor ID. Changes are idempotent.

**Q: How do we handle deleted entities?**  
A: Use soft deletes (`deleted_at` timestamp). Hard deletes can be archived separately.

**Q: Is change_log bloat a concern?**  
A: Yes. Implement a retention policy (archive changes older than 90 days) in Phase 9.

---

## Troubleshooting

### Device can't authenticate

- Verify `deviceId` and `apiKey` match registration
- Check device status is 'active' (not suspended)
- Confirm API key wasn't rotated

### Changes not syncing

- Check device connectivity
- Verify sync cursor is incrementing
- Look for errors in SyncPushResponse.errors array
- Check server logs for exceptions

### High conflict rate

- Implement business rule-based conflict resolution
- Consider adding write locks for critical entities
- Review sync intervals (faster = fewer conflicts)

---

## References

- **Related Documentation**:
  - [Nuqta Architecture](../ARCHITECTURE.md)
  - [Clean Architecture Patterns](../../packages/core/README.md)
  - [Drizzle ORM Docs](https://orm.drizzle.team/)
- **External Resources**:
  - [Offline-First Architecture](https://offlinefirst.org/)
  - [CRDTs vs Last-Write-Wins](https://blog.kevinjahns.de/are-crdts-suitable-for-shared-editing/)
  - [Sync Algorithm Design](https://www.sqlite.org/replication.html)

---

**Last Updated**: 2024-01-15  
**Maintained By**: Nuqta Plus Team  
**Phase**: 8 (Cloud Sync Foundation)
