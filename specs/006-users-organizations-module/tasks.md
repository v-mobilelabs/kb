# Implementation Tasks: User & Organization Management Module (006)

**Feature Branch**: `006-users-organizations-module`  
**Generated**: 2026-04-14  
**Total Tasks**: 35  
**Estimated Duration**: 4-5 weeks  
**Status**: Ready for Sprint Planning  

---

## Task Organization

Tasks are organized by implementation phase. Each task includes:
- **Task ID** (T001-T035): Sequential identifier
- **[P] marker**: Indicates parallelizable tasks (can run in parallel with no dependency)
- **[Story] label**: Mapped to user story (US1-US5) for story-level tasks only
- **File path**: Exact location for deliverables
- **Acceptance criteria**: Clear definition of done

---

## Phase 0: Setup & Prerequisites (Non-Blocking, 1-2 Days)

**Goal**: Validate prerequisites, set up development environment, and plan dependencies.

- [ ] T001 Create feature branch and initial directory structure for module 006
- [ ] T002 [P] Verify Firebase project credentials, Firestore write access, and RTDB enabled
- [ ] T003 [P] Review spec.md and data-model.md; clarify any ambiguities with product team
- [ ] T004 [P] Create development checklist: dependencies, build system, testing setup verification

---

## Phase 1: Firestore Data Model & Schema Setup (3-4 Days)

**Goal**: Set up all Firestore collections, indexes, TypeScript models, and security rules. This is foundational for all subsequent phases.

**Acceptance Criteria**:
- All 12 composite Firestore indexes are active and queryable
- TypeScript domain models compile without errors
- Zod schemas validate all API inputs
- Security rules enforce role-based access
- Backfill script converts existing org data to new schema

### Phase 1 Tasks

- [ ] T005 Create Firestore collections in Firebase Console: `organizations/{orgId}/memberships/`, `deletionTasks/`, `organizations/{orgId}/audits/`, `organizations/{orgId}/roles/`, `organizations/{orgId}/policies/` with initial documents in `src/data/organizations/firestore/schema.ts`

- [ ] T006 [P] Create 12 composite Firestore indexes in `/firestore.indexes.json` and deploy via Firebase CLI; verify all indexes reach "Active" status

- [ ] T007 [P] Define TypeScript domain models in `src/data/organizations/models/`: `org-membership.model.ts`, `deletion-task.model.ts`, `org-role.model.ts`, `org-policy.model.ts`, `org-audit-entry.model.ts`

- [ ] T008 [P] Update Firestore security rules in `firestore.rules`: add read access for memberships (org members only), audit log read for org admins with `audit:read` permission, write access for Cloud Functions only (authenticated)

---

## Phase 2: Use Cases, Validation & Data Access Layer (4-5 Days)

**Goal**: Build the service/use case layer with complete Zod validation, Firestore queries, and business logic. All mutations must emit audit events.

**Acceptance Criteria**:
- All 30+ use cases implemented with Zod input validation
- Every use case has unit tests (> 90% coverage)
- All mutations emit immutable audit log entries
- Query performance acceptable (< 500 ms for 10k member list)
- Complete type safety across data access layer

### Phase 2 Tasks

- [ ] T009 [P] Implement Zod validation schema library in `src/data/organizations/schemas/`: common types (`UserId`, `OrgId`, `Email`, `BaseRole`, `Pagination`), user management schemas (`GetOrgUserListInput`, `RemoveUserFromOrgInput`, `PromoteUserToAdminInput`), audit schemas

- [ ] T010 [P] Implement Firestore data access layer in `src/data/organizations/firestore/`: query helpers (`getUserOrgMemberships`, `getOrgUserList`, `getOrgAuditLog`, `getMembershipById`), mutation helpers (`updateMembership`, `createDeletionTask`, `revokeMemberApiKeys`)

