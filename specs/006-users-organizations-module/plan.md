# Comprehensive Implementation Plan: User & Organization Management Module (006)

**Module**: `006-users-organizations-module`  
**Generated**: 2026-04-14  
**Status**: Ready for Engineering Sprint Planning  
**Time to Review**: 90 minutes  

---

## 1. Technical Context

### Stack & Dependencies

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Frontend** | React 19, Next.js 16+ App Router | 19.x, 16.x | UI, server actions |
| **Backend** | Node.js + Cloud Functions v2 | 22 | API, scheduling |
| **Data** | Firestore + RTDB | Native | Persistence, caching |
| **Validation** | Zod | 3.x | Input validation |
| **Query State** | TanStack Query | v5 | Frontend data fetching |
| **Email** | Firebase Cloud Functions + nodemailer | 2.x | Notifications |
| **Audit** | Immutable Firestore collections | Native | Compliance logging |
| **Auth** | Firebase Auth + Session Cookies | Native | User identity |
| **Observability** | OpenTelemetry SDK | 0.x | Tracing, monitoring |

### Key Architectural Principles

1. **Dual-persistence model**: Firestore (source of truth) + RTDB (fast access cache)
2. **Event sourcing via audit logs**: Every mutation logged immutably
3. **Transactional consistency**: Use Firestore batches for related updates
4. **Denormalized views**: Counts, last active timestamps cached at org level
5. **Soft-delete-first**: User removal is reversible within grace period
6. **Zero-knowledge deletion**: Hard-deleted data is truly inaccessible
7. **RBAC evaluation server-side**: Never at database rule layer (prevents false positive blocking)

---

## 2. Architecture Overview

### 2.1 Use Case Layer Architecture

The use case layer is the orchestration point between API endpoints (server actions) and the data access layer. Each use case encapsulates:

```
┌─────────────────┐
│  Server Action  │ (HTTP endpoint / server component action)
│  (e.g., POST    │
│   /api/...)     │
└────────┬────────┘
         │ calls with Zod-validated input
         ▼
┌─────────────────────────────────────┐
│       USE CASE (Domain Logic)       │
│                                     │
│ • Validate input (Zod)              │
│ • Auth check + RBAC eval            │
│ • Business logic                    │
│ • Atomic transactions               │
│ • Audit event creation              │
│ • Side effect queueing              │
│ • Return typed output               │
└────────┬────────┬────────┬─────────┘
         │        │        │
    ┌────▼─┐  ┌──▼──┐  ┌──▼──┐
    │FS    │  │RTDB │  │Queue│  Firestore (source of truth)
    │Data  │  │Sync │  │Msgs │  RTDB (cache)
    │Layer │  │     │  │     │  Async task queue
    └──────┘  └─────┘  └─────┘
```

### 2.2 Data Flow: User Removal Example

```
removeUserFromOrg(orgId, userId, reason):
  1. Input validation (Zod schema)
  2. Auth check: caller is admin in orgId
  3. Business rules: not last admin, not self
  4. Firestore transaction:
     a. Update membership: deletedAt = now()
     b. Revoke API keys: iterate and update
     c. Soft-delete stores: iterate and update
     d. Create audit log entry
     e. Increment deletion counter
  5. RTDB updates:
     a. Remove userId from /orgs/{orgId}/members/
     b. Update /orgs/{orgId}/permissions (clear user perms)
  6. Queue async tasks:
     a. Send offboarding email
     b. Create deletion task for hard-delete
  7. Return success + deletionTaskId
```

### 2.3 RBAC + RTDB Fast Path Strategy

**Problem**: Firestore queries for permission checks on every request are slow (100-500ms per check). We need sub-10ms permission evaluation for the happy path.

**Solution**: 
1. Cache roles/policies in RTDB (fast, low-latency reads)
2. Sync RTDB from Firestore use case layer (transactional consistency)
3. Fall back to Firestore for miss/stale data
4. Use RTDB security rules to enforce basic member access (admins can read audit logs, etc.)

**RTDB Structure**:
```
/orgs/{orgId}/
  ├── roles/                        # All roles in this org
  │   ├── owner/
  │   │   ├── permissions: ["*"]
  │   │   └── isSystem: true
  │   ├── admin/
  │   │   ├── permissions: [...]
  │   │   └── isSystem: true
  │   └── custom-{roleId}/
  │       ├── permissions: [...]
  │       └── isSystem: false
  │
  ├── members/                      # Fast member lookup
  │   ├── {userId}/
  │   │   ├── baseRole: "admin"
  │   │   ├── roleIds: ["role-1", "role-2"]
  │   │   ├── joinedAt: <timestamp>
  │   │   └── isActive: true (false if deletedAt != null)
  │
  ├── policies/                    # All ABAC policies
  │   ├── {policyId}/
  │   │   ├── effect: "allow" | "deny"
  │   │   ├── permissions: [...]
  │   │   ├── subjects: [...]
  │   │   ├── conditions: [...]
  │   │   └── isActive: true
  │
  └── memberPermissions/           # Denormalized effective permissions per user
      └── {userId}/                # Updated on role/policy changes
          ├── baseRole: "admin"
          ├── permissions: [...]   # Union of all role + policy perms
          ├── denials: [...]       # Denied permissions (from policies)
          └── updatedAt: <timestamp>
```

### 2.4 Event Emitter Pattern for Audit Logging

Every use case that mutates state must emit audit events. This is achieved through a shared `AuditEmitter` class:

```typescript
class AuditEmitter {
  async emit(event: OrgAuditEvent): Promise<void> {
    // 1. Validate event
    // 2. Write to Firestore: /organizations/{orgId}/audits/{auditId}
    // 3. Write to system audit: /audits/{systemAuditId}
    // 4. Update denormalized counts (e.g., org.adminCount)
    // 5. Return audit entry ID
  }
}
```

**All use cases inject this emitter**:
```typescript
@injectable()
export class RemoveUserFromOrgUseCase {
  constructor(
    private auditEmitter: AuditEmitter,
    private fsDataLayer: FirestoreDataLayer,
    private rtdbSync: RTDBSync,
    private notificationQueue: NotificationQueue
  ) {}
  
  async execute(input: RemoveUserInput): Promise<RemoveUserOutput> {
    // ... business logic ...
    
    // Emit audit event
    await this.auditEmitter.emit({
      eventType: "USER_REMOVED",
      orgId,
      actorId: caller.uid,
      affectedUserId: userId,
      action: `Removed user ${userEmail} from organization`,
      outcome: "success",
      timestamp: new Date(),
    });
  }
}
```

---

## 3. Phase Breakdown

### Phase 0: Research & Validation (1 day, non-blocking)

**Goal**: Validate architecture decisions with team, get feedback on RTDB sync strategy.

**Tasks**:
- [ ] Share this plan with backend team, get feedback on RTDB sync feasibility
- [ ] Benchmark Firestore query latency for user list (expect 200-500ms for 1k members)
- [ ] Benchmark RTDB read latency for permission checks (expect 5-50ms)
- [ ] Finalize pagination strategy (offset vs cursor-based for v1)
- [ ] Get security review on deletion grace period reconciliation

**Outcome**: Documented assumptions, identified risks, approved architecture

---

### Phase 1: Firestore Data Model & Schema Setup (3-4 days)

**Goal**: Set up all Firestore collections, indexes, and TypeScript models.

**Tasks**:

#### G6-001: Create Firestore Collections & Compound Indexes
- **Estimates**: 4 hours
- **Deliverables**:
  - [ ] Deploy `organizations/{orgId}/memberships/{userId}` schema to Firebase
  - [ ] Deploy `deletionTasks/{taskId}` collection
  - [ ] Deploy `organizations/{orgId}/audits/{logId}` subcollection
  - [ ] Add fields to `organizations/{orgId}`: `memberCount`, `adminCount`, `gracePeriodDays`, `notificationsEnabled`
  - [ ] Create and deploy all 12 composite indexes (listed below)
- **Acceptance**: Firebase console shows all indexes as ✅ Active

**Required Firestore Indexes**:
```
// Memberships queries
1. organizations.memberships: (orgId ASC, deletedAt ASC, joinedAt DESC)
2. organizations.memberships: (orgId ASC, baseRole ASC, deletedAt ASC)

// User's org list (collectionGroup query)
3. memberships: (userId ASC, deletedAt ASC)

// Deletion tasks queries
4. deletionTasks: (orgId ASC, status ASC, scheduledDeleteAt ASC)
5. deletionTasks: (status ASC, scheduledDeleteAt ASC)
6. deletionTasks: (userId ASC, orgId ASC)

// Audit log queries
7. organizations.audits: (orgId ASC, timestamp DESC)
8. organizations.audits: (orgId ASC, eventType ASC, timestamp DESC)
9. organizations.audits: (orgId ASC, affectedUserId ASC, timestamp DESC)
10. organizations.audits: (orgId ASC, actorId ASC, timestamp DESC)

// System audit queries
11. audits: (timestamp DESC)
12. audits: (eventType ASC, timestamp DESC)
```

