# Data Model: User & Organization Management Module

**Feature**: `006-users-organizations-module`  
**Date**: 2026-04-14  
**Firestore Root**: `audits/` (system-level), `organizations/{orgId}/memberships/`, `organizations/{orgId}/roles/`, `organizations/{orgId}/policies/`, `organizations/{orgId}/audits/` (org-scoped), `deletionTasks/`

---

## Audit Architecture

This SaaS platform provides API services (Authentication, Memory, Store, Context, Dashboard) to organizations via API keys. Auditing is split into two tiers:

| Tier           | Collection                                | Scope                                                                                                                                                                  | orgId         | Who can read                                       |
| -------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------- |
| **System**     | `/audits/{auditId}`                       | Platform-wide: user auth (login/logout), API key events, org lifecycle, rate limits. Many events have **no orgId** (e.g., login attempts before org context is known). | `null` or set | Platform super-admins only                         |
| **Org-scoped** | `/organizations/{orgId}/audits/{auditId}` | Always org-bound: user management, role/policy changes, resource CRUD within the tenant. `orgId` is always set.                                                        | always set    | Org admins (based on RBAC permission `audit:read`) |

Both collections are append-only and immutable.

---

## RBAC/ABAC Architecture

Each organization (tenant) has fine-grained access control via two building blocks:

| Concept               | Version | Collection                           | Description                                                                    |
| --------------------- | ------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| **System Roles**      | @v1     | `organizations/{orgId}/memberships/` | Built-in roles: `owner`, `admin`, `member` (no creation/deletion/modification) |
| **Custom Roles**      | @v2     | `organizations/{orgId}/roles/`       | Named permission sets (create, update, delete). Deferred to v2.                |
| **Attributes (ABAC)** | @v2     | `organizations/{orgId}/policies/`    | Conditional policies based on resource attributes. Deferred to v2.             |

**How evaluation works (order of precedence)**:

1. Check if user is org `owner` → full access.
2. Evaluate ABAC `policies` matching the resource attributes → explicit deny overrides any allow.
3. Evaluate RBAC `roles` assigned to the user → collect effective permissions.
4. If permission not found → deny by default.

**Permission naming convention**: `{service}:{action}` where service is one of `auth | memory | store | context | files | users | api-keys | billing | audit` and action is one of `read | write | delete | manage`.  
Examples: `store:read`, `memory:write`, `users:manage`, `audit:read`.

---

## Firestore Collections

### `/organizations/{orgId}/memberships/{userId}`

Subcollection on each organization. Tracks all user memberships, including role and deletion status.