- [ ] T011 [P] Implement all 30+ use cases (service layer) in `src/data/organizations/services/`: `getUserOrgList`, `getOrgUserList`, `removeUserFromOrg`, `getOrgAuditLog`, `promoteMemberToAdmin`, `demoteMemberFromAdmin`, `getOrgRoles`, `createCustomRole`, `updateOrgPolicy`, etc. Each must validate input (Zod), check auth, execute transaction, emit audit event, handle errors

- [ ] T012 [P] Implement server actions wrapping use cases in `src/actions/user-management-actions.ts`: `listOrgUsers`, `removeOrgUser`, `promoteOrgUser`, `demoteOrgUser`, `listOrgAudit`, etc.; each exports type-safe Next.js server function

---

## Phase 3: RTDB Sync & Fast Path Caching (2-3 Days)

**Goal**: Set up Realtime Database cache for sub-10ms permission checks and sync from Firestore mutations.

**Acceptance Criteria**:
- RTDB structure mirrors Firestore with all role/permission data
- Permission evaluation < 50 ms from RTDB
- RTDB sync transactional with Firestore writes
- Fallback to Firestore on RTDB miss

### Phase 3 Tasks

- [ ] T013 Create RTDB structure and initial sync logic in `src/lib/firebase/rtdb-sync.ts`: sync roles (`/orgs/{orgId}/roles/`), policies (`/orgs/{orgId}/policies/`), member permissions (`/orgs/{orgId}/memberPermissions/{userId}`); handle full resyncs and incremental updates

- [ ] T014 [P] Implement permission evaluation service in `src/lib/permissions/evaluate-permissions.ts`: check RTDB first (< 50ms), fall back to Firestore for miss, aggregate permissions from roles + ABAC policies, cache result for 60 seconds

- [ ] T015 [P] Integrate RTDB sync into all use cases that mutate roles/policies/memberships: on success, trigger RTDB update as final step; on failure, rollback; test eventual consistency

---

## Phase 4: Scheduled Deletion & Cleanup (2-3 Days)

**Goal**: Implement hard-delete scheduler and recovery/cancellation logic for soft-deleted data within grace period.

**Acceptance Criteria**:
- Scheduled Cloud Function runs twice daily
- Hard-deletion completes within 24 hours of grace period expiration
- Failed deletions retry up to 3 times with exponential backoff
- Recovery (re-addition) cancels pending deletion task
- Audit trail preserved indefinitely

### Phase 4 Tasks

- [ ] T016 Implement scheduled deletion Cloud Function in `functions/src/workflows/hard-delete-org-user-data.ts`: run twice daily, fetch all `deletionTasks` with `status=pending` and `scheduledDeleteAt <= now()`, hard-delete Firestore documents (stores, API keys, custom data), delete Cloud Storage files, revoke Gemini File Search indexes

- [ ] T017 [P] Implement hard-delete helper functions in `functions/src/lib/deletion-helpers.ts`: `deleteFirestoreSubtree`, `deleteCloudStorageFolder`, `deleteGeminiFileSearchIndex`, `revokeApiKeys`; include error handling and retry logic

- [ ] T018 [P] Implement recovery & cancellation logic in `src/data/organizations/services/`: when user is re-added during grace period, cancel deletion task (set `status=cancelled`, clear `scheduledDeleteAt`), restore `deletedAt=null` on soft-deleted records, emit `MEMBERSHIP_RESTORED` audit event

- [ ] T019 [P] Configure Cloud Scheduler in `firebase.json` and deploy: schedule `retryOrgUserDeletion` function to run at 02:00 UTC and 14:00 UTC daily; set up error notifications to admin dashboard

---

## Phase 5: Frontend UI & User Management Page (5-6 Days)

**Goal**: Build User Management page with member listing, removal modal, role actions, org switcher, and audit log viewer.