#### G6-002: TypeScript Domain Models & Zod Schemas
- **Estimate**: 5 hours
- **Deliverables**:
  - [ ] `src/data/organizations/models/org-membership.model.ts`
  - [ ] `src/data/organizations/models/deletion-task.model.ts`
  - [ ] `src/data/organizations/models/user-org-context.model.ts`
  - [ ] `src/data/organizations/schemas/` folder with all Zod schemas
  - [ ] Export validation utilities and type guards
- **Acceptance**: All models compile, Zod schemas validate correctly, no TS errors

**Models to Create** (see Section 4 for full TypeScript):
```
├── OrgMembership
├── DeletionTask
├── UserOrgContext
├── OrgAuditEntry
├── RoleDefinition
├── AccessPolicy
└── Permission (enum)
```

#### G6-003: Update Firestore Security Rules
- **Estimate**: 3 hours
- **Deliverables**:
  - [ ] Update `firestore.rules` with membership read/write rules
  - [ ] Add deletion task rules (read: org admins, write: Cloud Functions only)
  - [ ] Add audit log rules (read: org members, write: server only)
  - [ ] Add helper functions: `isOrgMember()`, `isOrgAdmin()`, `isNotDeleted()`
- **Acceptance**: All rules parse without errors, test queries pass

#### G6-004: Backfill Existing Org Memberships
- **Estimate**: 3 hours
- **Deliverables**:
  - [ ] Create migration script in `functions/src/migrations/backfill-org-memberships.ts`
  - [ ] For each existing org, seed owner as admin membership
  - [ ] Update denormalized counts on all orgs
  - [ ] Test on staging with dry-run mode before production
- **Acceptance**: All org creators in memberships table, counts verified

**Phase 1 Completion Criteria**:
- ✅ All Firestore collections queryable and indexed
- ✅ All TypeScript models compile with no errors
- ✅ Security rules deployed and tested
- ✅ Existing orgs backfilled with membership records

---

### Phase 2: Use Cases, Validation, & Data Access Layer (4-5 days)

**Goal**: Implement all use cases with full input validation, business rule enforcement, and Firestore transactions.

**Tasks**:

#### G6-005: Implement Zod Validation Schemas
- **Estimate**: 4 hours
- **File**: `src/data/organizations/schemas/`
- **Deliverables**:
  - [ ] Create `src/data/organizations/schemas/membership.schema.ts` (get, list, create, update, delete)
  - [ ] Create `src/data/organizations/schemas/user-management.schema.ts` (remove, promote, demote)
  - [ ] Create `src/data/organizations/schemas/pagination.schema.ts` (cursor, limit, offset, sort)
  - [ ] Create `src/data/organizations/schemas/filter.schema.ts` (roleId, active, email, joinDate range)
  - [ ] Create `src/data/organizations/schemas/audit.schema.ts` (event types, date range filters)
  - [ ] Create `src/data/organizations/schemas/common.schema.ts` (UserId, OrgId, Email, Permission, Role)

**Schema Breakdown** (detailed in Section 5):
```typescript
// Common schemas (reusable)
UserId: z.string().refine(isValidFirebaseUUID, ...)
OrgId: z.string().refine(isValidOrgId, ...)
Email: z.string().email()
Role: z.enum(["admin", "member", "owner"])
DateTime: z.date().or(z.number())
Timestamp: z.instanceof(Timestamp)

// API input schemas
GetUserListInput: z.object({
  orgId: OrgId,
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  sortBy: z.enum(["name", "email", "role", "joinedAt"]).default("joinedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  searchEmail: z.string().optional(),
  filterRole: z.enum(["admin", "member"]).optional(),
  filterActive: z.boolean().default(true),
})

RemoveUserInput: z.object({
  orgId: OrgId,
  userId: UserId,
  reason: z.string().max(500).optional(),
})

/... and many more
```

#### G6-006: Build Firestore Data Access Layer
- **Estimate**: 6 hours
- **File**: `src/data/organizations/repository/org-membership.repository.ts`
- **Deliverables**:
  - [ ] `OrgMembershipRepository` with methods: get, list, create, update, delete, softDelete
  - [ ] Implement cursor-based pagination logic
  - [ ] Implement sort/filter helpers (email search, role filter, active filter)
  - [ ] `DeletionTaskRepository` with CRUD and query methods
  - [ ] `OrgAuditRepository` for immutable append-only writes
  - [ ] All repositories use Firestore batches for transactions

**Repository Interface**:
```typescript
interface OrgMembershipRepository {
  // Single get
  get(orgId: string, userId: string): Promise<OrgMembership | null>
  
  // Paginated list
  list(orgId: string, opts: {
    page?: number;
    limit?: number;
    sortBy?: "name" | "email" | "role" | "joinedAt";
    sortOrder?: "asc" | "desc";
    filterRole?: "admin" | "member";
    filterActive?: boolean;
    searchEmail?: string;
  }): Promise<{
    items: OrgMembershipWithProfile[];
    pagination: { page: number; limit: number; total: number; ... };
  }>
  
  // Soft delete
  softDelete(orgId: string, userId: string, reason?: string): Promise<void>
  
  // Batch operations
  batchUpdate(orgId: string, updates: Array<{ userId: string; patch: Partial<OrgMembership> }>): Promise<void>
  
  // Count queries
  countByRole(orgId: string, role: "admin" | "member"): Promise<number>
  countActive(orgId: string): Promise<number>
}
```

#### G6-007: Implement All Use Cases (Service Layer)
- **Estimate**: 12 hours
- **File**: `src/data/organizations/usecases/`
- **Deliverables**:
  - [ ] `GetOrgUserListUseCase`
  - [ ] `RemoveUserFromOrgUseCase`
  - [ ] `PromoteUserToAdminUseCase`
  - [ ] `DemoteAdminToMemberUseCase`
  - [ ] `GetUserOrgListUseCase`
  - [ ] `SwitchUserOrgUseCase`
  - [ ] `GetOrgAuditLogUseCase`
  - [ ] `RestoreUserFromDeletionUseCase`

**Use Case Template**:
```typescript
@injectable()
export class RemoveUserFromOrgUseCase implements UseCase<RemoveUserInput, RemoveUserOutput> {
  constructor(
    @inject(OrgMembershipRepository) private membershipRepo: OrgMembershipRepository,
    @inject(AuditEmitter) private auditEmitter: AuditEmitter,
    @inject(FirebaseAuthService) private auth: FirebaseAuthService,
    @inject(RTDBSync) private rtdbSync: RTDBSync,
    @inject(NotificationQueue) private notificationQueue: NotificationQueue,
  ) {}
  
  async execute(input: RemoveUserInput): Promise<RemoveUserOutput> {
    // 1. Validate input
    const validInput = RemoveUserSchema.parse(input);
    
    // 2. Auth check
    const caller = await this.getCurrentUser();
    if (!isOrgAdmin(caller, validInput.orgId)) {
      throw new ForbiddenError("Only admins can remove members");
    }
    
    // 3. Business rules
    const user = await this.membershipRepo.get(validInput.orgId, validInput.userId);
    if (!user) throw new NotFoundError("User not found");
    if (user.deletedAt) throw new ConflictError("User already removed");
    if (user.baseRole === "owner") throw new ConflictError("Cannot remove owner");
    
    const adminCount = await this.membershipRepo.countByRole(validInput.orgId, "admin");
    if (adminCount === 1 && user.baseRole === "admin") {
      throw new ConflictError("Cannot remove last admin");
    }
    
    // 4. Atomic transaction
    const deleteTaskId = await this.executeTransaction({
      orgId: validInput.orgId,
      userId: validInput.userId,
      reason: validInput.reason,
      caller,
    });
    
    // 5. RTDB sync (async, non-blocking)
    this.rtdbSync.removeUserFromOrg(validInput.orgId, validInput.userId);
    
    // 6. Queue side effects
    this.notificationQueue.enqueue({
      type: "USER_REMOVED_EMAIL",
      orgId: validInput.orgId,
      userId: validInput.userId,
    });
    
    // 7. Emit audit event (via transaction callback)
    await this.auditEmitter.emit({...});
    
    return { success: true, deletionTaskId };
  }
  
  private async executeTransaction(params): Promise<string> {
    const db = getFirestore();
    const batch = writeBatch(db);
    const now = Timestamp.now();
    
    // Update membership
    const membershipRef = doc(db, "organizations", params.orgId, "memberships", params.userId);
    batch.update(membershipRef, { deletedAt: now, updatedAt: now });
    
    // Create deletion task
    const deleteTaskRef = doc(collection(db, "deletionTasks"));
    const org = await this.getOrg(params.orgId);
    batch.set(deleteTaskRef, {
      userId: params.userId,
      orgId: params.orgId,
      removedAt: now,
      scheduledDeleteAt: Timestamp.fromDate(new Date(now.toDate().getTime() + org.gracePeriodDays * 86400000)),
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
      error: null,
      gracePeriodDays: org.gracePeriodDays,
      deletedEntityCount: {},
      createdAt: now,
      updatedAt: now,
    });
    
    // Revoke API keys
    // ... (iterate and batch update)
    
    // Soft-delete stores
    // ... (iterate and batch update)
    
    // Create audit log
    const auditRef = doc(collection(db, "organizations", params.orgId, "audits"));
    batch.set(auditRef, {...});
    
    // Update org counts
    batch.update(doc(db, "organizations", params.orgId), {
      memberCount: increment(-1),
      adminCount: user.baseRole === "admin" ? increment(-1) : increment(0),
    });
    
    await batch.commit();
    return deleteTaskRef.id;
  }
}
```

