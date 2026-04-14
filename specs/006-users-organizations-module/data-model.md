# Data Model: User & Organization Management Module

**Feature**: `006-users-organizations-module`  
**Date**: 2026-04-14  
**Firestore Root**: `organizations/{orgId}/memberships/`, `deletionTasks/`, `organizations/{orgId}/auditLogs/`

---

## Firestore Collections

### `/organizations/{orgId}/memberships/{userId}`

Subcollection on each organization. Tracks all user memberships, including role and deletion status.

| Field       | Type                | Required | Notes                                                                          |
| ----------- | ------------------- | -------- | ------------------------------------------------------------------------------ |
| `id`        | `string`            | ✅       | Firebase Auth UID (same as document ID)                                        |
| `orgId`     | `string`            | ✅       | Denormalized parent org ID (enables `collectionGroup` queries)                 |
| `userId`    | `string`            | ✅       | Reference to `/profiles/{userId}`                                              |
| `role`      | `"admin" \| "member"`| ✅       | User's role in this organization                                               |
| `joinedAt`  | `Timestamp`         | ✅       | When user joined (or re-joined) this organization                              |
| `lastActiveAt` | `Timestamp \| null` | ✅    | Last time user accessed any resource in this org; cached (update max once/5min)|
| `deletedAt`  | `Timestamp \| null` | ✅       | Soft-delete timestamp; `null` if active; set when user is removed from org     |
| `createdAt` | `Timestamp`         | ✅       | Server-set on document creation                                                |
| `updatedAt` | `Timestamp`         | ✅       | Server-set on every write                                                      |

**Indexes**:
- `(orgId ASC, deletedAt ASC, joinedAt DESC)` — for listing active members sorted by join date
- `(orgId ASC, role ASC, deletedAt ASC)` — for admin filtering
- `(userId ASC, deletedAt ASC)` — for finding user's active memberships across orgs (`collectionGroup` query)

**Notes**:
- Membership records are soft-deleted but never hard-deleted (for recovery and audit purposes).
- The presence of a membership record in Firestore with `deletedAt != null` indicates the user was removed but data is in grace period.
- To reactivate a removed user, `deletedAt` is set back to `null` and associated deletion task is cancelled.

---

### `/deletionTasks/{taskId}`

Top-level collection. Append-only. Tracks scheduled hard-deletion tasks for removed users.

| Field               | Type                               | Required | Notes                                                                     |
| ------------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------- |
| `id`                | `string`                           | ✅       | Firestore auto-generated document ID                                      |
| `userId`            | `string`                           | ✅       | Firebase Auth UID of removed user                                         |
| `orgId`             | `string`                           | ✅       | Organization where user was removed                                       |
| `removedAt`         | `Timestamp`                        | ✅       | When user was removed (soft-delete timestamp)                             |
| `scheduledDeleteAt` | `Timestamp`                        | ✅       | Target time for hard deletion (removedAt + gracePeriod)                   |
| `status`            | `TaskStatus` (enum)                | ✅       | One of: `pending`, `in_progress`, `completed`, `failed`, `cancelled`       |
| `retryCount`        | `number`                           | ✅       | Current retry attempt (0 on creation; incremented on each retry)           |
| `maxRetries`        | `number`                           | ✅       | Maximum retries allowed (default: 3)                                      |
| `error`             | `string \| null`                   | ✅       | Error message from last failed attempt; `null` if not failed yet            |
| `gracePeriodDays`   | `number`                           | ✅       | Grace period applied (e.g., 30 days); snapshot of org config at removal    |
| `recoveryDeadline`  | `Timestamp \| null`                | ✅       | Latest time user can be re-added to recover data; after this, recovery not possible |
| `completedAt`       | `Timestamp \| null`                | ✅       | Timestamp when hard deletion completed; null until done                    |
| `deletedEntityCount` | `{ stores?: number; apiKeys?: number; documents?: number; files?: number; }` | ✅ | Count of entities hard-deleted in Firestore & Cloud Storage |
| `createdAt`         | `Timestamp`                        | ✅       | Server-set when task created                                               |
| `updatedAt`         | `Timestamp`                        | ✅       | Server-set on every update (e.g., retry, completion)                       |

**Indexes**:
- `(orgId ASC, status ASC, scheduledDeleteAt ASC)` — for daily job to find tasks ready for deletion
- `(status ASC, scheduledDeleteAt ASC)` — for cross-org deletion job queries
- `(userId ASC, orgId ASC)` — for finding all deletion tasks for a user

**Enum: TaskStatus**:
```typescript
type TaskStatus = 
  | "pending"      // created, waiting for next job run
  | "in_progress"  // job is actively deleting
  | "completed"    // all data hard-deleted successfully
  | "failed"       // hard deletion failed after all retries
  | "cancelled";   // user was re-added before grace period expired
```

