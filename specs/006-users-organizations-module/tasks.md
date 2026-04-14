# Implementation Tasks: User & Organization Management Module

**Feature**: `006-users-organizations-module`  
**Date**: 2026-04-14  
**Status**: Ready for Sprint Planning

---

## Phase 1: Foundation & Data Model Setup (Sprint 1)

### Task G6-001: Create Firestore Collections & Indexes
**Priority**: P0  
**Estimate**: 4 hours  
**Owner**: Backend Lead

**Description**: Set up Firestore collections and required compound indexes for the new module.

**Subtasks**:
- [ ] Create `organizations/{orgId}/memberships/{userId}` subcollection schema
- [ ] Create `deletionTasks/{taskId}` top-level collection
- [ ] Create `organizations/{orgId}/auditLogs/{logId}` subcollection
- [ ] Add new fields to existing `organizations/{orgId}`: `memberCount`, `adminCount`, `gracePeriodDays`, `notificationsEnabled`
- [ ] Define all required Firestore composite indexes (listed in data-model.md)
- [ ] Deploy indexes to Firebase project (await index creation)

**Acceptance Criteria**:
- ✅ All new collections are queryable in Firestore console
- ✅ Composite indexes are created and active (visible in Firebase console)
- ✅ Test queries return correct results within expected latency

**Blockers**: None

---

### Task G6-002: Create TypeScript Domain Models
**Priority**: P0  
**Estimate**: 3 hours  
**Owner**: Frontend Lead / Backend Lead

**Description**: Define all TypeScript interfaces and types for the new entities.

**Subtasks**:
- [ ] Create `src/data/organizations/models/org-membership.model.ts`
- [ ] Create `src/data/organizations/models/deletion-task.model.ts`
- [ ] Create `src/data/organizations/models/audit-log-entry.model.ts`
- [ ] Create `src/data/organizations/models/user-org-context.model.ts`
- [ ] Update existing `src/data/auth/models/user-profile.model.ts` with primary org context documentation
- [ ] Create Zod validation schemas for all models (for API request/response validation)

**Acceptance Criteria**:
- ✅ All models are exported and importable across the codebase
- ✅ Zod schemas validate correctly against model types
- ✅ No TypeScript compilation errors

**Blockers**: Depends on Task G6-001

---

### Task G6-003: Update Firestore Security Rules
**Priority**: P0  
**Estimate**: 2 hours  
**Owner**: Backend Lead

**Description**: Update `firestore.rules` to include access control for new collections.

**Changes**:
- [ ] Add rules for `/organizations/{orgId}/memberships/{userId}` (read: members, write: admins)
- [ ] Add rules for `/deletionTasks/{taskId}` (read: org admins, write: Cloud Functions)
- [ ] Add rules for `/organizations/{orgId}/auditLogs/` (read: members, write: server only)
- [ ] Update helper functions: `isOrgMember()`, `isOrgAdmin()` to check `deletedAt`

**Acceptance Criteria**:
- ✅ Security rules deploy without errors
- ✅ Test rules allow admin reads/writes on memberships
- ✅ Test rules block non-admin writes
- ✅ Test rules prevent removed users (deletedAt != null) from accessing resources

**Blockers**: Depends on Task G6-001

---

### Task G6-004: Backfill Membership Data from Existing Users
**Priority**: P0  
**Estimate**: 3 hours  
**Owner**: Backend Lead

**Description**: Migrate existing org relationships into the new `memberships` subcollection.

**Script**:
- [ ] Create migration script in `functions/src/migrations/backfill-org-memberships.ts`
- [ ] For each existing organization, create a membership record for `ownerUid` with role `admin`
- [ ] For each user in existing org (if any data exists), create appropriate membership records
- [ ] Update organization `memberCount` and `adminCount` based on memberships
- [ ] Test on staging Firebase project before prod

**Acceptance Criteria**:
- ✅ All existing org creators are in memberships with admin role
- ✅ Org counts match membership count
- ✅ Migration is idempotent (safe to re-run)