#### G6-008: Server Actions (API Layer)
- **Estimate**: 4 hours
- **File**: `src/actions/user-management-actions.ts`
- **Deliverables**:
  - [ ] Create server action wrapper for each use case
  - [ ] Add auth middleware (check logged-in, org membership)
  - [ ] Add input validation middleware (Zod parse before use case)
  - [ ] Add error handling and logging

**Server Action Template**:
```typescript
"use server";

export async function removeUserFromOrg(
  orgId: string,
  userId: string,
  reason?: string
): Promise<RemoveUserResponse> {
  // 1. Auth check
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  
  // 2. Validate input
  const input = RemoveUserSchema.parse({ orgId, userId, reason });
  
  // 3. Call use case
  const useCase = container.get(RemoveUserFromOrgUseCase);
  const result = await useCase.execute(input);
  
  // 4. Return response
  return { success: true, deletionTaskId: result.deleteTaskId };
}
```

**Phase 2 Completion Criteria**:
- ✅ All use cases implemented with full business rule enforcement
- ✅ All Zod schemas created and tested
- ✅ All repositories query/mutate Firestore correctly
- ✅ Firestore transactions are atomic (all-or-nothing)
- ✅ Audit events emitted for every mutation
- ✅ Server actions deployed and callable from UI

---

### Phase 3: RTDB Sync & Fast Path Caching (2-3 days)

**Goal**: Implement RTDB sync from Firestore, fast permission checks.

**Tasks**:

#### G6-009: Set Up RTDB Structure & Sync Service
- **Estimate**: 4 hours
- **File**: `src/lib/rtdb-sync.ts`, `functions/src/lib/rtdb-sync.ts`
- **Deliverables**:
  - [ ] Create `/orgs/{orgId}/members/` structure in RTDB
  - [ ] Create `/orgs/{orgId}/memberPermissions/` structure in RTDB
  - [ ] Create `RTDBSync` service that updates RTDB on use case mutations
  - [ ] Implement role cache in `/orgs/{orgId}/roles/`
  - [ ] Implement policy cache in `/orgs/{orgId}/policies/`

**RTDB Schema to Deploy**:
```json
{
  "orgs": {
    "{orgId}": {
      "roles": {
        "admin": {
          "permissions": ["users:manage", "api-keys:manage", ...],
          "isSystem": true
        }
      },
      "members": {
        "{userId}": {
          "baseRole": "admin",
          "roleIds": [],
          "joinedAt": <timestamp>,
          "isActive": true
        }
      },
      "memberPermissions": {
        "{userId}": {
          "baseRole": "admin",
          "permissions": ["users:manage", ...],
          "denials": [],
          "updatedAt": <timestamp>
        }
      },
      "policies": {
        "{policyId}": {
          "effect": "allow",
          "permissions": [...],
          "subjects": [...],
          "conditions": [...],
          "isActive": true
        }
      }
    }
  }
}
```

#### G6-010: Implement Permission Evaluation Service
- **Estimate**: 4 hours
- **File**: `src/lib/permission-evaluator.ts`
- **Deliverables**:
  - [ ] Fast path: check user effective permissions from RTDB
  - [ ] Slow path: evaluate Firestore policies + roles
  - [ ] Support permission wildcards (e.g., `store:*` → `store:read`, `store:write`, `store:delete`)
  - [ ] Support resource-level filters (tags, environment, etc.)
  - [ ] Cache evaluated policies in memory (TTL: 60s)

```typescript
interface PermissionEvaluator {
  // Fast path: RTDB → sub-10ms
  canAsync(userId: string, orgId: string, permission: string): Promise<boolean>
  
  // Sync fast path (for non-critical checks)
  canSync(userId: string, orgId: string, permission: string): boolean
  
  // Expensive: evaluate ABAC policies on resource
  canExecuteOnResource(
    userId: string,
    orgId: string,
    permission: string,
    resource: { id: string; tags?: Record<string, string>; createdBy?: string }
  ): Promise<boolean>
  
  // Get effective permissions (used for audit UI)
  getEffectivePermissions(userId: string, orgId: string): Promise<string[]>
}
```

#### G6-011: RTDB Rules & Security
- **Estimate**: 2 hours
- **File**: `firebase.json` (realtime database rules)
- **Deliverables**:
  - [ ] Write RTDB security rules to allow members to read their own org data
  - [ ] Allow only Cloud Functions to write to RTDB
  - [ ] Prevent users from reading other orgs' member lists
  - [ ] Allow admins to read all members in their org

**Phase 3 Completion Criteria**:
- ✅ RTDB synced from Firestore on every use case mutation
- ✅ Permission checks complete in < 50ms from RTDB
- ✅ RTDB security rules deployed and tested
- ✅ Permission evaluator integrated into middleware

---

### Phase 4: Scheduled Deletion & Cleanup (2-3 days)

**Goal**: Implement scheduled Cloud Functions for hard deletion of user data after grace period.

**Tasks**:

#### G6-012: Implement Scheduled Hard-Delete Function
- **Estimate**: 4 hours
- **File**: `functions/src/workflows/retry-org-user-deletion.ts`
- **Deliverables**:
  - [ ] Create Cloud Function triggered by Cloud Scheduler (2x daily)
  - [ ] Query `deletionTasks` with `status=pending` and `scheduledDeleteAt <= now()`
  - [ ] For each task, hard-delete stores, files, API keys, documents
  - [ ] Update task status to `completed` or `failed`
  - [ ] Retry failed tasks up to `maxRetries` with exponential backoff
  - [ ] Log outcomes to system audit trail

#### G6-013: Implement Hard-Delete Helper Functions
- **Estimate**: 3 hours
- **File**: `functions/src/lib/org-cleanup.ts`
- **Deliverables**:
  - [ ] `deleteUserStoresFromOrg(userId, orgId)` - hard-delete all stores in Firestore
  - [ ] `deleteUserFilesFromOrg(userId, orgId)` - delete all files from Cloud Storage
  - [ ] `deleteUserDocumentsFromOrg(userId, orgId)` - hard-delete all documents
  - [ ] `deleteUserAPIKeysFromOrg(userId, orgId)` - hard-delete API keys
  - [ ] `deleteUserContextsFromOrg(userId, orgId)` - hard-delete contexts
  - [ ] Each function returns count of deleted entities

#### G6-014: Recovery & Cancellation Logic
- **Estimate**: 2 hours
- **File**: `src/data/organizations/usecases/restore-user-from-deletion.ts`
- **Deliverables**:
  - [ ] Implement `RestoreUserUseCase` to cancel deletion task and unmarked membership
  - [ ] Cancel corresponding soft deletes on stores/API keys/documents
  - [ ] Audit log entry for restoration
  - [ ] Check recovery deadline (cannot recover after scheduledDeleteAt + 24h grace)

#### G6-015: Cloud Scheduler Configuration
- **Estimate**: 1 hour
- **Deliverables**:
  - [ ] Deploy Cloud Scheduler job in `firebase.json`
  - [ ] Schedule: `0 */12 * * *` (2x daily: 12:00 UTC, 00:00 UTC)
  - [ ] Target: `retry-org-user-deletion` Cloud Function
  - [ ] Add monitoring: alert on failures