**Notes**:
- Deletion tasks are immutable append-only records. Updates to `status`, `retryCount`, `error`, `completedAt` are allowed but the task itself is never deleted.
- `recoveryDeadline` is set to `scheduledDeleteAt` but can be customized per org policy.
- On successful re-add within grace period, a new deletion task is created with status `cancelled` (old task NOT updated; immutable history is preserved).

---

### `/organizations/{orgId}/auditLogs/{logId}`

Subcollection on each organization. Append-only immutable audit trail for all user management events.

| Field           | Type                                          | Required | Notes                                               |
| --------------- | --------------------------------------------- | -------- | --------------------------------------------------- |
| `id`            | `string`                                      | ✅       | Firestore auto-generated document ID                |
| `orgId`         | `string`                                      | ✅       | Parent organization                                 |
| `eventType`     | `AuditEventType` (enum)                       | ✅       | Event category (see enum below)                     |
| `actorId`       | `string`                                      | ✅       | Firebase Auth UID of admin who performed action     |
| `actorEmail`    | `string`                                      | ✅       | Email of actor (denormalized for query convenience) |
| `affectedUserId` | `string`                                      | ✅       | Firebase Auth UID of affected user (or null for org events) |
| `affectedEmail` | `string \| null`                              | ✅       | Email of affected user; null if not applicable      |
| `action`        | `string`                                      | ✅       | Human-readable description (e.g., "Removed user from org") |
| `resource`      | `string \| null`                              | ✅       | Resource affected (e.g., "USER_MEMBERSHIP", "API_KEY") |
| `oldValues`     | `Record<string, any> \| null`                 | ✅       | Previous values (for updates; null for creates/deletes) |
| `newValues`     | `Record<string, any> \| null`                 | ✅       | New values (for creates/updates; null for deletes) |
| `outcome`       | `"success" \| "failure"`                      | ✅       | Result of the operation                             |
| `errorMessage`  | `string \| null`                              | ✅       | Error details if outcome is failure; null otherwise |
| `timestamp`     | `Timestamp`                                   | ✅       | Server-set; used for log chronological ordering     |
| `ipAddress`     | `string \| null`                              | ✅       | Optional actor IP for security investigation        |
| `userAgent`     | `string \| null`                              | ✅       | Optional browser/client user agent string           |

**Enum: AuditEventType**:
```typescript
type AuditEventType =
  | "USER_INVITED"         // user invited to org
  | "USER_JOINED"          // user joined org (via link/code)
  | "USER_ADDED"           // admin added user directly
  | "USER_REMOVED"         // admin removed user from org
  | "ROLE_PROMOTED"        // user promoted to admin
  | "ROLE_DEMOTED"         // user demoted from admin
  | "MEMBERSHIP_RESTORED"  // user restored during recovery window
  | "API_KEY_REVOKED_ON_REMOVAL"; // API key revoked due to user removal
```

**Indexes**:
- `(orgId ASC, timestamp DESC)` — for chronological audit log listing
- `(orgId ASC, eventType ASC, timestamp DESC)` — for filtering by event type
- `(orgId ASC, affectedUserId ASC, timestamp DESC)` — for querying all events affecting a specific user
- `(orgId ASC, actorId ASC, timestamp DESC)` — for querying all actions by a specific actor

**Notes**:
- Audit log entries are immutable and must never be deleted. Archive to cold storage after 1+ years if needed.
- `oldValues` and `newValues` store snapshots of affected attributes (e.g., `{ role: "member" }` and `{ role: "admin" }` for promotions).
- `ipAddress` and `userAgent` are optional context fields useful for security investigation but not required for v1.

---

### `/profiles/{userId}` _(Modified from existing 001-auth-onboarding-platform)_

Existing collection. Modified to support multi-organization functionality.

| Field                   | Type                | Required | Notes                                                        |
| ----------------------- | ------------------- | -------- | ------------------------------------------------------------ |
| `id`                    | `string`            | ✅       | Firebase Auth UID (same as document ID)                      |
| `email`                 | `string`            | ✅       | From Firebase Auth                                           |
| `displayName`           | `string`            | ✅       | Editable on profile                                          |
| `orgId`                 | `string`            | ✅       | **Primary** organization ID; used for dashboard on login     |
| `onboardingCompletedAt` | `Timestamp \| null` | ✅       | `null` until onboarding modal submitted                      |
| `createdAt`             | `Timestamp`         | ✅       | Server-set                                                   |
| `updatedAt`             | `Timestamp`         | ✅       | Server-set on every write                                    |

**Change from 001**: `orgId` is now the **primary** org only (for initial dashboard landing). Additional org memberships are tracked in `organizations/{orgId}/memberships/{userId}`.

