# Quickstart: User & Organization Management Module

**Module**: `006-users-organizations-module`  
**Last Updated**: 2026-04-14

---

## 5-Minute Overview

The User & Organization Management module provides organization admins with tools to manage user membership across their organization(s):

1. **View Members**: Searchable, sortable, paginated list of org members with roles
2. **Remove Members**: Soft-delete users with 30-day grace period for recovery
3. **Multi-Org Support**: Users can belong to multiple orgs and switch between them
4. **Audit Trail**: All user management actions logged immutably for compliance
5. **Background Cleanup**: Scheduled Cloud Function hard-deletes user data after grace period

### Core Concepts

**Organization Membership** (`orgMemberships` subcollection)

- Links users to organizations with a role (`admin` or `member`)
- Soft-delete via `deletedAt` timestamp (user removed but data recoverable)
- Tracked in `organizations/{orgId}/memberships/{userId}`

**Two-Phase Deletion**

1. **Immediate (< 2 sec)**: Set `deletedAt` on membership, revoke API keys, mark stores for delete
2. **Delayed (after grace period)**: Cloud Function hard-deletes all org-scoped data

**Multi-Org Pattern**

- User's `profile.orgId` = primary org (for login landing page)
- User's memberships tracked in `organizations/{orgId}/memberships/{userId}` (can belong to multiple orgs)
- Switching org changes `currentOrgId` in session state (does NOT change `profile.orgId`)

**Audit & Compliance**

- All user management actions logged to `organizations/{orgId}/auditLogs/{logId}`
- Audit entries NEVER hard-deleted (archived after 1 year for compliance)
- Supports queries by event type, actor, affected user, and date range

---

## Key Files & Directory Structure

```
specs/006-users-organizations-module/
├── plan.md                    # This overview & roadmap
├── spec.md                    # Full functional & non-functional requirements
├── data-model.md              # Firestore schema, TypeScript models, indexes
├── tasks.md                   # Sprint breakdown & implementation tasks
├── quickstart.md              # This file
└── checklists/                # Pre-implementation, launch, & rollback checklists

src/
├── data/organizations/models/
│   ├── org-membership.model.ts        # OrgMembership, UserRole types
│   ├── deletion-task.model.ts         # DeletionTask, TaskStatus types
│   ├── audit-log-entry.model.ts       # AuditLogEntry, AuditEventType types
│   └── user-org-context.model.ts      # UserOrgContext for session state
├── actions/
│   └── user-management-actions.ts     # Server actions: getOrgUserList, removeUserFromOrg, etc.
├── app/(platform)/(org)/settings/users/
│   ├── page.tsx               # User Management page
│   ├── components/
│   │   ├── user-table.tsx     # User list table with sort/search
│   │   ├── remove-user-modal.tsx  # Remove confirmation modal
│   │   └── user-list-actions.tsx  # Row actions (Remove, Promote, etc.)
│   └── hooks/
│       └── use-user-management.ts  # TanStack Query hooks for user data
└── lib/
    └── org-context.ts         # Helper functions for org switching

functions/src/
├── workflows/
│   ├── retry-org-user-deletion.ts  # Scheduled Cloud Function for hard deletion
│   └── send-user-notification-emails.ts  # Email notifications
├── lib/
│   └── org-cleanup.ts         # Helper functions for cascade delete
└── migrations/
    └── backfill-org-memberships.ts  # Migration script for existing users
```

---

## Implementation Workflow

### Phase 1: Data Model & Firestore Setup (2 days)

1. **Review Firestore schema** in [data-model.md](data-model.md) (Collections, Fields, Indexes sections)
2. **Create Firestore collections** via Firebase Console or Firestore CLI:

   ```bash
   # Add new fields to existing organizations collection:
   # - memberCount: number
   # - adminCount: number
   # - gracePeriodDays: number (default 30)
   # - notificationsEnabled: boolean (default true)

   # Create new subcollection: organizations/{orgId}/memberships/{userId}
   # Create new collection: deletionTasks
   # Create new subcollection: organizations/{orgId}/auditLogs
   ```

3. **Create required Firestore indexes** (described in data-model.md; Firebase will prompt on first query if missing)
4. **Run backfill migration** (see Task G6-004 in tasks.md) to populate existing memberships from org owners

### Phase 2: TypeScript Models & Validation (1 day)