**Phase 4 Completion Criteria**:
- ✅ Scheduled deletion job runs every 12 hours
- ✅ All user data hard-deleted after grace period
- ✅ Failed deletions retried up to 3x with backoff
- ✅ Recovery within grace period works correctly
- ✅ System audit events logged for all deletions

---

### Phase 5: Frontend UI & User Management Page (5-6 days)

**Goal**: Build the User Management page with sorting, filtering, removal UI.

**Tasks**:

#### G6-016: User Table Component & Listing
- **Estimate**: 4 hours
- **File**: `src/app/(platform)/(org)/settings/users/`
- **Deliverables**:
  - [ ] Create `page.tsx` for User Management page
  - [ ] Create `components/user-table.tsx` for list display
  - [ ] Implement sorting (name, email, role, joinedAt)
  - [ ] Implement search by email (debounced, case-insensitive)
  - [ ] Implement filtering by role and active status
  - [ ] Implement client-side pagination (TanStack Query)
  - [ ] Show "You" badge on current user's row
  - [ ] Show loading states and empty states

#### G6-017: Remove User Modal & Confirmation
- **Estimate**: 2 hours
- **Deliverables**:
  - [ ] Create `components/remove-user-modal.tsx`
  - [ ] Show confirmation dialog with consequences list
  - [ ] Show countdown to hard-delete
  - [ ] Require reason/comment (optional but recommended)
  - [ ] Handle error states and retry

#### G6-018: Promote/Demote Actions
- **Estimate**: 2 hours
- **Deliverables**:
  - [ ] Add "Make Admin" action on member rows
  - [ ] Add "Demote to Member" action on admin rows
  - [ ] Require confirmation for privilege changes
  - [ ] Show warning if attempting to demote last admin
  - [ ] Disable actions for self (cannot promote/demote self)

#### G6-019: Org Audit Log Viewer (UI)
- **Estimate**: 3 hours
- **File**: `src/app/(platform)/(org)/settings/audit-log/`
- **Deliverables**:
  - [ ] Create audit log page
  - [ ] Implement filtering by event type, actor, affected user, date range
  - [ ] Implement pagination
  - [ ] Show immutable entry details (read-only)
  - [ ] Export to CSV functionality

#### G6-020: Org Switcher UI
- **Estimate**: 2 hours
- **File**: `src/components/layout/org-switcher.tsx`
- **Deliverables**:
  - [ ] Create org switcher dropdown/menu component
  - [ ] Show all user's orgs
  - [ ] Fast switch between orgs (calls `switchUserOrg` server action)
  - [ ] Highlight current org
  - [ ] Show user's role in each org

#### G6-021: Error Handling & Edge Cases
- **Estimate**: 2 hours
- **Deliverables**:
  - [ ] Handle "last admin" error gracefully
  - [ ] Handle "cannot self-remove" error
  - [ ] Handle "already removed" state
  - [ ] Show helpful error messages
  - [ ] Provide recovery instructions (contact admin, etc.)

#### G6-022: Integration Tests (Frontend)
- **Estimate**: 3 hours
- **Deliverables**:
  - [ ] Test user table renders correctly
  - [ ] Test sorting/filtering/search works
  - [ ] Test remove user flow (modal, confirmation, error handling)
  - [ ] Test audit log filtering
  - [ ] Test org switcher

**Phase 5 Completion Criteria**:
- ✅ User Management page fully functional
- ✅ All user stories pass acceptance criteria
- ✅ No accessibility violations (a11y)
- ✅ Responsive design for mobile/tablet/desktop
- ✅ Error states handled gracefully
- ✅ Frontend integration tests pass

---

### Phase 6: Testing, Monitoring, & Launch (3-4 days)

**Goal**: Comprehensive testing, monitoring setup, and production launch.

**Tasks**:

#### G6-023: Unit Tests (Backend)
- **Estimate**: 4 hours
- **Deliverables**:
  - [ ] Test all use cases with various input combinations
  - [ ] Test business rule enforcement (last admin, self-removal, etc.)
  - [ ] Test error paths and error messages
  - [ ] Test audit event creation
  - [ ] Zod schema validation tests
  - [ ] Permission evaluator tests

#### G6-024: Integration Tests (Backend)
- **Estimate**: 6 hours
- **Deliverables**:
  - [ ] Test end-to-end user removal flow
  - [ ] Test recovery within grace period
  - [ ] Test hard-delete scheduling
  - [ ] Test RTDB sync on mutations
  - [ ] Test audit log queries
  - [ ] Test multi-org switching

#### G6-025: Stress & Performance Tests
- **Estimate**: 3 hours
- **Deliverables**:
  - [ ] Test user list query with 10k members (expect < 500ms)
  - [ ] Test permission checks (expect < 50ms from RTDB)
  - [ ] Test batch user operations (promote 100 users)
  - [ ] Identify and fix hot spots

#### G6-026: Security & Compliance Review
- **Estimate**: 3 hours
- **Deliverables**:
  - [ ] Verify RBAC enforcement across all endpoints
  - [ ] Verify soft-deleted users cannot access resources
  - [ ] Verify audit logs are immutable and tamper-proof
  - [ ] Verify no SQL/NoSQL injection vectors
  - [ ] Verify PII handled correctly (GDPR, CCPA)
  - [ ] Get security team sign-off

#### G6-027: Monitoring & Observability Setup
- **Estimate**: 2 hours
- **Deliverables**:
  - [ ] Add OpenTelemetry tracing to all use cases
  - [ ] Add error tracking (Sentry/equivalent)
  - [ ] Add Cloud Logging dashboards for scheduled jobs
  - [ ] Add alerts for high failure rates
  - [ ] Add alerts for slow queries

#### G6-028: Documentation & Runbooks
- **Estimate**: 2 hours
- **Deliverables**:
  - [ ] Write operations runbook: how to restore a user, how to monitor deletions
  - [ ] Write troubleshooting guide for common errors
  - [ ] Document rollback procedure (if needed)
  - [ ] Document how to adjust grace period

#### G6-029: Staging Test & Load Test
- **Estimate**: 4 hours
- **Deliverables**:
  - [ ] Deploy to staging Firebase project
  - [ ] Run full end-to-end test scenarios (all user stories)
  - [ ] Run load test (100 concurrent users)
  - [ ] Verify email notifications work correctly
  - [ ] Verify audit logs created correctly
  - [ ] Get product + security team approval

#### G6-030: Production Deploy & Monitoring
- **Estimate**: 2 hours
- **Deliverables**:
  - [ ] Deploy to production Firebase
  - [ ] Monitor for errors (first 24 hours)
  - [ ] Monitor performance metrics
  - [ ] Be on-call for issues
  - [ ] Document any issues encountered

**Phase 6 Completion Criteria**:
- ✅ All automated tests pass (unit, integration, E2E)
- ✅ Security review completed and approved
- ✅ Performance tests pass all SLOs
- ✅ Monitoring and alerts configured
- ✅ Production deployment successful
- ✅ No critical incidents in first 48 hours

---

## 4. Data Persistence Layer Design

### 4.1 Firestore Collections (Source of Truth)

All data is persisted to Firestore first, then replicated to RTDB for fast reads.

#### `organizations/{orgId}/memberships/{userId}`

```typescript
interface OrgMembership {
  // Identity
  id: string;                    // userId (document ID)
  orgId: string;                 // parent org
  userId: string;                // denormalized user ID
  
  // Role & Permissions
  baseRole: "owner" | "admin" | "member";   // built-in role
  roleIds: string[];             // custom role IDs from organizations/{orgId}/roles/
  
  // Timestamps
  joinedAt: Timestamp;           // when user joined (or re-joined) this org
  lastActiveAt: Timestamp | null; // cached, updated max once per 5 minutes
  deletedAt: Timestamp | null;   // soft-delete timestamp; null if active
  
  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `deletionTasks/{taskId}`

```typescript
interface DeletionTask {
  id: string;                         // document ID
  userId: string;                     // user being deleted
  orgId: string;                      // org they're being deleted from
  
  // Timing
  removedAt: Timestamp;               // when removal happened
  scheduledDeleteAt: Timestamp;       // when hard-delete should occur
  gracePeriodDays: number;            // grace period (snapshot at time of removal)
  recoveryDeadline: Timestamp | null; // latest time to cancel deletion
  
  // Status & Retries
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  retryCount: number;                 // current retry attempt
  maxRetries: number;                 // max allowed (default: 3)
  error: string | null;               // last error message
  