**Blockers**: Depends on Tasks G6-001, G6-002

---

## Phase 2: Core API & Server Actions (Sprint 1-2)

### Task G6-005: Implement User Listing Server Action
**Priority**: P1  
**Estimate**: 4 hours  
**Owner**: Backend Lead

**Description**: Create `getOrgUserList` server action with filtering, sorting, and pagination.

**File**: `src/actions/user-management-actions.ts`

**Implementation**:
- [ ] Create `getOrgUserList(orgId, { page, sortBy, sortOrder, searchEmail, limit })`
- [ ] Validate caller is admin in orgId
- [ ] Query `organizations/{orgId}/memberships` with filters
- [ ] Support sorting: name, email, role, joinDate (with ASC/DESC)
- [ ] Support search: email prefix match (case-insensitive)
- [ ] Return paginated response with `users[]`, `pagination{ page, limit, total, hasNext, hasPrev }`
- [ ] Add TanStack Query integration for caching/invalidation
- [ ] Write unit tests (mock Firestore queries)

**Acceptance Criteria**:
- ✅ Query returns correct paginated results
- ✅ Sorting by each field works correctly
- ✅ Search filters email addresses correctly
- ✅ Non-admins receive 403 error
- ✅ Query completes within 500 ms for 10k members

**Blockers**: Depends on Tasks G6-001, G6-002, G6-003

---

### Task G6-006: Implement Remove User from Organization Action
**Priority**: P1  
**Estimate**: 6 hours  
**Owner**: Backend Lead

**Description**: Create `removeUserFromOrg` server action with cascading deletions and scheduling.

**File**: `src/actions/user-management-actions.ts`

**Implementation**:
- [ ] Create precondition checks: caller is admin, user is not last admin, caller not removing self
- [ ] Begin Firestore transaction:
  - [ ] Set `deletedAt` on user membership
  - [ ] Query and revoke all API keys for that user: `isRevoked = true`, `revokedAt = now()`
  - [ ] Query all stores by user and set soft delete: `deletedAt = now()`
  - [ ] Decrement org `memberCount` and `adminCount` if applicable
- [ ] Create deletion task in `deletionTasks/`: status=pending, scheduledDeleteAt=now+gracePeriod
- [ ] Create audit log entry: eventType=USER_REMOVED, outcome=success
- [ ] Invalidate user sessions for that org (broadcast token revocation)
- [ ] Queue offboarding email (async, non-blocking)
- [ ] Return `{ success, deletionTaskId }`
- [ ] Write integration tests (real Firestore emulator)

**Acceptance Criteria**:
- ✅ User disappears from membership list immediately
- ✅ API keys are revoked and returned in next API call as 401
- ✅ Stores marked for deletion and inaccessible
- ✅ Deletion task created with correct gracePeriod
- ✅ Audit log entry recorded
- ✅ User sessions invalidated within 5 minutes
- ✅ Action completes within 2 seconds

**Blockers**: Depends on Tasks G6-001, G6-002, G6-003, G6-005

---

### Task G6-007: Implement Promote/Demote Server Actions
**Priority**: P2  
**Estimate**: 3 hours  
**Owner**: Backend Lead

**Description**: Create `promoteUserToAdmin` and `demoteAdminToMember` server actions.

**File**: `src/actions/user-management-actions.ts`

**Implementation**:
- [ ] Create `promoteUserToAdmin(orgId, userId)`: set role=admin, update adminCount
- [ ] Create `demoteAdminToMember(orgId, userId)`: set role=member, check last-admin constraint, update adminCount
- [ ] Both actions require admin caller
- [ ] Both create audit log entries
- [ ] Both trigger promotion/demotion emails (if notifications enabled)
- [ ] Write unit tests

**Acceptance Criteria**:
- ✅ Role changes persist in Firestore
- ✅ Counts updated correctly
- ✅ Last-admin constraint enforced
- ✅ Audit log entries recorded
- ✅ Emails queued

**Blockers**: Depends on Tasks G6-005, G6-006

---