| Field          | Type                             | Required | Notes                                                                                                                                                                             |
| -------------- | -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`                         | ✅       | Firebase Auth UID (same as document ID)                                                                                                                                           |
| `orgId`        | `string`                         | ✅       | Denormalized parent org ID (enables `collectionGroup` queries)                                                                                                                    |
| `userId`       | `string`                         | ✅       | Reference to `/profiles/{userId}`                                                                                                                                                 |
| `baseRole`     | `"owner" \| "admin" \| "member"` | ✅       | Built-in system role (v1). `owner` is org creator, cannot be removed; `admin` can manage users; `member` has read access. Custom role assignment via `roleIds` is deferred to v2. |
| `roleIds`      | `string[]`                       | ✅       | IDs of custom roles assigned to this user in this org (from `organizations/{orgId}/roles/`). Deferred to v2; always empty in v1.                                                  |
| `joinedAt`     | `Timestamp`                      | ✅       | When user joined (or re-joined) this organization                                                                                                                                 |
| `lastActiveAt` | `Timestamp \| null`              | ✅       | Last time user accessed any resource in this org; cached (update max once/5min)                                                                                                   |
| `deletedAt`    | `Timestamp \| null`              | ✅       | Soft-delete timestamp; `null` if active; set when user is removed from org                                                                                                        |
| `createdAt`    | `Timestamp`                      | ✅       | Server-set on document creation                                                                                                                                                   |
| `updatedAt`    | `Timestamp`                      | ✅       | Server-set on every write                                                                                                                                                         |

**Indexes**:

- `(orgId ASC, deletedAt ASC, joinedAt DESC)` — for listing active members sorted by join date
- `(orgId ASC, baseRole ASC, deletedAt ASC)` — for filtering by built-in role
- `(userId ASC, deletedAt ASC)` — for finding user's active memberships across orgs (`collectionGroup` query)

**Notes**:

- Membership records are soft-deleted but never hard-deleted (for recovery and audit purposes).
- The presence of a membership record in Firestore with `deletedAt != null` indicates the user was removed but data is in grace period.
- To reactivate a removed user, `deletedAt` is set back to `null` and associated deletion task is cancelled.
- `roleIds` is an array of custom role IDs. For permission evaluation, the server resolves each to its full `permissions[]` set at request time (server-side only, cached in middleware).

---

### `/organizations/{orgId}/roles/{roleId}` _(v2 Feature — Deferred)_

Custom roles defined per organization. **Scope: v2 only. Built-in system roles (owner, admin, member) in `/memberships` are immutable in v1.**

| Field         | Type             | Required | Notes                                                                            |
| ------------- | ---------------- | -------- | -------------------------------------------------------------------------------- |
| `id`          | `string`         | ✅       | Firestore auto-generated or slug (e.g., `store-editor`)                          |
| `orgId`       | `string`         | ✅       | Owning organization                                                              |
| `name`        | `string`         | ✅       | Human-readable name (e.g., "Store Editor")                                       |
| `description` | `string \| null` | ✅       | Optional description                                                             |
| `isSystem`    | `boolean`        | ✅       | `true` for built-in roles (`owner`, `admin`, `member`); non-deletable            |
| `permissions` | `string[]`       | ✅       | List of permission strings (e.g., `["store:read", "store:write", "files:read"]`) |
| `createdBy`   | `string`         | ✅       | Firebase Auth UID of admin who created the role                                  |
| `createdAt`   | `Timestamp`      | ✅       | Server-set                                                                       |
| `updatedAt`   | `Timestamp`      | ✅       | Server-set on every write                                                        |

**Built-in system roles (seeded per org on creation)**:

| Role     | Permissions                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------- |
| `owner`  | `*` (all permissions; cannot be restricted)                                                    |
| `admin`  | `users:manage`, `api-keys:manage`, `audit:read`, `store:*`, `memory:*`, `context:*`, `files:*` |
| `member` | `store:read`, `memory:read`, `context:read`, `files:read`                                      |

**Available permissions**:

```
auth:read
memory:read  memory:write  memory:delete  memory:manage
store:read   store:write   store:delete   store:manage
context:read context:write context:delete context:manage
files:read   files:write   files:delete   files:manage
users:read   users:manage
api-keys:read api-keys:manage
billing:read  billing:manage
audit:read
```

**Indexes**:

- `(orgId ASC, isSystem ASC)` — for listing system vs custom roles

**Notes**:

- Permission strings ending in `:manage` imply all sub-actions (e.g., `store:manage` → `store:read` + `store:write` + `store:delete`).
- The wildcard `*` is only valid for the built-in `owner` role and is not stored literally; evaluated server-side.
- Roles are evaluated server-side by the API middleware; Firestore security rules enforce read/write access to collections but not fine-grained resource-level policies.

---

### `/organizations/{orgId}/policies/{policyId}` _(v2 Feature — Deferred)_

Attribute-based access control policies. **Scope: v2 only. Not implemented in v1.**

| Field         | Type                | Required | Notes                                                                      |
| ------------- | ------------------- | -------- | -------------------------------------------------------------------------- |
| `id`          | `string`            | ✅       | Firestore auto-generated document ID                                       |
| `orgId`       | `string`            | ✅       | Owning organization                                                        |
| `name`        | `string`            | ✅       | Human-readable policy name (e.g., "Staging stores write-only for QA team") |
| `description` | `string \| null`    | ✅       | Optional description                                                       |
| `effect`      | `"allow" \| "deny"` | ✅       | Whether this policy grants or denies the permission                        |
| `permissions` | `string[]`          | ✅       | Permissions this policy affects (e.g., `["store:write", "store:delete"]`)  |
| `subjects`    | `PolicySubject[]`   | ✅       | Who this policy applies to (users, roles, or all members)                  |
| `conditions`  | `PolicyCondition[]` | ✅       | Attribute conditions that must ALL match for policy to apply               |
| `isActive`    | `boolean`           | ✅       | Whether policy is actively evaluated (admins can disable without deleting) |
| `createdBy`   | `string`            | ✅       | Firebase Auth UID of admin who created the policy                          |
| `createdAt`   | `Timestamp`         | ✅       | Server-set                                                                 |
| `updatedAt`   | `Timestamp`         | ✅       | Server-set on every write                                                  |

**Type: PolicySubject**:

```typescript
type PolicySubject =
  | { type: "user"; userId: string } // specific user
  | { type: "role"; roleId: string } // all users with this custom role
  | { type: "baseRole"; baseRole: "admin" | "member" } // all users with built-in role
  | { type: "all" }; // every org member