1. **Create TypeScript interfaces** in `src/data/organizations/models/`:
   - `org-membership.model.ts` → `OrgMembership`, `UserRole`
   - `deletion-task.model.ts` → `DeletionTask`, `TaskStatus`
   - `audit-log-entry.model.ts` → `AuditLogEntry`, `AuditEventType`
   - `user-org-context.model.ts` → `UserOrgContext`

2. **Create Zod schemas** for validation:

   ```typescript
   // src/data/organizations/models/schemas.ts
   import { z } from "zod";

   export const OrgMembershipSchema = z.object({
     id: z.string(),
     orgId: z.string(),
     role: z.enum(["admin", "member"]),
     joinedAt: z.date(),
     deletedAt: z.date().nullable(),
   });

   export const RemoveUserRequestSchema = z.object({
     orgId: z.string(),
     userId: z.string(),
     reason: z.string().optional(),
   });
   ```

### Phase 3: Server Actions & API Logic (3 days)

1. **Implement server actions** in `src/actions/user-management-actions.ts`:
   - `getOrgUserList(orgId, { page, sortBy, searchEmail })` → fetch + paginate members
   - `removeUserFromOrg(orgId, userId)` → soft delete + cascade + scheduling
   - `promoteUserToAdmin(orgId, userId)` → update role + counts + audit
   - `demoteAdminToMember(orgId, userId)` → update role + validate last-admin
   - `switchUserOrg(orgId)` → validate membership + update session
   - `setPrimaryOrg(orgId)` → update profile
   - `getOrgAuditLog(orgId, { filters })` → fetch audit entries

2. **Key patterns** (matching existing codebase):
   - Use Firestore transactions for multi-document updates (e.g., remove user + revoke keys + create task)
   - Validate authorization: `if (!isOrgAdmin(orgId, userId)) throw new Error('FORBIDDEN')`
   - Return typed responses: `{ success: boolean, message: string, ...data }`
   - Handle errors: catch, map to domain errors, log with OpenTelemetry

3. **Example: `removeUserFromOrg`**:
   ```typescript
   export async function removeUserFromOrg(
     orgId: string,
     userId: string,
     options?: { reason?: string },
   ): Promise<RemoveUserResponse> {
     const caller = await getCurrentUser();

     // Validate preconditions
     if (!isOrgAdmin(orgId, caller.id)) throw new Error("FORBIDDEN");

     // Get user & org data
     const membership = await getOrgMembership(orgId, userId);
     const org = await getOrganization(orgId);

     // Validate: not removing self, not removing last admin
     if (caller.id === userId) throw new Error("CANNOT_REMOVE_SELF");
     if (membership.role === "admin" && org.adminCount === 1) {
       throw new Error("CANNOT_REMOVE_LAST_ADMIN");
     }

     // Begin transaction
     const deleteResult = await adminFirestore.runTransaction(async (tx) => {
       // 1. Soft-delete membership
       tx.update(
         adminFirestore.doc(`organizations/${orgId}/memberships/${userId}`),
         { deletedAt: FieldValue.serverTimestamp() },
       );

       // 2. Revoke API keys
       const keys = await adminFirestore
         .collection(`organizations/${orgId}/apiKeys`)
         .where("createdBy", "==", userId)
         .get();
       keys.docs.forEach((doc) => {
         tx.update(doc.ref, {
           isRevoked: true,
           revokedAt: FieldValue.serverTimestamp(),
         });
       });

       // 3. Soft-delete stores
       const stores = await adminFirestore
         .collection(`organizations/${orgId}/stores`)
         .where("createdBy", "==", userId)
         .get();
       stores.docs.forEach((doc) => {
         tx.update(doc.ref, { deletedAt: FieldValue.serverTimestamp() });
       });

       // 4. Update org counts
       tx.update(adminFirestore.doc(`organizations/${orgId}`), {
         memberCount: FieldValue.increment(-1),
         adminCount: membership.role === "admin" ? FieldValue.increment(-1) : 0,
         updatedAt: FieldValue.serverTimestamp(),
       });
     });

     // 5. Create deletion task (outside transaction for clarity)
     const taskId = await createDeletionTask(
       orgId,
       userId,
       org.gracePeriodDays,
     );

     // 6. Invalidate sessions
     await invalidateUserSessions(userId, orgId);

     // 7. Send offboarding email (async)
     queueNotificationEmail("offboarding", userId, orgId, options?.reason);

     // 8. Create audit log
     await createAuditLogEntry(orgId, {
       eventType: "USER_REMOVED",
       actorId: caller.id,
       affectedUserId: userId,
       action: `Removed user from organization`,
       outcome: "success",
     });

     return { success: true, message: "User removed", deletionTaskId: taskId };
   }
   ```