**Acceptance Criteria**:
- User list displays paginated (25 items/page), sortable (name/email/role/joinDate), searchable (email prefix)
- Removal confirmation modal shows data consequences and requires multi-step confirmation
- Promote/demote actions with confirmation, role badges updated in real-time
- Org switcher dropdown shows all user's orgs; selecting org switches context
- Audit log displays all org events, filterable by type/actor/user, paginated
- All interactions have error handling and user feedback (toast messages)

### Phase 5 Tasks

- [ ] T020 [US1] Create user table component in `src/app/(platform)/members/_components/members-table.tsx`: display list of org members with columns (Name, Email, Role, Join Date, Last Active, Actions), implement sorting/pagination, add virtual scroll for performance

- [ ] T021 [US1] [P] Add search & filter UI in `src/app/(platform)/members/_components/members-filters.tsx`: email search box, role filter dropdown, active/deleted toggle; integrate with TanStack Query

- [ ] T022 [US2] Create remove user modal in `src/app/(platform)/members/_components/remove-user-modal.tsx`: show affected data count (stores, API keys), require two-step confirmation ("Enter member email to confirm"), call `removeOrgUser` server action on submit, show success toast + redirect to members list

- [ ] T023 [US4] Add promote/demote actions in `src/app/(platform)/members/_components/member-row-actions.tsx`: "Make Admin" and "Demote to Member" buttons, confirmation dialogs, error handling; trigger `promoteOrgUser` / `demoteOrgUser` server actions

- [ ] T024 [US3] Create org switcher component in `src/app/(platform)/layout/_components/org-switcher.tsx`: dropdown showing all user's orgs, selected org highlighted, clicking org calls `switchUserOrg` and updates URL to `/orgs/{newOrgId}/...`

- [ ] T025 [US5] Build audit log viewer in `src/app/(platform)/members/_components/audit-log-viewer.tsx`: paginated table of org audit events (EVENT, ACTOR, AFFECTED USER, TIMESTAMP), filter by event type / actor ID / user ID / date range, show event details on row click

- [ ] T026 [P] Add error handling & edge cases in `src/app/(platform)/members/`: handle empty org, user pagination edge case (last page with deleted user), permission denied (redirect if non-admin), network errors, show user-friendly error messages

---

## Phase 6: Testing, Monitoring, Compliance & Launch (3-4 Days)

**Goal**: Comprehensive testing (unit, integration, E2E), monitoring setup, compliance verification, and production launch.

**Acceptance Criteria**:
- > 90% code coverage for all use cases, validators, and helpers
- E2E tests for removal flow + recovery scenario pass
- Audit log compliance verified (immutability, retention)
- Performance benchmarks met (queries < 500ms, removals < 2s, permission checks < 50ms)
- Monitoring & alerting configured for production
- Rollback procedure documented and tested

### Phase 6 Tasks

- [ ] T027 Write unit tests for Zod validators in `src/data/organizations/__tests__/schemas.test.ts`: test all schemas with valid/invalid inputs, edge cases (empty strings, special chars, boundary values)

- [ ] T028 [P] Write integration tests for use cases in `src/data/organizations/__tests__/use-cases.integration.test.ts`: test `removeUserFromOrg` flow (remove member, verify deletion task created, verify audit log entry), test recovery (re-add user within grace period, verify deletion task cancelled), test promotion/demotion, test permission checks

- [ ] T029 [P] Write E2E frontend tests in `cypress/e2e/members.cy.ts`: test user list display + sorting + search, test removal modal flow, test org switcher, test audit log filtering; use test fixtures for org/user setup

- [ ] T030 [P] Implement security & compliance tests in `src/data/organizations/__tests__/security.test.ts`: verify admins can't remove themselves, verify admins can't remove last admin, verify non-admin can't access User Management, verify session invalidation on removal, verify audit logs never deleted

- [ ] T031 [P] Set up performance benchmarks in `scripts/perf-benchmark.ts`: measure query time for lists (10k members), removal time (with cascades), permission evaluation time (RTDB vs Firestore); record baseline and alert on regression