```

**Type: PolicyCondition** — resource/environment attribute that must match:

```typescript
interface PolicyCondition {
  attribute: string; // e.g. "resource.tag.environment", "resource.createdBy", "request.ipCidr"
  operator: "eq" | "neq" | "in" | "notIn" | "startsWith" | "exists";
  value: string | string[] | boolean;
}
```

**Example policy** — deny store deletion for non-owners in production:

```json
{
  "name": "Protect production stores",
  "effect": "deny",
  "permissions": ["store:delete"],
  "subjects": [{ "type": "baseRole", "baseRole": "member" }],
  "conditions": [
    {
      "attribute": "resource.tag.environment",
      "operator": "eq",
      "value": "production"
    }
  ]
}
```

**Indexes**:

- `(orgId ASC, isActive ASC)` — for loading all active policies per org (cached in middleware)

**Notes**:

- Policies are evaluated server-side only; never enforced by Firestore security rules directly.
- All active policies for an org are loaded and cached in middleware (TTL: 60 s) to avoid per-request Firestore reads.
- Policy conditions operate on resource metadata (tags, ownerId, etc.) passed by each service handler at evaluation time.

---

### `/deletionTasks/{taskId}`

Top-level collection. Append-only. Tracks scheduled hard-deletion tasks for removed users.

| Field                | Type                                                                         | Required | Notes                                                                               |
| -------------------- | ---------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `id`                 | `string`                                                                     | ✅       | Firestore auto-generated document ID                                                |
| `userId`             | `string`                                                                     | ✅       | Firebase Auth UID of removed user                                                   |
| `orgId`              | `string`                                                                     | ✅       | Organization where user was removed                                                 |
| `removedAt`          | `Timestamp`                                                                  | ✅       | When user was removed (soft-delete timestamp)                                       |
| `scheduledDeleteAt`  | `Timestamp`                                                                  | ✅       | Target time for hard deletion (removedAt + gracePeriod)                             |
| `status`             | `TaskStatus` (enum)                                                          | ✅       | One of: `pending`, `in_progress`, `completed`, `failed`, `cancelled`                |
| `retryCount`         | `number`                                                                     | ✅       | Current retry attempt (0 on creation; incremented on each retry)                    |
| `maxRetries`         | `number`                                                                     | ✅       | Maximum retries allowed (default: 3)                                                |
| `error`              | `string \| null`                                                             | ✅       | Error message from last failed attempt; `null` if not failed yet                    |
| `gracePeriodDays`    | `number`                                                                     | ✅       | Grace period applied (e.g., 30 days); snapshot of org config at removal             |
| `recoveryDeadline`   | `Timestamp \| null`                                                          | ✅       | Latest time user can be re-added to recover data; after this, recovery not possible |
| `completedAt`        | `Timestamp \| null`                                                          | ✅       | Timestamp when hard deletion completed; null until done                             |
| `deletedEntityCount` | `{ stores?: number; apiKeys?: number; documents?: number; files?: number; }` | ✅       | Count of entities hard-deleted in Firestore & Cloud Storage                         |
| `createdAt`          | `Timestamp`                                                                  | ✅       | Server-set when task created                                                        |
| `updatedAt`          | `Timestamp`                                                                  | ✅       | Server-set on every update (e.g., retry, completion)                                |

**Indexes**:

- `(orgId ASC, status ASC, scheduledDeleteAt ASC)` — for daily job to find tasks ready for deletion
- `(status ASC, scheduledDeleteAt ASC)` — for cross-org deletion job queries
- `(userId ASC, orgId ASC)` — for finding all deletion tasks for a user

**Enum: TaskStatus**:

```typescript
type TaskStatus =
  | "pending" // created, waiting for next job run
  | "in_progress" // job is actively deleting
  | "completed" // all data hard-deleted successfully
  | "failed" // hard deletion failed after all retries
  | "cancelled"; // user was re-added before grace period expired