---

### `/organizations/{orgId}` _(Modified from existing 001-auth-onboarding-platform)_

Existing collection. Modified to track membership count and admin count.

| Field          | Type             | Required | Notes                                                  |
| -------------- | ---------------- | -------- | ------------------------------------------------------ |
| `id`           | `string`         | ✅       | Firestore auto-generated document ID                   |
| `name`         | `string`         | ✅       | Editable from Settings                                 |
| `size`         | `OrgSize` (enum) | ✅       | Organization size for analytics                        |
| `ownerUid`     | `string`         | ✅       | Firebase Auth UID of original creator                  |
| `memberCount`  | `number`         | ✅       | Denormalized count of active (non-deleted) members     |
| `adminCount`   | `number`         | ✅       | Denormalized count of active admins (for removal validation) |
| `gracePeriodDays` | `number`      | ✅       | Configurable grace period for hard deletion (default: 30) |
| `notificationsEnabled` | `boolean` | ✅    | Whether to send offboarding/role change notifications  |
| `createdAt`    | `Timestamp`      | ✅       | Server-set                                              |
| `updatedAt`    | `Timestamp`      | ✅       | Server-set on every write                              |

**Notes**:
- `memberCount` and `adminCount` are denormalized for efficient KPI queries. They are updated on every membership change (add, remove, role change, restore).
- `gracePeriodDays` is set per-org via organization settings (configurable 1-365 days; default: 30). This setting applies to ALL user removals in that org. Individual removals cannot override this setting. The value is captured as a snapshot in each deletion task for auditability.
- These are new fields added to the existing `organizations` collection from `001-auth-onboarding-platform`.

---

## TypeScript Domain Models

### `OrgMembership` (`src/data/organizations/models/org-membership.model.ts`)

```typescript
export type UserRole = "admin" | "member";

export interface OrgMembership {
  id: string; // userId (same as Firestore document ID)
  orgId: string;
  userId: string;
  role: UserRole;
  joinedAt: Date;
  lastActiveAt: Date | null;
  deletedAt: Date | null; // null if active; set when removed
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMembershipWithProfile extends OrgMembership {
  displayName: string;
  email: string;
}
```

---

### `DeletionTask` (`src/data/organizations/models/deletion-task.model.ts`)

```typescript
export type TaskStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "failed" 
  | "cancelled";

export interface DeletionTask {
  id: string;
  userId: string;
  orgId: string;
  removedAt: Date;
  scheduledDeleteAt: Date;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  error: string | null;
  gracePeriodDays: number;
  recoveryDeadline: Date | null;
  completedAt: Date | null;
  deletedEntityCount: {
    stores?: number;
    apiKeys?: number;
    documents?: number;
    files?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

---

### `AuditLogEntry` (`src/data/organizations/models/audit-log-entry.model.ts`)

```typescript
export type AuditEventType =
  | "USER_INVITED"
  | "USER_JOINED"
  | "USER_ADDED"
  | "USER_REMOVED"
  | "ROLE_PROMOTED"
  | "ROLE_DEMOTED"
  | "MEMBERSHIP_RESTORED"
  | "API_KEY_REVOKED_ON_REMOVAL";