  // Results
  completedAt: Timestamp | null;
  deletedEntityCount: {
    stores?: number;
    apiKeys?: number;
    documents?: number;
    files?: number;
  };
  
  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `organizations/{orgId}/audits/{logId}`

```typescript
interface OrgAuditEntry {
  id: string;                    // document ID
  orgId: string;                 // parent org
  
  // Event
  eventType: OrgAuditEventType;  // USER_REMOVED, ROLE_PROMOTED, etc.
  action: string;                // human-readable description
  
  // Actors & Subjects
  actorId: string;               // admin who performed action
  actorEmail: string;            // denormalized for queries
  affectedUserId: string | null; // user being affected
  affectedEmail: string | null;  // denormalized
  
  // Resource & Changes
  resource: string | null;       // what was affected (USER_MEMBERSHIP, API_KEY, etc.)
  oldValues: Record<string, any> | null; // previous state
  newValues: Record<string, any> | null; // new state
  
  // Outcome
  outcome: "success" | "failure";
  errorMessage: string | null;
  
  // Context
  ipAddress: string | null;
  userAgent: string | null;
  
  // Audit
  timestamp: Timestamp;          // sort key
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `organizations/{orgId}/roles/{roleId}` (RBAC)

```typescript
interface RoleDefinition {
  id: string;                              // document ID or slug
  orgId: string;
  name: string;                            // e.g., "Store Editor"
  description: string | null;
  isSystem: boolean;                       // true for owner/admin/member
  permissions: string[];                   // e.g., ["store:read", "store:write"]
  createdBy: string;                       // admin who created role
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `organizations/{orgId}/policies/{policyId}` (ABAC)

```typescript
interface AccessPolicy {
  id: string;
  orgId: string;
  name: string;                            // e.g., "Deny production deletion"
  description: string | null;
  effect: "allow" | "deny";
  permissions: string[];                   // e.g., ["store:delete"]
  subjects: PolicySubject[];               // who this applies to
  conditions: PolicyCondition[];           // when it applies
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type PolicySubject =
  | { type: "user"; userId: string }
  | { type: "role"; roleId: string }
  | { type: "baseRole"; baseRole: "admin" | "member" }
  | { type: "all" };

interface PolicyCondition {
  attribute: string;              // e.g., "resource.tag.environment"
  operator: "eq" | "neq" | "in" | "notIn" | "startsWith" | "exists";
  value: string | string[] | boolean;
}
```

### 4.2 Firebase Realtime Database (Cache)

Fast, low-latency cache for permission checks and role lookups. Synced from Firestore.

```
/orgs/
  {orgId}/
    roles/
      admin/
        permissions: ["users:manage", "api-keys:manage", ...]
        isSystem: true
      member/
        permissions: ["store:read", "memory:read", ...]
        isSystem: true
    
    members/
      {userId}/
        baseRole: "admin"
        roleIds: ["custom-editor"]
        joinedAt: <unix-ms>
        isActive: true (false if deletedAt != null)
    
    memberPermissions/
      {userId}/
        baseRole: "admin"
        permissions: [...]        # Union of all effective permissions
        denials: [...]            # Permissions denied by policies
        updatedAt: <unix-ms>
    
    policies/
      {policyId}/
        effect: "allow"
        permissions: [...]
        subjects: [...]
        conditions: [...]
        isActive: true
```

---

## 5. API Contract Definitions

All server actions must have Zod-validated input and explicitly typed output.

### 5.1 Zod Schema Library

**File**: `src/data/organizations/schemas/`

#### Common Schemas (Reusable)

```typescript
// src/data/organizations/schemas/common.schema.ts

import { z } from "zod";

// Firebase UID validation
export const UserId = z.string()
  .min(28)
  .max(128)
  .refine(uid => /^[a-zA-Z0-9]{28,}$/.test(uid), "Invalid Firebase UID");

// Org ID validation (assume alphanumeric + hyphens/underscores)
export const OrgId = z.string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid org ID");

// Email validation
export const Email = z.string().email("Invalid email format");

// Base role
export const BaseRole = z.enum(["owner", "admin", "member"]);

// Permission string
export const Permission = z.string().regex(
  /^[a-z]+:[a-z\*]+$/,
  "Permission must be in format 'service:action'"
);

// Timestamps
export const DateTime = z.union([z.date(), z.number().int()]);
export const Timestamp = z.instanceof(FirestoreTimestamp);

// Pagination
export const PaginationInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
});

// Sort options
export const SortOrder = z.enum(["asc", "desc"]);
```

#### User Management Schemas

```typescript
// src/data/organizations/schemas/user-management.schema.ts

export const GetOrgUserListInput = z.object({
  orgId: OrgId,
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  sortBy: z.enum(["name", "email", "role", "joinedAt"]).default("joinedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  searchEmail: z.string().optional().default(""),
  filterRole: z.enum(["admin", "member"]).optional(),
  filterActive: z.boolean().default(true),
});

export type GetOrgUserListInput = z.infer<typeof GetOrgUserListInput>;

export const UserListItem = z.object({
  id: UserId,
  email: Email,
  displayName: z.string(),
  role: BaseRole,
  joinedAt: DateTime,
  lastActiveAt: DateTime.nullable(),
  isCurrentUser: z.boolean(),
});

export const GetOrgUserListOutput = z.object({
  users: z.array(UserListItem),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export const RemoveUserInput = z.object({
  orgId: OrgId,
  userId: UserId,
  reason: z.string().max(500).optional(),
});

export type RemoveUserInput = z.infer<typeof RemoveUserInput>;

export const RemoveUserOutput = z.object({
  success: z.boolean(),
  message: z.string(),
  deletionTaskId: z.string(),
});

export const PromoteUserInput = z.object({
  orgId: OrgId,
  userId: UserId,
});

export const DemoteUserInput = z.object({
  orgId: OrgId,
  userId: UserId,
});

export const RestoreUserInput = z.object({
  orgId: OrgId,
  userId: UserId,
});
```

#### Audit Log Schemas

```typescript
// src/data/organizations/schemas/audit.schema.ts

export const OrgAuditEventType = z.enum([
  "USER_INVITED",
  "USER_JOINED",
  "USER_ADDED",
  "USER_REMOVED",
  "BASE_ROLE_CHANGED",
  "MEMBERSHIP_RESTORED",
  "API_KEY_REVOKED_ON_REMOVAL",
  "ROLE_CREATED",
  "ROLE_UPDATED",
  "ROLE_DELETED",
  "ROLE_ASSIGNED",
  "ROLE_UNASSIGNED",
  "POLICY_CREATED",
  "POLICY_UPDATED",
  "POLICY_DELETED",
  "POLICY_ENABLED",
  "POLICY_DISABLED",
]);

export const GetOrgAuditLogInput = z.object({
  orgId: OrgId,
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  filterEventType: OrgAuditEventType.optional(),
  filterActorId: UserId.optional(),
  filterUserId: UserId.optional(),
  dateFrom: DateTime.optional(),
  dateTo: DateTime.optional(),
});

export const AuditLogEntry = z.object({
  id: z.string(),
  eventType: OrgAuditEventType,
  actorId: UserId,
  actorEmail: Email,
  affectedUserId: UserId.nullable(),
  affectedEmail: Email.nullable(),
  timestamp: DateTime,
  details: z.object({
    reason: z.string().optional(),
    previousRole: BaseRole.optional(),
    newRole: BaseRole.optional(),
  }),
  outcome: z.enum(["success", "failure"]),
  errorMessage: z.string().nullable(),
});

export const GetOrgAuditLogOutput = z.object({
  entries: z.array(AuditLogEntry),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});
```

### 5.2 Server Action Definitions

All server actions follow this pattern:

```typescript
"use server";

import { RemoveUserInput, RemoveUserOutput, RemoveUserSchema } from "@/data/organizations/schemas";
import { RemoveUserFromOrgUseCase } from "@/data/organizations/usecases";
import { container } from "@/lib/di-container";

/**
 * Remove a user from an organization and schedule their data for deletion.
 * 
 * @param orgId - Organization ID
 * @param userId - User ID to remove
 * @param reason - Optional reason for removal (logged in audit)
 * 
 * @throws ForbiddenError - Caller is not admin, or attempting to remove last admin
 * @throws NotFoundError - User or org does not exist
 * @throws ConflictError - User already removed, or cannot self-remove
 * 
 * @returns Success status and deletion task ID for tracking
 */
export async function removeUserFromOrg(
  orgId: string,
  userId: string,
  reason?: string
): Promise<RemoveUserOutput> {
  // 1. Validate input against schema
  const input = RemoveUserSchema.parse({ orgId, userId, reason });
  
  // 2. Get use case from DI container
  const useCase = container.get(RemoveUserFromOrgUseCase);
  
  // 3. Execute
  const result = await useCase.execute(input);
  
  // 4. Return typed output
  return RemoveUserOutput.parse({
    success: true,
    message: `User ${userId} removed from org ${orgId}. Data scheduled for deletion after 30 days.`,
    deletionTaskId: result.deletionTaskId,
  });
}

export async function getOrgUserList(
  orgId: string,
  filters: GetOrgUserListInput
): Promise<GetOrgUserListOutput> {
  const input = GetOrgUserListSchema.parse({ orgId, ...filters });
  const useCase = container.get(GetOrgUserListUseCase);
  return useCase.execute(input);
}

export async function promoteUserToAdmin(
  orgId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const input = PromoteUserSchema.parse({ orgId, userId });
  const useCase = container.get(PromoteUserToAdminUseCase);
  return useCase.execute(input);
}

export async function demoteAdminToMember(
  orgId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const input = DemoteAdminSchema.parse({ orgId, userId });
  const useCase = container.get(DemoteAdminToMemberUseCase);
  return useCase.execute(input);
}

export async function switchUserOrg(newOrgId: string): Promise<{ success: boolean }> {
  const input = z.object({ orgId: OrgId }).parse({ orgId: newOrgId });
  const useCase = container.get(SwitchUserOrgUseCase);
  await useCase.execute(input);
  return { success: true };
}

export async function getUserOrgList(): Promise<UserOrgListResponse> {
  const useCase = container.get(GetUserOrgListUseCase);
  return useCase.execute({});
}

export async function getOrgAuditLog(
  orgId: string,
  filters: GetOrgAuditLogInput
): Promise<GetOrgAuditLogOutput> {
  const input = GetOrgAuditLogSchema.parse({ orgId, ...filters });
  const useCase = container.get(GetOrgAuditLogUseCase);
  return useCase.execute(input);
}
```

---

## 6. Audit Event Catalog

Every mutation must emit audit events. This section catalogs all events and when they're triggered.

### 6.1 Organization-Scoped Audit Events

**Collection**: `/organizations/{orgId}/audits/{logId}`  
**Access**: Org admins (via audit:read permission)  
**Retention**: Immutable, never deleted (archive after 1 year)

#### USER_REMOVED

```typescript
{
  eventType: "USER_REMOVED",
  action: "Removed user alice@example.com from organization",
  actorId: "admin-uid",
  actorEmail: "admin@example.com",
  affectedUserId: "user-uid",
  affectedEmail: "alice@example.com",
  resource: "USER_MEMBERSHIP",
  oldValues: {
    baseRole: "member",
    joinedAt: 1704067200000,
    deletedAt: null,
  },
  newValues: {
    baseRole: "member",
    joinedAt: 1704067200000,
    deletedAt: 1712476800000,  // now
  },
  outcome: "success",
  timestamp: 1712476800000,
}
```

**Triggered By**: `removeUserFromOrg` use case  
**Frequency**: When admin removes a member  
**Impact**: User immediately unable to access org; data queued for hard deletion

#### ROLE_PROMOTED

```typescript
{
  eventType: "ROLE_PROMOTED",
  action: "Promoted bob@example.com to admin",
  actorId: "admin-uid",
  affectedUserId: "user-uid",
  affectedEmail: "bob@example.com",
  oldValues: { baseRole: "member" },
  newValues: { baseRole: "admin" },
  details: {
    previousRole: "member",
    newRole: "admin",
  },
  outcome: "success",
  timestamp: <now>,
}
```

**Triggered By**: `promoteUserToAdmin` use case  
**Frequency**: When admin promotes a member  
**Side Effects**: Promotion email sent; org adminCount incremented; RTDB synced

#### ROLE_DEMOTED

```typescript
{
  eventType: "ROLE_DEMOTED",
  action: "Demoted charlie@example.com from admin",
  actorId: "admin-uid",
  affectedUserId: "user-uid",
  affectedEmail: "charlie@example.com",
  oldValues: { baseRole: "admin" },
  newValues: { baseRole: "member" },
  details: {
    previousRole: "admin",
    newRole: "member",
  },
  outcome: "success",
  timestamp: <now>,
}
```

**Triggered By**: `demoteAdminToMember` use case

#### API_KEY_REVOKED_ON_REMOVAL

```typescript
{
  eventType: "API_KEY_REVOKED_ON_REMOVAL",
  action: "Revoked 3 API keys for removed user",
  actorId: null,  // system action, not user
  affectedUserId: "user-uid",
  oldValues: { revokedAt: null, isRevoked: false },
  newValues: { revokedAt: 1712476800000, isRevoked: true },
  resource: "API_KEY",
  outcome: "success",
  timestamp: <now>,
}
```

**Triggered By**: `removeUserFromOrg` use case (via cascade delete)  
**Frequency**: Emitted once per removal, covers all revoked keys

#### MEMBERSHIP_RESTORED

```typescript
{
  eventType: "MEMBERSHIP_RESTORED",
  action: "Restored alice@example.com to organization (recovered from deletion)",
  actorId: null,  // system action
  affectedUserId: "user-uid",
  affectedEmail: "alice@example.com",
  oldValues: { deletedAt: 1712476800000 },
  newValues: { deletedAt: null },
  outcome: "success",
  timestamp: <now>,
}
```

**Triggered By**: `restoreUserFromDeletion` use case  
**Frequency**: When user re-added within grace period

#### CUSTOM_ROLE_CREATED

```typescript
{
  eventType: "ROLE_CREATED",
  action: "Created custom role 'Store Reviewer'",
  actorId: "admin-uid",
  resource: "ROLE",
  newValues: {
    id: "store-reviewer",
    name: "Store Reviewer",
    permissions: ["store:read", "store:write"],
    isSystem: false,
  },
  outcome: "success",
  timestamp: <now>,
}
```

**Triggered By**: `createCustomRole` use case (not in Phase 1, future)

### 6.2 System-Level Audit Events

**Collection**: `/audits/{auditId}`  
**Access**: Platform super-admins only  
**Scope**: Platform-wide events (may have `orgId: null` if pre-org context)

#### SESSION_LOGIN

```typescript
{
  eventType: "SESSION_LOGIN",
  service: "auth",
  orgId: null,  // not yet authenticated to specific org
  actorId: "user-uid",
  actorEmail: "user@example.com",
  action: "User authenticated via Firebase Auth",
  outcome: "success",
  timestamp: <now>,
}
```

#### SESSION_REVOKED

```typescript
{
  eventType: "SESSION_REVOKED",
  service: "auth",
  orgId: "org-id",
  actorId: "user-uid",
  action: "User session revoked due to removal from org",
  errorCode: null,
  timestamp: <now>,
}
```

**Triggered By**: `removeUserFromOrg` use case (user removed → all sessions invalidated)

#### API_KEY_REVOKED

```typescript
{
  eventType: "API_KEY_REVOKED",
  service: "system",
  orgId: "org-id",
  action: "API key revoked due to user removal",
  resource: "api-key-id",
  outcome: "success",
  timestamp: <now>,
}
```

#### SCHEDULED_JOB_RUN

```typescript
{
  eventType: "SCHEDULED_JOB_RUN",
  service: "system",
  orgId: null,
  action: "Hard-delete job completed successfully",
  details: {
    jobName: "retry-org-user-deletion",
    tasksProcessed: 12,
    tasksSucceeded: 11,
    tasksFailed: 1,
    durationMs: 45000,
  },
  outcome: "success",
  timestamp: <now>,
}
```

---

## 7. Migration & Setup Tasks

### 7.1 Pre-Implementation Setup

**Timeline**: 1 day before development starts

- [ ] Review all Firestore indexes in data-model.md
- [ ] Create Firebase project test instance for dev
- [ ] Set up local Firestore emulator for development
- [ ] Get team approval on RBAC architecture
- [ ] Document rollback procedures
- [ ] Set up CI/CD pipeline for Cloud Functions and frontend

### 7.2 Firestore Migration Script

**File**: `functions/src/migrations/backfill-org-memberships.ts`

```typescript
/**
 * Migration: Backfill organization memberships from existing organizations.
 * 
 * Idempotent — safe to run multiple times.
 * Dry-run mode available for validation.
 */

export async function backfillOrgMemberships(
  adminFirestore: admin.firestore.Firestore,
  dryRun = false
): Promise<{ created: number; updated: number; errors: Error[] }> {
  const results = { created: 0, updated: 0, errors: [] };
  
  // 1. Get all organizations
  const orgsSnapshot = await adminFirestore.collection("organizations").get();
  
  for (const orgDoc of orgsSnapshot.docs) {
    const org = orgDoc.data() as Organization;
    
    // 2. Get user profile
    const userDoc = await adminFirestore.collection("profiles").doc(org.ownerUid).get();
    if (!userDoc.exists) {
      results.errors.push(new Error(`Owner ${org.ownerUid} profile not found`));
      continue;
    }
    
    const user = userDoc.data() as UserProfile;
    const membershipRef = adminFirestore
      .collection("organizations")
      .doc(org.id)
      .collection("memberships")
      .doc(org.ownerUid);
    
    const existingMembership = await membershipRef.get();
    
    if (!existingMembership.exists) {
      if (!dryRun) {
        await membershipRef.set({
          id: org.ownerUid,
          orgId: org.id,
          userId: org.ownerUid,
          baseRole: "owner",
          roleIds: [],
          joinedAt: admin.firestore.Timestamp.now(),
          lastActiveAt: null,
          deletedAt: null,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
      results.created++;
    } else {
      // Already exists; validate but don't update
      results.updated++;
    }
  }
  
  // 3. Validate and update organization counts
  for (const orgDoc of orgsSnapshot.docs) {
    const org = orgDoc.data() as Organization;
    const memberships = await adminFirestore
      .collection("organizations")
      .doc(org.id)
      .collection("memberships")
      .where("deletedAt", "==", null)
      .get();
    
    const adminCount = memberships.docs.filter(
      doc => (doc.data() as OrgMembership).baseRole === "admin" || (doc.data() as OrgMembership).baseRole === "owner"
    ).length;
    
    if (!dryRun) {
      await adminFirestore.collection("organizations").doc(org.id).update({
        memberCount: memberships.size,
        adminCount,
      });
    }
  }
  
  return results;
}

// In functions/src/migrations/index.ts
export async function runAllMigrations() {
  const result = await backfillOrgMemberships(admin.firestore(), dryRun = false);
  console.log("Migration results:", result);
}
```

### 7.3 RTDB Initial Sync

**Trigger**: After Firestore migration, before frontend deploy

```typescript
export async function syncRTDBFromFirestore(orgId: string): Promise<void> {
  const db = admin.database();
  const fs = admin.firestore();
  
  // 1. Sync roles
  const rolesSnapshot = await fs
    .collection("organizations")
    .doc(orgId)
    .collection("roles")
    .get();
  
  const rolesMap = {};
  for (const doc of rolesSnapshot.docs) {
    const role = doc.data();
    rolesMap[doc.id] = {
      permissions: role.permissions,
      isSystem: role.isSystem,
    };
  }
  
  await db.ref(`orgs/${orgId}/roles`).set(rolesMap);
  
  // 2. Sync members
  const membersSnapshot = await fs
    .collection("organizations")
    .doc(orgId)
    .collection("memberships")
    .where("deletedAt", "==", null)
    .get();
  
  const membersMap = {};
  for (const doc of membersSnapshot.docs) {
    const member = doc.data() as OrgMembership;
    membersMap[member.userId] = {
      baseRole: member.baseRole,
      roleIds: member.roleIds,
      joinedAt: member.joinedAt.toMillis(),
      isActive: member.deletedAt === null,
    };
  }
  
  await db.ref(`orgs/${orgId}/members`).set(membersMap);
  
  // 3. Calculate effective permissions for each member
  for (const [userId, member] of Object.entries(membersMap)) {
    const effectivePerms = await calculateEffectivePermissions(userId, orgId, rolesMap as any);
    await db.ref(`orgs/${orgId}/memberPermissions/${userId}`).set(effectivePerms);
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests (Backend)

**Coverage Target**: > 90%  
**Framework**: Jest + Firestore Emulator

```typescript
// src/data/organizations/usecases/__tests__/remove-user-from-org.test.ts

describe("RemoveUserFromOrgUseCase", () => {
  let useCase: RemoveUserFromOrgUseCase;
  let membershipRepo: OrgMembershipRepository;
  let auditEmitter: AuditEmitter;
  
  beforeEach(() => {
    membershipRepo = new OrgMembershipRepository(emulatedFirestore);
    auditEmitter = new AuditEmitter(emulatedFirestore);
    useCase = new RemoveUserFromOrgUseCase(membershipRepo, auditEmitter, /* ... */);
  });
  
  describe("execute", () => {
    it("should soft-delete user and create deletion task", async () => {
      const input = { orgId: "org1", userId: "user1" };
      const result = await useCase.execute(input);
      
      expect(result.success).toBe(true);
      expect(result.deletionTaskId).toBeDefined();
      
      const membership = await membershipRepo.get("org1", "user1");
      expect(membership.deletedAt).toBeDefined();
    });
    
    it("should throw error if last admin", async () => {
      const input = { orgId: "org1", userId: "admin-uid" };
      await expect(useCase.execute(input)).rejects.toThrow("Cannot remove last admin");
    });
    
    it("should emit audit event on success", async () => {
      const emitSpy = jest.spyOn(auditEmitter, "emit");
      await useCase.execute({ orgId: "org1", userId: "user1" });
      
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "USER_REMOVED",
          outcome: "success",
        })
      );
    });
  });
});
```

### 8.2 Integration Tests (Backend)

**Coverage Target**: All critical user journeys  
**Setup**: Use Firestore emulator + Cloud Functions emulator

```typescript
// tests/integration/user-removal.test.ts