```

**Notes**:

- Deletion tasks are immutable append-only records. Updates to `status`, `retryCount`, `error`, `completedAt` are allowed but the task itself is never deleted.
- `recoveryDeadline` is set to `scheduledDeleteAt` but can be customized per org policy.
- On successful re-add within grace period, a new deletion task is created with status `cancelled` (old task NOT updated; immutable history is preserved).

---

### `/audits/{auditId}` _(System-level — New)_

Top-level collection. Platform-wide audit trail for all system-level events across all organizations. Written by Cloud Functions API server only. Readable by platform super-admins only.

Captures: authentication events (API key auth, failures), org lifecycle (create, delete), rate limiting, and service-level API calls across all platform services (Auth, Memory, Store, Context, Dashboard).

| Field           | Type                     | Required | Notes                                                                        |
| --------------- | ------------------------ | -------- | ---------------------------------------------------------------------------- |
| `id`            | `string`                 | ✅       | Firestore auto-generated document ID                                         |
| `eventType`     | `SystemAuditEventType`   | ✅       | Event category (see enum below)                                              |
| `service`       | `PlatformService`        | ✅       | Which API service triggered the event                                        |
| `orgId`         | `string \| null`         | ✅       | Organization involved; `null` for unauthenticated/platform-level events      |
| `actorId`       | `string \| null`         | ✅       | Firebase Auth UID if available; `null` for API-key-only requests             |
| `actorApiKeyId` | `string \| null`         | ✅       | ID of the API key used for the request; `null` for session-authenticated     |
| `actorEmail`    | `string \| null`         | ✅       | Denormalized email; `null` for anonymous/API-key-only actors                 |
| `action`        | `string`                 | ✅       | Human-readable description (e.g., "API key authenticated for Store service") |
| `resource`      | `string \| null`         | ✅       | Resource path or identifier (e.g., store ID, memory ID)                      |
| `outcome`       | `"success" \| "failure"` | ✅       | Result of the operation                                                      |
| `errorCode`     | `string \| null`         | ✅       | Error code (e.g., `RATE_LIMIT_EXCEEDED`, `API_KEY_INVALID`); null if success |
| `errorMessage`  | `string \| null`         | ✅       | Human-readable error; null if success                                        |
| `requestId`     | `string \| null`         | ✅       | Unique request/trace ID for correlation across logs                          |
| `ipAddress`     | `string \| null`         | ✅       | Caller IP address                                                            |
| `userAgent`     | `string \| null`         | ✅       | Caller user agent                                                            |
| `timestamp`     | `Timestamp`              | ✅       | Server-set; used for chronological ordering                                  |

**Enum: SystemAuditEventType**:

```typescript
type SystemAuditEventType =
  // @v1: User Auth (orgId = null — happen before org context is known)
  | "SESSION_LOGIN" // user signed in (magic link, OAuth, etc.)
  | "SESSION_LOGOUT" // user signed out
  | "SESSION_REVOKED" // session forcibly revoked (e.g., on org removal)
  | "AUTH_FAILURE" // failed login attempt (wrong token, unverified, etc.)
  // @v1+: API Key (orgId = null on creation; set on auth events)
  | "API_KEY_AUTH_SUCCESS" // valid API key used to call a service
  | "API_KEY_AUTH_FAILURE" // invalid/revoked API key rejected (orgId may be null if key unknown)
  | "API_KEY_RATE_LIMITED" // API key exceeded rate limit
  | "API_KEY_CREATED" // new API key issued to org
  | "API_KEY_REVOKED" // API key manually revoked by org admin
  // @v1+: Organization Lifecycle
  | "ORG_CREATED" // new organization signed up
  | "ORG_DELETED" // organization deleted (triggers cascade)
  // @v2: Advanced (defer)
  | "SESSION_EXPIRED" // session token expired (v2)
  | "PASSWORD_RESET_REQUESTED" // user requested password reset (v2)
  | "MFA_CHALLENGE_SENT"
  | "MFA_CHALLENGE_FAILED" // MFA events (v2)
  | "API_KEY_ROTATED" // API key rotated (v2)
  | "ORG_UPDATED" // org settings changed (v2)
  | "MEMORY_CREATED"
  | "STORE_CREATED"
  | "STORE_DELETED"
  | "CONTEXT_CREATED"
  | "CONTEXT_DELETED" // service-level (v2)
  | "SCHEDULED_JOB_RUN"
  | "SCHEDULED_JOB_FAILED"; // platform health (v2)