### Task G6-008: Implement Org Switching Server Actions
**Priority**: P2  
**Estimate**: 2 hours  
**Owner**: Backend Lead

**Description**: Create `switchUserOrg` and `setPrimaryOrg` server actions.

**File**: `src/actions/user-management-actions.ts`

**Implementation**:
- [ ] Create `switchUserOrg(newOrgId)`: validate membership exists and not deleted, update client session state
- [ ] Create `setPrimaryOrg(orgId)`: validate membership, update profile `orgId` field
- [ ] Both actions query user's memberships via collectionGroup query

**Acceptance Criteria**:
- ✅ User can switch to any org they belong to
- ✅ Removed users cannot switch to removed org
- ✅ Primary org persists across login sessions

**Blockers**: Depends on Tasks G6-002, G6-003

---

### Task G6-009: Implement Audit Log Query Server Action
**Priority**: P2  
**Estimate**: 3 hours  
**Owner**: Backend Lead

**Description**: Create `getOrgAuditLog` server action with filtering and export.

**File**: `src/actions/user-management-actions.ts`

**Implementation**:
- [ ] Create `getOrgAuditLog(orgId, { page, filterEventType, filterActorId, filterUserId, dateFrom, dateTo })`
- [ ] Query `organizations/{orgId}/auditLogs` with all filters applied
- [ ] Support pagination (50 items per page)
- [ ] Return audit entries with denormalized actor/user emails
- [ ] Create `exportAuditLogAsCSV(orgId, dateFrom, dateTo)` for compliance exports
- [ ] Only admins can access audit logs

**Acceptance Criteria**:
- ✅ Audit log entries retrieved correctly with filters
- ✅ CSV export contains all required fields
- ✅ Query completes within 1 second

**Blockers**: Depends on Tasks G6-001, G6-002, G6-003

---

## Phase 3: UI Components (Sprint 2)

### Task G6-010: Create User Management Page Layout
**Priority**: P1  
**Estimate**: 3 hours  
**Owner**: Frontend Lead

**Description**: Build the main User Management page with table, filters, and search.

**File**: `src/app/(platform)/(org)/settings/users/page.tsx`

**Components**:
- [ ] Create `UserManagementPage` (layout, breadcrumbs, access control)
- [ ] Render user list table with columns: name, email, role, joinDate, lastActive, actions
- [ ] Add sort column headers with ASC/DESC toggle
- [ ] Add search box for email prefix search
- [ ] Add pagination controls (prev/next, page selector)
- [ ] Add loading skeleton during data fetch
- [ ] Add empty state when no users
- [ ] Add error state on query failure
- [ ] Block non-admin access with redirect/message

**UI Library**: HeroUI v3+ (Table, Input, Button, Dropdown, Pagination, Skeleton)

**Acceptance Criteria**:
- ✅ Page loads and displays user list
- ✅ Access control redirects non-admins
- ✅ Sort and search inputs are responsive
- ✅ Pagination works correctly
- ✅ Handles loading and error states gracefully

**Blockers**: Depends on Tasks G6-005, G6-010

---

### Task G6-011: Create User Removal Modal & Flow
**Priority**: P1  
**Estimate**: 3 hours  
**Owner**: Frontend Lead

**Description**: Build removal confirmation modal and integrate remove action.

**Components**:
- [ ] Create `RemoveUserModal` component: displays user name, lists consequences (stores, keys count), "Cancel" & "Confirm" buttons
- [ ] Add "Remove" action button on each user row
- [ ] On click, open modal with user context
- [ ] On confirm, call `removeUserFromOrg` server action
- [ ] Show loading state during removal
- [ ] On success, remove user from table and show toast notification
- [ ] On error, show error toast with retry option
- [ ] Disable "Remove" for non-removable users (self, last admin)

**Acceptance Criteria**:
- ✅ Modal appears with correct user details
- ✅ Confirm button triggers server action
- ✅ User removed from list on success
- ✅ Error handling and retry available
- ✅ "Remove" button disabled for self/last admin

**Blockers**: Depends on Tasks G6-010, G6-006