describe("User Removal Flow (E2E Integration)", () => {
  let db: admin.firestore.Firestore;
  let rtdb: admin.database.Database;
  
  beforeEach(async () => {
    // Initialize emulators
    db = admin.firestore();
    rtdb = admin.database();
    await setupTestOrg(db, rtdb);
  });
  
  it("should complete full removal & recovery flow", async () => {
    // 1. Remove user
    const removeResult = await removeUserFromOrg("org1", "user1", "role change");
    expect(removeResult.success).toBe(true);
    
    // 2. Verify membership soft-deleted
    const membership = await db
      .collection("organizations")
      .doc("org1")
      .collection("memberships")
      .doc("user1")
      .get();
    expect(membership.data().deletedAt).toBeDefined();
    
    // 3. Verify RTDB synced
    const rtdbMember = await rtdb.ref(`orgs/org1/members/user1`).get();
    expect(rtdbMember.val().isActive).toBe(false);
    
    // 4. Verify audit log created
    const auditDocs = await db
      .collection("organizations")
      .doc("org1")
      .collection("audits")
      .where("eventType", "==", "USER_REMOVED")
      .get();
    expect(auditDocs.size).toBeGreaterThan(0);
    
    // 5. Verify deletion task created
    const taskDocs = await db
      .collection("deletionTasks")
      .where("userId", "==", "user1")
      .get();
    expect(taskDocs.size).toBe(1);
    const task = taskDocs.docs[0].data();
    expect(task.status).toBe("pending");
    
    // 6. Restore user (within grace period)
    const restoreResult = await restoreUserFromDeletion("org1", "user1");
    expect(restoreResult.success).toBe(true);
    
    // 7. Verify restoration
    const restoredMembership = await db
      .collection("organizations")
      .doc("org1")
      .collection("memberships")
      .doc("user1")
      .get();
    expect(restoredMembership.data().deletedAt).toBeNull();
    
    // 8. Verify deletion task cancelled
    const cancelledTask = await db
      .collection("deletionTasks")
      .doc(removeResult.deletionTaskId)
      .get();
    expect(cancelledTask.data().status).toBe("cancelled");
  });
  
  it("should hard-delete user data after grace period", async () => {
    // 1. Remove user
    await removeUserFromOrg("org1", "user1");
    
    // 2. Fast-forward time (grace period)
    const task = await db
      .collection("deletionTasks")
      .where("userId", "==", "user1")
      .get();
    const gracePeriodMs = task.docs[0].data().gracePeriodDays * 86400000;
    jest.advanceTimersByTime(gracePeriodMs + 1000);
    
    // 3. Run hard-delete job
    await retryOrgUserDeletionScheduledJob();
    
    // 4. Verify user data hard-deleted
    const stores = await db
      .collection("organizations")
      .doc("org1")
      .collection("stores")
      .where("createdBy", "==", "user1")
      .get();
    expect(stores.size).toBe(0);
  });
});
```

### 8.3 E2E Frontend Tests

```typescript
// tests/e2e/user-management.test.ts

