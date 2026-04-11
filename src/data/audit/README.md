# Audit Data Layer

## Storage Structure

All audit logs are stored in a flat, centralized collection:

```
/audits/{auditId}
```

- Single global audit log collection for all organizations
- Each document includes an `orgId` field for filtering by organization
- Document structure: `AuditLogEntry`
- System events use `orgId: "_system"` for non-org-specific events

## Systems Org ID

- `_system`: Used for system-wide events with no specific organization context
  - Magic link requests
  - Account deletion
  - Auth events
  - Rate limit tracking for auth operations

## Usage

### Creating Organization Audits

```typescript
const auditRepo = new AuditLogRepository();
const result = await auditRepo.create({
  eventType: "STORE_CREATED",
  actorUid: "user123",
  actorEmail: "user@example.com",
  orgId: "org123",
  outcome: "success",
  reason: null,
  timestamp: new Date(),
});
```

### Creating System Audits

```typescript
const auditRepo = new AuditLogRepository();
const result = await auditRepo.create({
  eventType: "MAGIC_LINK_REQUEST",
  actorUid: null,
  actorEmail: "user@example.com",
  orgId: "_system",
  outcome: "success",
  reason: null,
  timestamp: new Date(),
});
```

### Querying Audits

```typescript
// Query org-specific audits
const orgAuditRepo = new AuditLogRepository("org123");
const orgResult = await orgAuditRepo.findByEventType("STORE_CREATED", since);

// Query system audits
const systemAuditRepo = new AuditLogRepository("_system");
const systemResult = await systemAuditRepo.findByEventType(
  "MAGIC_LINK_REQUEST",
  since,
);
```

## Use Cases

- **CreateAuditLogUseCase**: Creates audit log entries (validated via DTO)
- **QueryAuditLogsUseCase**: Queries audit logs by event type and time window
- **CheckRateLimitUseCase**: Checks rate limits using audit log counts (org-scoped)

## Audit Events

See [audit-log-entry.model.ts](./models/audit-log-entry.model.ts) for the complete list of audit event types.