---

### Task G6-012: Create Org Switcher Component
**Priority**: P2  
**Estimate**: 2 hours  
**Owner**: Frontend Lead

**Description**: Build organization switcher dropdown/menu.

**Components**:
- [ ] Create `OrgSwitcher` component (dropdown or sidebar nested menu)
- [ ] Display all user's orgs from `getUserOrgList` query
- [ ] Show current org highlighted
- [ ] On org select, call `switchUserOrg` and redirect to new org's dashboard
- [ ] Show loading state during switch
- [ ] Handle error if user was removed from org mid-switch

**UI Library**: HeroUI Dropdown or Navbar integration

**Acceptance Criteria**:
- ✅ All user's orgs displayed in switcher
- ✅ Current org highlighted
- ✅ Switching updates app state and redirects
- ✅ Removed users handled gracefully

**Blockers**: Depends on Tasks G6-008

---

### Task G6-013: Create Audit Log Viewer Component
**Priority**: P3  
**Estimate**: 3 hours  
**Owner**: Frontend Lead

**Description**: Build audit log page with filter and export features.

**File**: `src/app/(platform)/(org)/settings/audit-log/page.tsx`

**Components**:
- [ ] Create `AuditLogPage` with table of audit entries
- [ ] Add filters: event type, actor, affected user, date range
- [ ] Add pagination (50 items per page)
- [ ] Add "Export as CSV" button
- [ ] Show event description in human-readable form
- [ ] Link to user profiles if applicable
- [ ] Admin-only access

**Acceptance Criteria**:
- ✅ Audit entries displayed with full details
- ✅ Filters work correctly
- ✅ CSV export downloads successfully
- ✅ Admin access only

**Blockers**: Depends on Tasks G6-009

---

## Phase 4: Cloud Functions & Scheduled Tasks (Sprint 2-3)

### Task G6-014: Implement Deletion Task Cloud Function
**Priority**: P1  
**Estimate**: 6 hours  
**Owner**: Backend Lead

**Description**: Create scheduled Cloud Function to hard-delete user data after grace period.

**File**: `functions/src/workflows/retry-org-user-deletion.ts`

**Implementation**:
- [ ] Create scheduled function triggered twice daily (configurable schedule, e.g., 2 AM + 2 PM UTC)
- [ ] Query `deletionTasks` where status=pending and scheduledDeleteAt <= now()
- [ ] For each task:
  - [ ] Update task status to in_progress
  - [ ] Hard-delete Firestore documents: stores, documents, API keys, context records
  - [ ] Hard-delete Cloud Storage files under `orgs/{orgId}/` for the user
  - [ ] Delete Gemini File Search indexes for user's files
  - [ ] Update task status to completed, set completedAt, log deletedEntityCount
- [ ] On error, increment retryCount, retry up to maxRetries with exponential backoff
- [ ] On all retries exhausted, set status to failed, log error message
- [ ] Write error logs for failed tasks (surface to admins via dashboard)

**Logging**: Use OpenTelemetry SDK for structured logging (per spec and existing patterns)

**Acceptance Criteria**:
- ✅ Function runs on schedule
- ✅ Pending tasks with expired date are hard-deleted
- ✅ All child documents and Cloud Storage files removed
- ✅ Retry logic works and logs failures
- ✅ Task records updated with completion status

**Blockers**: Depends on Tasks G6-001, G6-002, G6-006

---

### Task G6-015: Implement Session Invalidation on User Removal
**Priority**: P1  
**Estimate**: 4 hours  
**Owner**: Backend Lead

**Description**: Invalidate removed user's sessions for that org.

**Implementation**:
- [ ] Create token revocation mechanism: store revoked session tokens in Firestore `sessionRevocations/{sessionId}` or in-memory cache
- [ ] On user removal, create revocation entries for all active sessions of that user in that org
- [ ] Add middleware in Next.js to check session against revocation list
- [ ] If session is revoked, respond with 401 Unauthorized and redirect to login
- [ ] Use TTL on revocation records (auto-expire after 24 hours to avoid unbounded growth)