- [ ] T032 [P] Configure monitoring & alerting in `functions/src/lib/monitoring.ts`: set up OpenTelemetry spans for all use cases, log audit events, track error rates (removal failures, hard-delete failures), send alerts to admin Slack channel on failures

- [ ] T033 [P] Document compliance & audit trail in `COMPLIANCE.md`: describe audit retention (indefinite), hard-delete policy (24h grace period), recovery window (30 days default, configurable), data residency, encryption at rest/transit

- [ ] T034 [P] Prepare rollback procedure in `ROLLBACK.md`: document steps to revert Firestore schema (restore from backup), downgrade RTDB, disable scheduled function, restore frontend from previous commit; test rollback on dev environment

- [ ] T035 Deploy to production: merge branch to `develop`, run full test suite, deploy Firestore indexes, deploy Cloud Functions, deploy frontend via Firebase Hosting, verify monitoring dashboards show healthy metrics, announce launch to team

---

## Phase Dependencies & Critical Path

```
Phase 0 (Setup)
    ↓
Phase 1 (Firestore Schema) — BLOCKING for all downstream phases
    ↓
├─→ Phase 2 (Use Cases) ← BLOCKING for Phase 5 (Frontend)
│   ↓
│   ├─→ Phase 3 (RTDB Sync)
│   ├─→ Phase 4 (Scheduled Deletion)
│   └─→ Phase 5 (Frontend) — depends on Phase 2
│
└─→ Phase 6 (Testing & Launch) — depends on all phases complete
```

## Parallelization Opportunities

**High-parallelization windows** (can run simultaneously):

1. **During Phase 1**: T006, T007, T008 can run in parallel once T005 is done (indexes, models, rules)
2. **During Phase 2**: T009, T010, T011, T012 can mostly run in parallel (schemas, DAL, use cases, server actions)
3. **During Phase 3**: T013, T014, T015 can run in parallel once RTDB structure is set
4. **During Phase 5**: T020, T021, T022, T023, T024, T025 can start once Phase 2 use cases are done; T026 integrates all
5. **During Phase 6**: T027-T034 can run in parallel; T035 is the final sequential step

**Recommended team struct**: 
- Backend engineers (4 days): Phase 1-4 tasks in parallel
- Frontend engineers (6 days): Phase 5 tasks in parallel  
- QA / DevOps (4 days): Phase 6 tasks in parallel (testing, monitoring, launch)

---

## Success Criteria Checklist

**Functional**:
- ✅ Org admins can view paginated, sortable, searchable member list
- ✅ Admins can remove members; soft-delete immediate, hard-delete after grace period
- ✅ Removed users cannot access org; their global profile persists
- ✅ Users can switch between multiple orgs via UI
- ✅ Admins can promote/demote members with audit trail
- ✅ Audit log shows all user management events; queryable and immutable

**Non-Functional**:
- ✅ List queries complete in < 500 ms for 10k members
- ✅ User removal completes in < 2 seconds
- ✅ Permission checks < 50 ms via RTDB cache
- ✅ Hard-delete completes within 24 hours of grace period expiration
- ✅ Audit logs queryable in < 1 second
- ✅ > 90% test coverage

**Compliance**:
- ✅ All mutations emit immutable audit events
- ✅ Audit logs never hard-deleted (indefinite retention)
- ✅ Grace period and recovery enabled (30 days default)
- ✅ Session invalidation on removal (< 5 min eventual consistency)
- ✅ RBAC enforced server-side (no false-positive blocking)

---

## Notes

- **Git commits**: Small, focused commits per task (1-2 commits per task ideally)
- **Code review**: PR required for all tasks before merging to develop
- **Testing**: Write tests as you go (TDD preferred for critical paths)
- **Documentation**: Update README.md, add code comments for complex logic, document RTDB sync strategy
- **Monitoring**: Enable OpenTelemetry spans on all use cases before production launch
- **Rollback**: Test rollback procedure on staging before production deployment