```

**Enum: PlatformService**:

```typescript
type PlatformService =
  | "auth" // Authentication service
  | "memory" // Memory service
  | "store" // Store service
  | "context" // Context service
  | "dashboard" // Dashboard/UI layer
  | "system"; // Internal platform/Cloud Functions
```

**Indexes**:

- `(timestamp DESC)` — chronological system-wide log
- `(orgId ASC, timestamp DESC)` — all system events for a specific org
- `(eventType ASC, timestamp DESC)` — filter by event type across all orgs
- `(service ASC, timestamp DESC)` — filter by platform service
- `(orgId ASC, eventType ASC, timestamp DESC)` — org + event type compound filter

**Notes**:

- Written exclusively by Cloud Functions API middleware on every inbound API request and significant lifecycle event.
- Never readable by org admins or members — only platform super-admins via internal tooling.
- Immutable; never deleted. Archive to BigQuery or cold storage for long-term analytics.
- `requestId` enables tracing from system audit → Cloud Functions logs → OpenTelemetry spans.

---

### `/organizations/{orgId}/audits/{logId}` _(Org-scoped)_

Subcollection on each organization. Append-only immutable audit trail for events within a specific organization (user management, role changes, membership events). Readable by org admins.

| Field            | Type                              | Required | Notes                                                        |
| ---------------- | --------------------------------- | -------- | ------------------------------------------------------------ |
| `id`             | `string`                          | ✅       | Firestore auto-generated document ID                         |
| `orgId`          | `string`                          | ✅       | Parent organization                                          |
| `eventType`      | `OrgAuditEventType` (enum)        | ✅       | Event category (see enum below)                              |
| `actorId`        | `string`                          | ✅       | Firebase Auth UID of admin who performed action              |
| `actorEmail`     | `string`                          | ✅       | Email of actor (denormalized for query convenience)          |
| `affectedUserId` | `string \| null`                  | ✅       | Firebase Auth UID of affected user; null for non-user events |
| `affectedEmail`  | `string \| null`                  | ✅       | Email of affected user; null if not applicable               |
| `action`         | `string`                          | ✅       | Human-readable description (e.g., "Removed user from org")   |
| `resource`       | `string \| null`                  | ✅       | Resource affected (e.g., `"USER_MEMBERSHIP"`, `"API_KEY"`)   |
| `oldValues`      | `Record<string, unknown> \| null` | ✅       | Previous values (for updates; null for creates/deletes)      |
| `newValues`      | `Record<string, unknown> \| null` | ✅       | New values (for creates/updates; null for deletes)           |
| `outcome`        | `"success" \| "failure"`          | ✅       | Result of the operation                                      |
| `errorMessage`   | `string \| null`                  | ✅       | Error details if outcome is failure; null otherwise          |
| `timestamp`      | `Timestamp`                       | ✅       | Server-set; used for log chronological ordering              |
| `ipAddress`      | `string \| null`                  | ✅       | Optional actor IP for security investigation                 |
| `userAgent`      | `string \| null`                  | ✅       | Optional browser/client user agent string                    |

**Enum: OrgAuditEventType**:

```typescript
type OrgAuditEventType =
  // @v1: Membership
  | "USER_REMOVED" // admin removed user from org
  | "BASE_ROLE_CHANGED" // user's base role changed (admin ← → member)
  | "MEMBERSHIP_RESTORED" // user restored during recovery window
  | "API_KEY_REVOKED_ON_REMOVAL" // API key revoked due to user removal
  // @v2: Membership additions (defer)
  | "USER_INVITED"
  | "USER_JOINED"
  | "USER_ADDED" // user join variants (v2)
  // @v2: RBAC (defer)
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  | "ROLE_ASSIGNED"
  | "ROLE_UNASSIGNED" // custom roles (v2)
  // @v2: ABAC (defer)
  | "POLICY_CREATED"
  | "POLICY_UPDATED"
  | "POLICY_DELETED"
  | "POLICY_ENABLED"
  | "POLICY_DISABLED"; // policies (v2)
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
- For API-level events (auth, rate limiting), see system-level `/audits` collection instead.

---

### `/profiles/{userId}` _(Modified from existing 001-auth-onboarding-platform)_

Existing collection. Modified to support multi-organization functionality.