### Phase 4: UI Components (3 days)

1. **Create User Management page** (`src/app/(platform)/(org)/settings/users/page.tsx`):
   - Check access control (admin only, show error if non-admin)
   - Fetch user list with TanStack Query: `useQuery(['org-users', orgId, page, sort], () => getOrgUserList(...))`
   - Render HeroUI Table with columns: Name, Email, Role, Joined, LastActive, Actions
   - Add filter inputs: search email, sort dropdown
   - Add pagination: prev/next buttons, current page indicator
   - Show loading skeleton, empty state, error state

2. **Create Remove User modal** (`src/components/user-management/remove-user-modal.tsx`):
   - Display user name + email
   - List consequences: "2 stores, 1 API key will be marked for deletion"
   - Danger-intent buttons: Cancel, Confirm Remove
   - Handle loading state during submission
   - On success: remove from list + show toast + close modal
   - On error: show error toast + allow retry

3. **Create Org Switcher** (`src/components/org-switcher.tsx`):
   - Fetch user's orgs: `useQuery(['user-orgs'], () => getUserOrgList())`
   - Display dropdown with all orgs
   - Current org highlighted
   - On select: call `switchUserOrg(orgId)` → redirect to new org dashboard

4. **Use HeroUI components**:
   - `Table`, `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell`
   - `Input` for search
   - `Button` for actions
   - `Pagination`
   - `Select` for sort
   - `Modal` for confirmation dialogs
   - `Skeleton` for loading states

### Phase 5: Cloud Functions & Background Jobs (2 days)

1. **Create scheduled deletion Cloud Function** (`functions/src/workflows/retry-org-user-deletion.ts`):

   ```typescript
   import { onSchedule } from "firebase-functions/v2/scheduler";

   export const retryOrgUserDeletion = onSchedule(
     { schedule: "0 2,14 * * *" }, // 2 AM and 2 PM UTC, daily
     async (context) => {
       // Query deletion tasks due for hard deletion
       const tasks = await adminFirestore
         .collection("deletionTasks")
         .where("status", "==", "pending")
         .where("scheduledDeleteAt", "<=", new Date())
         .get();

       for (const taskDoc of tasks.docs) {
         const task = taskDoc.data() as DeletionTask;

         try {
           // 1. Update status to in_progress
           await taskDoc.ref.update({ status: "in_progress" });

           // 2. Hard-delete Firestore documents
           const deletedCounts = await hardDeleteUserOrgData(
             task.userId,
             task.orgId,
           );

           // 3. Hard-delete Cloud Storage files
           await hardDeleteUserCloudStorageFiles(task.userId, task.orgId);

           // 4. Delete Gemini File Search indexes
           await deleteGeminiFileSearchIndexes(task.userId, task.orgId);

           // 5. Mark task as completed
           await taskDoc.ref.update({
             status: "completed",
             completedAt: FieldValue.serverTimestamp(),
             deletedEntityCount: deletedCounts,
           });
         } catch (error) {
           // Retry logic with exponential backoff
           task.retryCount++;
           const delayMs = Math.pow(2, task.retryCount) * 60 * 1000; // 1, 5, 30 min

           if (task.retryCount >= task.maxRetries) {
             // All retries exhausted
             await taskDoc.ref.update({
               status: "failed",
               error: error.message,
             });
             // Alert admin via dashboard or email
           } else {
             // Retry later
             await taskDoc.ref.update({
               status: "pending",
               retryCount: task.retryCount,
               error: error.message,
               updatedAt: FieldValue.serverTimestamp(),
             });
           }
         }
       }
     },
   );
   ```

2. **Create email notification Cloud Functions** (async queue):
   - Offboarding email on user removal
   - Promotion/demotion emails on role change
   - Use SendGrid or similar; implement retry logic

### Phase 6: Testing & Launch (2 days)

1. **Integration tests** (Firestore emulator):
   - Test user list query with various filters/sorts
   - Test user removal and cascade deletes
   - Test promotion/demotion constraints
   - Test org switching and multi-org membership
   - Test audit log entries

2. **Load tests** (Firebase project):
   - User list query with 10k members → should be < 500 ms
   - Remove user with 2k cascade items → should be < 2 s
   - Deletion job processing 100+ tasks → should complete in reasonable time

3. **Feature flag rollout**:
   - Start with 10% of orgs (beta users)
   - Monitor error rates, performance metrics
   - Ramp to 50% → 100% over 2 weeks