describe("User Management Page", () => {
  it("should display user list and allow removal", async () => {
    // 1. Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.click("button:has-text('Sign In')");
    
    // 2. Navigate to user management
    await page.click("text=Settings");
    await page.click("text=Users");
    
    // 3. Verify user list shows
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("text=alice@example.com")).toBeVisible();
    
    // 4. Click remove button
    await page.click('button:has-text("Remove")');
    
    // 5. Verify confirmation modal
    await expect(page.locator("text=This action cannot be undone")).toBeVisible();
    
    // 6. Confirm removal
    await page.click('button:has-text("Remove User")');
    
    // 7. Verify user removed from list
    await expect(page.locator("text=alice@example.com")).not.toBeVisible();
  });
});
```

### 8.4 Security & Compliance Tests

```typescript
describe("Security & RBAC", () => {
  it("should deny non-admin removing users", async () => {
    const member = { uid: "member-uid", orgId: "org1", role: "member" };
    await expect(
      removeUserFromOrg.call(member, "org1", "user2")
    ).rejects.toThrow("Forbidden");
  });
  
  it("should deny removing self", async () => {
    const admin = { uid: "admin-uid", orgId: "org1", role: "admin" };
    await expect(
      removeUserFromOrg.call(admin, "org1", "admin-uid")
    ).rejects.toThrow("Cannot remove yourself");
  });
  
  it("should deny removal of last admin", async () => {
    // Verify only one admin exists
    const adminCount = await membershipRepo.countByRole("org1", "admin");
    expect(adminCount).toBe(1);
    
    // Attempt to remove
    await expect(
      removeUserFromOrg("org1", lastAdminUid)
    ).rejects.toThrow("Cannot remove last admin");
  });
  
  it("should prevent removed user accessing org resources", async () => {
    await removeUserFromOrg("org1", "user1");
    
    // Attempt to read stores
    await expect(
      getOrgUserList.call({ uid: "user1", orgId: "org1" }, "org1", {})
    ).rejects.toThrow("User has been removed from organization");
  });
  
  it("should audit all mutations", async () => {
    await removeUserFromOrg("org1", "user1", "role change");
    
    const auditLog = await getOrgAuditLog("org1", {
      filterEventType: "USER_REMOVED",
    });
    
    expect(auditLog.entries.length).toBeGreaterThan(0);
    expect(auditLog.entries[0].outcome).toBe("success");
    expect(auditLog.entries[0].details.reason).toBe("role change");
  });
});
```

---

## 9. Success Metrics & SLOs

### 9.1 Functional Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **User list query latency** | < 500 ms | P95 latency for 10k members |
| **User removal latency** | < 2 s | P95 time from request to response |
| **Audit log query latency** | < 1 s | P95 latency for 1-year range |
| **Permission check latency** | < 50 ms | P95 from RTDB (fast path) |
| **Hard-delete completion** | < 24 h | Time from grace period expiry to deletion |
| **Session invalidation** | < 5 min | Time from removal to session unavailable |

### 9.2 Quality Metrics

| Metric | Target | Method |
|--------|--------|--------|
| **Test coverage** | > 90% | Code coverage report |
| **Automated test pass rate** | 100% | CI/CD build status |
| **Critical bug escape rate** | 0% | Post-launch incident tracking |
| **API error rate** | < 0.1% | CloudWatch metrics |
| **Data consistency** | 100% | Audit trail validation |

### 9.3 Security Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| **Unauthorized access attempts** | 0 | Audit log analysis |
| **Privilege escalation attempts** | 0 | RBAC rule tests |
| **Data breach incidents** | 0 | Security review |
| **Compliance violations** | 0 | Audit log retention |

### 9.4 Post-Launch Monitoring

**First 24 Hours**:
- [ ] Error rate < 0.1%
- [ ] No critical incidents
- [ ] Latency SLOs met
- [ ] Audit logs complete

**First Week**:
- [ ] Performance stable
- [ ] User feedback collected
- [ ] No data loss incidents
- [ ] RTDB sync validation

**First Month**:
- [ ] Scheduled deletion job running smoothly
- [ ] Recovery requests tracked
- [ ] Compliance audit passed
- [ ] Performance optimizations identified

---

## 10. Risk Mitigation & Rollback

### 10.1 Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **RTDB sync lag** | Medium | Data stale for permission checks | Implement fallback to Firestore, monitor lag metric |
| **Hard-delete job failures** | Medium | User data not deleted after grace period | Retry logic (3x), manual intervention runbook, alerts |
| **Accidental mass removal** | Low | Major users offboarded | Require confirmation, audit trail, recovery window |
| **Schema migration issues** | Low | Data corruption | Dry-run migration, validation scripts, rollback plan |
| **Performance regression** | Medium | User list slow for large orgs | Load test + benchmarking, optimize indexes |

### 10.2 Rollback Procedure

If critical issues arise post-launch:

1. **Immediate** (< 5 min):
   - Stop accepting new user removals via feature flag
   - Route permission checks to slower Firestore fallback
   - Alert on-call team

2. **Short-term** (5-30 min):
   - Revert frontend changes (redeploy previous version)
   - Stop scheduled hard-delete job (disable Cloud Scheduler)
   - Investigate root cause

3. **Post-incident**:
   - Document what went wrong
   - Implement additional tests/monitoring
   - Plan post-mortem with team
   - Deploy fixes before re-enabling

---

## 11. Appendix: File Structure

Final project structure after all phases:

```
src/
├── actions/
│   └── user-management-actions.ts       # Server actions
│
├── data/organizations/
│   ├── models/
│   │   ├── org-membership.model.ts
│   │   ├── deletion-task.model.ts
│   │   ├── user-org-context.model.ts
│   │   └── audit-log-entry.model.ts
│   │
│   ├── schemas/
│   │   ├── common.schema.ts            # Reusable Zod schemas
│   │   ├── user-management.schema.ts   # Remove, promote, demote
│   │   ├── pagination.schema.ts        # Pagination, sorting, filtering
│   │   ├── audit.schema.ts             # Audit event schemas
│   │   └── index.ts
│   │
│   ├── repository/
│   │   ├── org-membership.repository.ts
│   │   ├── deletion-task.repository.ts
│   │   ├── org-audit.repository.ts
│   │   └── index.ts
│   │
│   └── usecases/
│       ├── get-org-user-list.usecase.ts
│       ├── remove-user-from-org.usecase.ts
│       ├── promote-user-to-admin.usecase.ts
│       ├── demote-admin-to-member.usecase.ts
│       ├── switch-user-org.usecase.ts
│       ├── restore-user-from-deletion.usecase.ts
│       ├── get-user-org-list.usecase.ts
│       ├── get-org-audit-log.usecase.ts
│       └── index.ts
│
├── lib/
│   ├── rtdb-sync.ts                    # RTDB synchronization service
│   ├── permission-evaluator.ts         # Permission checks (fast path)
│   └── audit-emitter.ts                # Audit event creation
│
├── app/(platform)/(org)/settings/
│   ├── users/
│   │   ├── page.tsx                    # User Management page
│   │   ├── components/
│   │   │   ├── user-table.tsx
│   │   │   ├── remove-user-modal.tsx
│   │   │   └── user-list-actions.tsx
│   │   └── hooks/
│   │       └── use-user-management.ts  # TanStack Query hooks
│   │
│   └── audit-log/
│       ├── page.tsx                    # Audit Log page
│       └── components/
│           ├── audit-table.tsx
│           └── audit-filters.tsx
│
└── components/
    └── layout/
        └── org-switcher.tsx            # Org switch dropdown