| Field                   | Type                | Required | Notes                                                    |
| ----------------------- | ------------------- | -------- | -------------------------------------------------------- |
| `id`                    | `string`            | ✅       | Firebase Auth UID (same as document ID)                  |
| `email`                 | `string`            | ✅       | From Firebase Auth                                       |
| `displayName`           | `string`            | ✅       | Editable on profile                                      |
| `orgId`                 | `string`            | ✅       | **Primary** organization ID; used for dashboard on login |
| `onboardingCompletedAt` | `Timestamp \| null` | ✅       | `null` until onboarding modal submitted                  |
| `createdAt`             | `Timestamp`         | ✅       | Server-set                                               |
| `updatedAt`             | `Timestamp`         | ✅       | Server-set on every write                                |

**Change from 001**: `orgId` is now the **primary** org only (for initial dashboard landing). Additional org memberships are tracked in `organizations/{orgId}/memberships/{userId}`.

---

### `/organizations/{orgId}` _(Modified from existing 001-auth-onboarding-platform)_

Existing collection. Modified to track membership count and admin count.

| Field                  | Type             | Required | Notes                                                        |
| ---------------------- | ---------------- | -------- | ------------------------------------------------------------ |
| `id`                   | `string`         | ✅       | Firestore auto-generated document ID                         |
| `name`                 | `string`         | ✅       | Editable from Settings                                       |
| `size`                 | `OrgSize` (enum) | ✅       | Organization size for analytics                              |
| `ownerUid`             | `string`         | ✅       | Firebase Auth UID of original creator                        |
| `memberCount`          | `number`         | ✅       | Denormalized count of active (non-deleted) members           |
| `adminCount`           | `number`         | ✅       | Denormalized count of active admins (for removal validation) |
| `gracePeriodDays`      | `number`         | ✅       | Configurable grace period for hard deletion (default: 30)    |
| `notificationsEnabled` | `boolean`        | ✅       | Whether to send offboarding/role change notifications        |
| `createdAt`            | `Timestamp`      | ✅       | Server-set                                                   |
| `updatedAt`            | `Timestamp`      | ✅       | Server-set on every write                                    |

**Notes**:

- `memberCount` and `adminCount` are denormalized for efficient KPI queries. They are updated on every membership change (add, remove, role change, restore).
- `gracePeriodDays` is set per-org via organization settings (configurable 1-365 days; default: 30). This setting applies to ALL user removals in that org. Individual removals cannot override this setting. The value is captured as a snapshot in each deletion task for auditability.
- These are new fields added to the existing `organizations` collection from `001-auth-onboarding-platform`.

---

## TypeScript Domain Models

### `OrgMembership` (`src/data/organizations/models/org-membership.model.ts`)

```typescript
export type BaseRole = "owner" | "admin" | "member"; // @v1

export interface OrgMembership {
  id: string; // userId (same as Firestore document ID)
  orgId: string;
  userId: string;
  baseRole: BaseRole; // @v1: owner, admin, or member; immutable in v1
  roleIds: string[]; // @v2: custom role IDs (always empty in v1)
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

### `SystemAuditEntry` (`src/data/audit/models/system-audit-entry.model.ts`)

Maps to `/audits/{auditId}`. Written by platform API middleware on every request.

```typescript
export type SystemAuditEventType =
  // User Auth (orgId = null)
  | "SESSION_LOGIN"
  | "SESSION_LOGOUT"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "PASSWORD_RESET_REQUESTED"
  | "AUTH_FAILURE"
  | "MFA_CHALLENGE_SENT"
  | "MFA_CHALLENGE_FAILED"
  // API Key
  | "API_KEY_AUTH_SUCCESS"
  | "API_KEY_AUTH_FAILURE"
  | "API_KEY_RATE_LIMITED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "API_KEY_ROTATED"
  // Org Lifecycle
  | "ORG_CREATED"
  | "ORG_DELETED"
  | "ORG_UPDATED"
  // Service-Level
  | "MEMORY_CREATED"
  | "STORE_CREATED"
  | "STORE_DELETED"
  | "CONTEXT_CREATED"
  | "CONTEXT_DELETED"
  // Platform Health
  | "SCHEDULED_JOB_RUN"
  | "SCHEDULED_JOB_FAILED";

export type PlatformService =
  | "auth"
  | "memory"
  | "store"
  | "context"
  | "dashboard"
  | "system";