**Alternative Approaches**:
- Use Firebase custom claims to track session validity
- Use Redis for faster revocation lookup

**Acceptance Criteria**:
- ✅ Removed user cannot make API requests to removed org
- ✅ User redirected to login on revoked session
- ✅ Revocation records expire after TTL

**Blockers**: Depends on Tasks G6-006

---

### Task G6-016: Implement Offboarding & Notification Emails
**Priority**: P2  
**Estimate**: 3 hours  
**Owner**: Backend Lead

**Description**: Create email templates and send offboarding/role-change notifications.

**Emails**:
- [ ] Offboarding email template: org name, removal reason, recovery info
- [ ] Promotion email template: org name, new role, link to dashboard
- [ ] Demotion email template: org name, new role, link to dashboard
- [ ] Implement `sendOffboardingEmail(userId, orgId, reason?)`
- [ ] Implement `sendPromotionEmail(userId, orgId, newRole)`
- [ ] Implement `sendDemotionEmail(userId, orgId)`
- [ ] Queue emails asynchronously (non-blocking)
- [ ] Implement retry if email delivery fails (up to 3 retries)

**Email Service**: Use Firebase Cloud Functions + SendGrid/SendInBlue/similar

**Acceptance Criteria**:
- ✅ Emails sent on removal, promotion, demotion
- ✅ Email templates are personalized
- ✅ Delivery failures don't block main actions
- ✅ Retry mechanism works

**Blockers**: Depends on Tasks G6-006, G6-007

---

## Phase 5: Testing & QA (Sprint 3)

### Task G6-017: Write Integration Tests for User Management
**Priority**: P1  
**Estimate**: 5 hours  
**Owner**: QA / Backend Lead

**Description**: Create comprehensive integration tests for user management workflows.

**Test Coverage**:
- [ ] Test viewing user list (admin vs non-admin)
- [ ] Test removing user and verifying cascade deletions
- [ ] Test removing last admin (should fail)
- [ ] Test promoting/demoting users
- [ ] Test org switching
- [ ] Test audit log queries
- [ ] Test deletion task scheduling and execution
- [ ] Test session invalidation
- [ ] Test email notifications

**Test Framework**: Jest + Firestore emulator

**Acceptance Criteria**:
- ✅ All critical user stories covered by tests
- ✅ 80%+ code coverage for new modules
- ✅ All tests pass

**Blockers**: Depends on all Phase 2-4 tasks

---

### Task G6-018: Performance & Load Testing
**Priority**: P2  
**Estimate**: 3 hours  
**Owner**: Backend Lead

**Description**: Verify user listing and deletion operations meet performance requirements.

**Tests**:
- [ ] User list query with 10k members: should complete < 500 ms
- [ ] User removal with 2k-item cascade delete: should complete < 2 s
- [ ] Deletion task job processing 100+ tasks: should complete in reasonable time
- [ ] Concurrent user list requests: should handle 10+ concurrent without throttling

**Tools**: Artillery, K6, or similar

**Acceptance Criteria**:
- ✅ All NFR-001 to NFR-006 criteria met
- ✅ Load test results documented

**Blockers**: Depends on Tasks G6-005, G6-006, G6-014

---

## Phase 6: Documentation & Maintenance (Sprint 3)

### Task G6-019: Create API Documentation
**Priority**: P2  
**Estimate**: 2 hours  
**Owner**: Backend Lead / Tech Lead

**Description**: Document all server actions and API endpoints.

**Deliverables**:
- [ ] OpenAPI/REST spec for all user management endpoints (if exposing REST)
- [ ] JSDoc comments on all server actions
- [ ] README for user management module (setup, usage examples)
- [ ] Troubleshooting guide for common issues (e.g., user cannot be removed)

**Acceptance Criteria**:
- ✅ API fully documented with request/response examples
- ✅ Setup instructions clear and complete

**Blockers**: None (documentation can happen in parallel)

---