functions/src/
├── workflows/
│   ├── retry-org-user-deletion.ts      # Scheduled hard-delete function
│   └── send-user-notification-emails.ts
│
├── lib/
│   ├── org-cleanup.ts                  # Helper functions for cascade delete
│   └── rtdb-sync.ts                    # RTDB update on Firestore mutations
│
└── migrations/
    ├── backfill-org-memberships.ts     # Migrate existing orgs
    └── index.ts

tests/
├── unit/
│   ├── usecases/
│   │   ├── remove-user-from-org.test.ts
│   │   └── ... (one per usecase)
│   └── repositories/
│       └── ... (repository tests)
│
├── integration/
│   ├── user-removal-flow.test.ts
│   ├── user-recovery-flow.test.ts
│   └── hard-delete-workflow.test.ts
│
└── e2e/
    ├── user-management-page.test.ts
    └── org-switcher.test.ts
```

---

## 12. Conclusion & Next Steps

This implementation plan provides a comprehensive roadmap for delivering the User & Organization Management module with full data validation, audit logging, RBAC sync, and scheduled cleanup.

**Estimated Total Timeline**: 4-5 weeks (5 developers)

**Next Actions**:
1. Review this plan with the engineering team
2. Schedule Phase 0 research session
3. Create detailed Jira tickets from each task
4. Assign tasks to team members
5. Set up development environment
6. Begin Phase 1 (Firestore setup)

**Contact**: [Engineering Lead] for questions or clarifications.

---

**Generated**: 2026-04-14  
**Version**: 1.0  
**Status**: Ready for Implementation