export interface SystemAuditEntry {
  id: string;
  eventType: SystemAuditEventType;
  service: PlatformService;
  orgId: string | null;
  actorId: string | null;
  actorApiKeyId: string | null;
  actorEmail: string | null;
  action: string;
  resource: string | null;
  outcome: "success" | "failure";
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}
```

---

### `OrgRole` (`src/data/organizations/models/org-role.model.ts`)

```typescript
export interface OrgRole {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### `OrgPolicy` (`src/data/organizations/models/org-policy.model.ts`)

```typescript
export type PolicyEffect = "allow" | "deny";

export type PolicySubject =
  | { type: "user"; userId: string }
  | { type: "role"; roleId: string }
  | { type: "baseRole"; baseRole: "admin" | "member" }
  | { type: "all" };

export interface PolicyCondition {
  attribute: string;
  operator: "eq" | "neq" | "in" | "notIn" | "startsWith" | "exists";
  value: string | string[] | boolean;
}

export interface OrgPolicy {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  effect: PolicyEffect;
  permissions: string[];
  subjects: PolicySubject[];
  conditions: PolicyCondition[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### `OrgAuditEntry` (`src/data/audit/models/org-audit-entry.model.ts`)

Maps to `/organizations/{orgId}/audits/{auditId}`. Written on org-scoped user management, RBAC, and ABAC actions.

```typescript
export type OrgAuditEventType =
  // Membership
  | "USER_INVITED"
  | "USER_JOINED"
  | "USER_ADDED"
  | "USER_REMOVED"
  | "BASE_ROLE_CHANGED"
  | "MEMBERSHIP_RESTORED"
  | "API_KEY_REVOKED_ON_REMOVAL"
  // RBAC
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  | "ROLE_ASSIGNED"
  | "ROLE_UNASSIGNED"
  // ABAC
  | "POLICY_CREATED"
  | "POLICY_UPDATED"
  | "POLICY_DELETED"
  | "POLICY_ENABLED"
  | "POLICY_DISABLED";

export interface OrgAuditEntry {
  id: string;
  orgId: string;
  eventType: OrgAuditEventType;
  actorId: string;
  actorEmail: string;
  affectedUserId: string | null;
  affectedEmail: string | null;
  action: string;
  resource: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
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

    // System-level audits — platform super-admins only; written by Cloud Functions only
    match /audits/{auditId} {
      allow read: if isPlatformSuperAdmin();
      allow write: if false; // written only via Firebase Admin SDK (Cloud Functions)
    }

    // Deletion tasks (org admins + system)
    match /deletionTasks/{taskId} {
      allow read: if isOrgAdmin(resource.data.orgId);
      allow write: if request.auth.uid != null; // Cloud Functions authenticated write
    }

    // RBAC: Custom roles — admins manage; members read (to know their permissions)
    match /organizations/{orgId}/roles/{roleId} {
      allow read: if isOrgMember(orgId);
      allow write: if isOrgAdmin(orgId);
    }

    // ABAC: Policies — admins manage; not readable by regular members
    match /organizations/{orgId}/policies/{policyId} {
      allow read: if isOrgAdmin(orgId);
      allow write: if isOrgAdmin(orgId);
    }

    // Org-scoped audits — members with audit:read permission; written by Cloud Functions only
    match /organizations/{orgId}/audits/{logId} {
      allow read: if isOrgMember(orgId) && hasPermission(orgId, "audit:read");
      allow write: if false; // written only via Firebase Admin SDK (Cloud Functions)
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
      let membership = get(/databases/{database}/documents/organizations/{orgId}/memberships/{request.auth.uid}).data;
      return isOrgMember(orgId)
        && (membership.baseRole == "admin" || membership.baseRole == "owner");
    }

    // NOTE: Fine-grained hasPermission() check (RBAC + ABAC) is enforced server-side
    // in Cloud Functions middleware — not feasible to fully evaluate in Firestore rules.
    // This stub provides coarse collection-level protection only.
    function hasPermission(orgId, permission) {
      return isOrgAdmin(orgId); // stub: full evaluation is server-side
    }