### Task G6-020: Create Operations Runbooks
**Priority**: P2  
**Estimate**: 2 hours  
**Owner**: Backend Lead / DevOps / SRE

**Description**: Document operational procedures for ongoing maintenance.

**Runbooks**:
- [ ] Troubleshooting user removal failures
- [ ] Recovering soft-deleted user data before grace period expires
- [ ] Manually triggering deletion tasks
- [ ] Auditing user management actions in Firestore
- [ ] Scaling user list queries for large orgs (10k+ members)

**Acceptance Criteria**:
- ✅ Runbooks cover common operational scenarios
- ✅ Clear enough for on-call engineer to follow

**Blockers**: None

---

## Sprint-to-Phase Mapping

| Sprint | Phase | Tasks |
| ------ | ----- | ----- |
| Sprint 1 | Foundation | G6-001, G6-002, G6-003, G6-004 |
| Sprint 1-2 | Core API | G6-005, G6-006, G6-007, G6-008, G6-009 |
| Sprint 2 | UI Components | G6-010, G6-011, G6-012, G6-013 |
| Sprint 2-3 | Cloud Functions | G6-014, G6-015, G6-016 |
| Sprint 3 | Testing | G6-017, G6-018 |
| Sprint 3 | Documentation | G6-019, G6-020 |

---

## Dependencies & Critical Path

**Critical Path** (longest dependency chain):
1. G6-001 (Firestore setup) → G6-005 (User listing) → G6-010 (UI page) → G6-011 (Remove modal)
2. G6-006 (Remove action) → G6-014 (Deletion job) → G6-017 (Integration tests)

**Recommended Parallelization**:
- G6-002 (Models) can proceed independently from G6-001
- G6-010 (UI page) can be stubbed while G6-005 (data fetch) is being built
- G6-016 (Email notifications) can proceed in parallel with G6-006 (remove action)

---

## Rollout & Feature Flags

- **Initial Rollout**: Deploy to 10% of orgs (feature flag `user_management_beta`)
- **Monitoring**: Track user removal success rate, deletion job completion rate, error logs
- **Gradual Increase**: 50% after 1 week, 100% after 2 weeks
- **Rollback Plan**: Feature flag to disable user removal; leave data in soft-delete state (no data loss)

---

## Acceptance Criteria by User Story

### ✅ User Story 1: View Organization Users
- [x] User list page displays all members with name, email, role, join date, last active
- [x] List is paginated (25 per page)
- [x] List is sortable by name, email, role, join date
- [x] List is searchable by email (prefix match)
- [x] Admin sees "(You)" badge for their own profile
- [x] Non-admin access is blocked
- [x] Current org context is maintained (cannot see other org members)

### ✅ User Story 2: Remove User from Organization
- [x] Remove action initiated via modal confirmation
- [x] Modal lists consequences (count of stores, API keys)
- [x] User removed from list immediately after confirmation
- [x] Removed user cannot re-access org resources (403 Forbidden)
- [x] All org-scoped data marked for deletion
- [x] Deletion task created with 30-day grace period
- [x] Removed user retains global profile and can join other orgs
- [x] Self-removal blocked; last-admin removal blocked
- [x] Sessions invalidated within 5 minutes
- [x] Audit log entry created

### ✅ User Story 3: Switch Between Multiple Organizations
- [x] User belongs to multiple orgs simultaneously
- [x] Org switcher displays all user's orgs
- [x] User can select new org and app context switches
- [x] Dashboard shows selected org's data
- [x] User's primary org remembered on next login
- [x] Removed users automatically redirected from removed org

### ✅ User Story 4: Manage Member Permissions
- [x] Admin can promote member to admin
- [x] Admin can demote admin to member
- [x] Last admin cannot be demoted
- [x] Role changes trigger email notifications
- [x] Promotion/demotion audited

### ✅ User Story 5: Audit Log
- [x] Admin views immutable audit log of all user management events
- [x] Audit log filterable by event type, actor, user, date range
- [x] Audit log exportable as CSV
- [x] Audit log entries never deleted (archived after 1 year)