export interface AuditLogEntry {
  id: string;
  orgId: string;
  eventType: AuditEventType;
  actorId: string;
  actorEmail: string;
  affectedUserId: string | null;
  affectedEmail: string | null;
  action: string;
  resource: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  outcome: "success" | "failure";
  errorMessage: string | null;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
```

---

### `UserOrgContext` (`src/data/organizations/models/user-org-context.model.ts`)

```typescript
export interface UserOrgContext {
  userId: string;
  currentOrgId: string; // active org context (may differ from profile.orgId)
  memberships: OrgMembership[];
  primaryOrgId: string; // from profile.orgId
  canManageUsers: boolean; // true if admin in currentOrgId
}
```

---

### Modified `UserProfile` (`src/data/auth/models/user-profile.model.ts`)

```typescript
// Extended from existing model to support multi-org
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  orgId: string; // PRIMARY org (for dashboard landing)
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Firestore Security Rules (Pseudocode)

```rust
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User memberships in orgs
    match /organizations/{orgId}/memberships/{userId} {
      allow read: if isOrgMember(orgId);
      allow write: if isOrgAdmin(orgId);
    }

    // Deletion tasks (org admins + system)
    match /deletionTasks/{taskId} {
      allow read: if isOrgAdmin(resource.data.orgId);
      allow write: if request.auth.uid != null; // Cloud Functions authenticated write
    }

    // Audit logs (org members can read their own; admins can read all)
    match /organizations/{orgId}/auditLogs/{logId} {
      allow read: if isOrgMember(orgId);
      allow write: if request.auth.uid != null; // Server-side only
    }

    // Existing profiles collection (unchanged)
    match /profiles/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Existing organizations collection (unchanged)
    match /organizations/{orgId} {
      allow read: if isOrgMember(orgId);
      allow write: if isOrgAdmin(orgId) || request.auth.uid == resource.data.ownerUid;
    }

    // Helper functions
    function isOrgMember(orgId) {
      return exists(/databases/{database}/documents/organizations/{orgId}/memberships/{request.auth.uid})
        && get(/databases/{database}/documents/organizations/{orgId}/memberships/{request.auth.uid}).data.deletedAt == null;
    }

    function isOrgAdmin(orgId) {
      return isOrgMember(orgId)
        && get(/databases/{database}/documents/organizations/{orgId}/memberships/{request.auth.uid}).data.role == "admin";
    }
  }
}
```

---

## Database Denormalization Strategy

To support efficient queries and UI rendering, the following fields are denormalized:

1. **User profile in audit logs** (`actorEmail`, `affectedEmail`): Allows audit log display without secondary user lookups.
2. **Membership counts in organization** (`memberCount`, `adminCount`): Enables off-the-shelf KPI tiles without aggregation queries (slow in Firestore).
3. **Role in membership** (denormalized from org): Allows fast permission checks without a separate role lookup.
4. **`orgId` in membership**: Enables collectionGroup queries to find all orgs a user belongs to.
5. **Entity counts in deletion task** (`deletedEntityCount`): Provides audit trail of what was deleted without secondary queries.

**Denormalization Maintenance**:
- Updates to denormalized fields happen transactionally or via Cloud Functions to ensure consistency.
- Example: When a user is promoted to admin, both `organizations/{orgId}/memberships/{userId}.role` and `organizations/{orgId}.adminCount` are updated atomically in a transaction.

---

## Migration Notes (from 001 to 006)

The existing `organizations/{orgId}` and `profiles/{userId}` collections are extended, not replaced:

1. **Add new fields to `profiles/{userId}`**: No changes needed; `orgId` already exists and is now called the "primary" org.
2. **Add new subcollection**: Create `organizations/{orgId}/memberships/{userId}` as a new subcollection for all org-user relationships.
3. **Backfill memberships**: Existing org creator → admin membership relationship must be backfilled into the membership subcollection.
4. **Add new top-level collection**: Create `deletionTasks/` collection.
5. **Add new subcollection**: Create `organizations/{orgId}/auditLogs/` as a new subcollection.
6. **Update organization schema**: Add `memberCount`, `adminCount`, `gracePeriodDays`, `notificationsEnabled` fields.
7. **Firestore security rules**: Update to include new collections and subcollections (see pseudocode above).

---

## Indexes Required

```firestore
# Collection: organizations/{orgId}/memberships
- Index: (orgId ASC, deletedAt ASC, joinedAt DESC)
- Index: (orgId ASC, role ASC, deletedAt ASC)
- Scoped: collectionGroup index on (userId ASC, deletedAt ASC)

# Collection: deletionTasks
- Index: (status ASC, scheduledDeleteAt ASC)
- Index: (orgId ASC, status ASC, scheduledDeleteAt ASC)
- Index: (userId ASC, orgId ASC)

# Collection: organizations/{orgId}/auditLogs
- Index: (orgId ASC, timestamp DESC)
- Index: (orgId ASC, eventType ASC, timestamp DESC)
- Index: (orgId ASC, affectedUserId ASC, timestamp DESC)
- Index: (orgId ASC, actorId ASC, timestamp DESC)
```

---

## Storage Paths

**Cloud Storage (for removal cleanup)**:
- User-uploaded files: `orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename}`
- All files under `orgs/{orgId}/` owned by removed users are deleted via `buckets/list()` + `delete()` operations in the deletion task handler.

---

## Performance Considerations

- **User List Query**: Firestore query on `organizations/{orgId}/memberships` with filters and pagination. Expected latency: < 500 ms for orgs with 10k members (with proper compound indexes).
- **Audit Log Query**: Firestore query on `organizations/{orgId}/auditLogs` with compound indexes. Expected latency: < 1 s for years of data with range filters.
- **Deletion Task Polling**: Scheduled Cloud Function queries `deletionTasks` for tasks where `status = "pending"` and `scheduledDeleteAt <= now()`. Should handle 100+ tasks per run.
- **Session Invalidation**: Upon user removal from any organization, **all global sessions for that user** are invalidated (across all orgs and devices). Broadcast token revocation via session store. Session refresh checks revocation list (in-memory cache with TTL or Redis). User must re-authenticate everywhere. Expected overhead: < 100 ms per authenticated request.