    function isPlatformSuperAdmin() {
      // Checked against a platform-level claim set during internal admin token issuance
      return request.auth.token.platformRole == "superAdmin";
    }
  }
}
```

---

## Database Denormalization Strategy

To support efficient queries and UI rendering, the following fields are denormalized:

1. **User profile in org audits** (`actorEmail`, `affectedEmail`): Allows audit log display without secondary user lookups.
2. **Org/API key info in system audits** (`orgId`, `actorEmail`, `actorApiKeyId`): Allows system audit display without cross-collection joins.
3. **Membership counts in organization** (`memberCount`, `adminCount`): Enables off-the-shelf KPI tiles without aggregation queries (slow in Firestore).
4. **`baseRole` in membership**: Allows fast built-in permission checks without a role collection lookup.
5. **`roleIds` in membership**: Inline array avoids a separate `userRoles` join collection; works well for ≤ 20 roles per user.
6. **`orgId` in membership**: Enables collectionGroup queries to find all orgs a user belongs to.
7. **Entity counts in deletion task** (`deletedEntityCount`): Provides audit trail of what was deleted without secondary queries.
8. **Active policy cache in middleware**: All `isActive = true` policies for an org are loaded once per org per request (60 s TTL) to avoid per-permission Firestore reads.

**Denormalization Maintenance**:

- Updates to denormalized fields happen transactionally or via Cloud Functions to ensure consistency.
- Example: When a user is promoted to admin, both `organizations/{orgId}/memberships/{userId}.role` and `organizations/{orgId}.adminCount` are updated atomically in a transaction.

---

## Migration Notes (from 001 to 006)

The existing `organizations/{orgId}` and `profiles/{userId}` collections are extended, not replaced:

1. **Add new fields to `profiles/{userId}`**: No changes needed; `orgId` already exists and is now called the "primary" org.
2. **Add new subcollection**: Create `organizations/{orgId}/memberships/{userId}` as a new subcollection for all org-user relationships.
3. **Backfill memberships**: Existing org creator → admin membership relationship must be backfilled into the membership subcollection.
4. **Add new top-level collection**: Create `audits/` collection for system-level events (including auth events with no orgId).
5. **Add new top-level collection**: Create `deletionTasks/` collection.
6. **Add new subcollection**: Create `organizations/{orgId}/roles/` and seed with system roles (`owner`, `admin`, `member`) for each org.
7. **Add new subcollection**: Create `organizations/{orgId}/policies/` (empty initially).
8. **Add new subcollection**: Create `organizations/{orgId}/audits/` for org-scoped events.
9. **Backfill memberships**: Migrate existing memberships; set `baseRole` from previous `role` field; set `roleIds: []`.
10. **Update organization schema**: Add `memberCount`, `adminCount`, `gracePeriodDays`, `notificationsEnabled` fields.
11. **Firestore security rules**: Update to include new collections and subcollections (see pseudocode above).

---

## Indexes Required

```firestore
# Collection: audits (system-level)
- Index: (timestamp DESC)
- Index: (orgId ASC, timestamp DESC)
- Index: (eventType ASC, timestamp DESC)
- Index: (service ASC, timestamp DESC)
- Index: (orgId ASC, eventType ASC, timestamp DESC)

# Collection: organizations/{orgId}/memberships
- Index: (orgId ASC, deletedAt ASC, joinedAt DESC)
- Index: (orgId ASC, role ASC, deletedAt ASC)
- Scoped: collectionGroup index on (userId ASC, deletedAt ASC)

# Collection: deletionTasks
- Index: (status ASC, scheduledDeleteAt ASC)
- Index: (orgId ASC, status ASC, scheduledDeleteAt ASC)
- Index: (userId ASC, orgId ASC)

# Collection: organizations/{orgId}/roles (RBAC)
- Index: (orgId ASC, isSystem ASC)

# Collection: organizations/{orgId}/policies (ABAC)
- Index: (orgId ASC, isActive ASC)

# Collection: organizations/{orgId}/audits (org-scoped)
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
- **System Audit Query**: Firestore query on `/audits` with `orgId` or `eventType` compound indexes. Expected latency: < 1 s. High write volume (every API request) — consider batching writes or routing to BigQuery for analytics.
- **Org Audit Query**: Firestore query on `organizations/{orgId}/audits` with compound indexes. Expected latency: < 1 s for years of data with range filters.
- **Deletion Task Polling**: Scheduled Cloud Function queries `deletionTasks` for tasks where `status = "pending"` and `scheduledDeleteAt <= now()`. Should handle 100+ tasks per run.
- **Session Invalidation**: Upon user removal from any organization, **all global sessions for that user** are invalidated (across all orgs and devices). Broadcast token revocation via session store. Session refresh checks revocation list (in-memory cache with TTL or Redis). User must re-authenticate everywhere. Expected overhead: < 100 ms per authenticated request.