---

## Common Tasks & Code Snippets

### Task: Add a New User to Org (Server Action)

```typescript
export async function addUserToOrg(
  orgId: string,
  userId: string,
): Promise<void> {
  const caller = await getCurrentUser();

  if (!isOrgAdmin(orgId, caller.id)) throw new Error("FORBIDDEN");

  await adminFirestore.doc(`organizations/${orgId}/memberships/${userId}`).set({
    orgId,
    userId,
    role: "member",
    joinedAt: FieldValue.serverTimestamp(),
    lastActiveAt: null,
    deletedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update org memberCount
  await adminFirestore.doc(`organizations/${orgId}`).update({
    memberCount: FieldValue.increment(1),
  });

  // Create audit log
  await createAuditLogEntry(orgId, {
    eventType: "USER_ADDED",
    actorId: caller.id,
    affectedUserId: userId,
    outcome: "success",
  });
}
```

### Task: Update Last Active Timestamp

```typescript
// In middleware or request handler
export async function updateUserLastActive(
  userId: string,
  orgId: string,
): Promise<void> {
  // Throttle updates to avoid excessive writes (update max once per 5 minutes)
  const lastUpdateKey = `user_active:${userId}:${orgId}`;
  const lastUpdate = await getFromCache(lastUpdateKey);

  if (lastUpdate && Date.now() - lastUpdate < 5 * 60 * 1000) {
    return; // Skip update
  }

  await adminFirestore
    .doc(`organizations/${orgId}/memberships/${userId}`)
    .update({
      lastActiveAt: FieldValue.serverTimestamp(),
    });

  await setInCache(lastUpdateKey, Date.now(), 5 * 60); // 5 min TTL
}
```

### Task: Check if User Belongs to Org

```typescript
export async function userBelongsToOrg(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const membership = await adminFirestore
    .doc(`organizations/${orgId}/memberships/${userId}`)
    .get();

  return membership.exists && membership.data()?.deletedAt == null;
}
```

---

## Debugging & Troubleshooting

### Issue: "CANNOT_REMOVE_LAST_ADMIN"

**Cause**: Attempting to remove the only admin from an organization.  
**Solution**: Promote another member to admin first, then remove the original admin.

### Issue: Deletion task stuck in "pending" status

**Cause**: Cloud Function failed to process task (Cloud Storage delete failed, timeout, etc.).  
**Solution**: Check Cloud Function logs; if transient, the job will retry. If persistent, manually mark task as `cancelled` and investigate underlying issue.

### Issue: Removed user can still access stores

**Cause**: Sessions not invalidated in time; user has cached auth token.  
**Solution**: Invalidate sessions more aggressively (immediate token revocation broadcast) or shorten token TTL.

### Issue: User list query returns "Indexes required" error

**Cause**: Composite indexes not created in Firestore.  
**Solution**: Check Firebase Console → Firestore → Indexes; create any missing indexes (Firebase will provide links).

---

## Performance Tuning

- **User List Queries**: Ensure `(orgId, deletedAt, joinedAt)` compound index exists. If query still slow, enable cursor-based pagination (implement `startAfter(lastDocId)` instead of offset).
- **Deletion Tasks**: If job processes slowly, consider splitting into parallel jobs by org (each job handles one org's deletions).
- **Session Invalidation**: If 5-minute TTL too long, broadcast revocation immediately on removal (either via realtime DB, Pub/Sub, or HTTP callback to all active sessions).

---

## Rollback Plan

If critical issues discovered in production:

1. **Disable feature flag** `user_management_beta` → all user management operations blocked
2. **Soft data restore**: Remove `deletedAt` from any accidentally removed users' memberships (Firestore update via console)
3. **Hard data restore** (if needed): Restore from Firestore backup taken before removal
4. **Communicate**: Inform affected users via email if data was lost

---

## Next Steps

1. **Review full specification**: Read [spec.md](spec.md) for all requirements and edge cases
2. **Review data model**: Read [data-model.md](data-model.md) for Firestore schema and indexes
3. **Create sprint board**: Use [tasks.md](tasks.md) to populate sprint tasks (divide across team members)
4. **Kick off Phase 1**: Start Firestore setup and backfill migration
5. **Questions?** Reference clarifications in [plan.md](plan.md) or open a design doc discussion

---

## Key Contacts

- **Module Owner**: [Name]
- **Backend Lead**: [Name]
- **Frontend Lead**: [Name]
- **QA Lead**: [Name]
- **Product Manager**: [Name]
