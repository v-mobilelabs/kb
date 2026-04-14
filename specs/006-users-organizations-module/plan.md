# Feature Plan: User & Organization Management Module

**Module ID**: `006-users-organizations-module`  
**Feature Branch**: `006-users-organizations-module`  
**Created**: 2026-04-14  
**Status**: Ready for Implementation Sprint Planning  
**Owner**: [Team Name]

---

## Overview

This module enables organization administrators to manage user membership across their organization(s), with support for multi-organization membership, graceful offboarding, and compliance-friendly audit trails. It extends the existing authentication and organization infrastructure from modules `001-auth-onboarding-platform` and `002-store-module`.

### Key Capabilities

1. **User Visibility**: Admins view a searchable, sortable, paginated list of all members in their organization.
2. **User Removal**: Admins can remove members from an org (not global deletion), triggering cascade deletions of org-scoped data with a configurable grace period for recovery.
3. **Multi-Org Support**: Users can belong to multiple organizations simultaneously and switch between org contexts.
4. **Role Management**: Admins can promote/demote members to/from admin status with audit trails.
5. **Audit & Compliance**: All user management actions are logged immutably; logs never deleted (archived after 1 year).
6. **Scheduled Cleanup**: A background job hard-deletes soft-deleted user data after the grace period.

---

## Problem Statement

Without user management, organization admins have no visibility into org membership and cannot offboard departed users. This creates security risks (departed users retain access) and operational friction (no control over membership). Additionally, global user deletion is too coarse-grained for multi-tenant scenarios.

---

## Solution Summary

The module introduces a new `orgMemberships` subcollection linking users to orgs with role and deletion metadata. Removal is soft-delete-first (immediate safety) with hard-delete-later (grace period for recovery). A scheduled Cloud Function processes deletion tasks daily. The design balances between:

- **Immediate Removal**: Removed user loses access immediately (soft delete in membership + revoke API keys)
- **Data Recovery**: Owner has 30-day window to reinstate user and recover data
- **Compliance**: Audit trails and deletion task history retained indefinitely

---

## Personas & Use Cases

### Admin Persona: Sarah (Org Manager)

**Use Case 1: Onboard New Team Member**
- A new engineer joins Sarah's team
- Sarah wants to add them to the org (out of scope for this spec; assumed via invite flow)
- Sarah monitors the user list and sees new member's name, email, join date

**Use Case 2: Remove Departed Team Member**
- A contractor's engagement ends
- Sarah navigates to User Management, searches for contractor's email, clicks "Remove"
- Confirmation modal lists what will be deleted (5 stores, 2 API keys)
- Sarah confirms removal
- Contractor is immediately inaccessible to the org
- After 30 days, their data is permanently deleted (unless Sarah re-adds them)

**Use Case 3: Promote to Admin**
- Sarah wants to delegate user management to a senior engineer
- Sarah opens User Management, finds engineer's name, clicks "Make Admin"
- Engineer receives promotion email and can now manage org users

### User Persona: Alex (Multi-Org Member)

**Use Case 4: Work Across Multiple Orgs**
- Alex is a consultant working with 3 client organizations
- Alex logs in to their primary org (set during onboarding)
- Alex clicks the org switcher, selects a different client org
- Dashboard instantly switches to that org; all data is client-specific
- Alex's work in one org doesn't mix with others

### User Persona: Chris (Removed User)

**Use Case 5: Accidentally Removed**
- Chris was removed from the org due to an admin error
- Chris tries to log in; receives "Access Denied" message
- Chris contacts Sarah
- Sarah navigates to removal audit log, confirms removal, and clicks "Restore User"
- Chris's stores and API keys are unmarked for deletion
- Chris is immediately able to access the org again

---

## Success Metrics

| Metric | Target | Notes |
| ------ | ------ | ----- |
| User list query performance | < 500 ms for 10k members | Firestore query efficiency |
| User removal action latency | < 2 s | Firestore batch + API key revocation |
| Session invalidation time | < 5 min | Eventually consistent via token revocation |
| Deletion job completion time | < 24 h | Background job processing capacity |
| Audit log query latency | < 1 s | For compliance queries and exports |
| Admin adoption rate | > 80% of orgs use user management | Adoption KPI after launch |
| Accidental removal incidents | < 1% of removals | Confirmation modal effectiveness |
| Data recovery success rate | > 95% | Grace period recovery during test phase |

---

## Key Design Decisions

### 1. Soft-Delete Followed by Hard-Delete (Grace Period)

**Decision**: Two-phase deletion with 30-day grace period.

**Rationale**:
- Balances security (removed users lose access immediately) with safety (data recoverable if accidental)
- Reduces production incident severity (customer support can recover data within grace period)
- Compliance-friendly (audit trail preserved)

**Alternative Considered**: Immediate hard deletion (risky; no recovery) or indefinite soft delete (leads to orphaned data bloat)

### 2. Soft Delete in Membership, Cascade Delete in Data

**Decision**: Set `deletedAt` on membership immediately; schedule hard deletion of stores, keys, files separately.

**Rationale**:
- Membership is metadata; hard-delete-ability is less critical
- Stores and files are large and may take time to delete; decoupling reduces latency of removal action
- If hard deletion job fails, membership is still deleted (user still cannot access); data cleanup can be retried

### 3. Multi-Org via Separate Memberships Subcollection

**Decision**: Store all org-user relationships in `organizations/{orgId}/memberships/{userId}` subcollection, not in user profile.

**Rationale**:
- Avoids denormalization (storing list of org IDs in user profile)
- Enables efficient org-scoped queries and security rules
- Scales to users with 100+ orgs (flat org lookup vs array iteration)

### 4. Denormalized Counts in Organization

**Decision**: Maintain `memberCount`, `adminCount` in organization document (updated on membership changes).

**Rationale**:
- Firestore lacks efficient COUNT aggregation; denormalization avoids expensive queries
- Enables fast KPI tiles on dashboard ("5 active admins in this org")

### 5. Audit Log Never Hard-Deleted

**Decision**: Audit log entries kept indefinitely; archival (move to cold storage) possible after 1 year but deletion prohibited.

**Rationale**:
- Compliance requirement (SOC 2, GDPR, financial regulations require audit trail retention)
- Investigation and forensics (support/security can review historical actions)
- Minimal storage cost (audit entries are small documents)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up Firestore collections, indexes, security rules
- Create TypeScript models and Zod schemas
- Backfill existing membership data

### Phase 2: Core API (Week 1-2)
- Implement server actions for listing, removing, promoting/demoting users
- Implement org switching and audit log queries
- Add session invalidation on user removal

### Phase 3: UI Components (Week 2)
- Build User Management page with table, filters, pagination
- Create Remove User modal and integrate flows
- Build org switcher and role management UI

### Phase 4: Background Jobs (Week 2-3)
- Implement scheduled deletion task Cloud Function
- Add email notifications (offboarding, promotion, demotion)
- Add session invalidation broadcast

### Phase 5: Testing & QA (Week 3)
- Write integration tests for all workflows
- Perform load testing (10k member orgs, concurrent requests)
- Document operations runbooks

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
| ---- | ------ | ---------- | ---------- |
| Accidental mass removal of users | High (data loss, support burden) | Low | Confirmation modal, audit log review, grace period recovery |
| Deletion job failures leading to orphaned data | Medium (inconsistent state) | Medium | Retry logic, error logging, admin dashboard alerts |
| Performance degradation with large member counts (10k+) | High (poor UX for admins) | Medium | Firestore composite indexes, cursor-based pagination, load testing |
| Session invalidation delay causing security issues | High (removed user retains API access) | Low | Multiple invalidation mechanisms (token blacklist + session revocation), short TTL |
| Audit log size growing unbounded | Medium (storage cost) | Low | Archive to cold storage after 1 year, document retention policies |
| Email delivery failures breaking workflows | Low (non-blocking) | Medium | Async queue, retry logic, manual dashboard for retry/investigation |

---

## Dependencies & Prerequisites

### External Dependencies
- **Firebase Admin SDK v12+**: For Firestore, Cloud Storage, Cloud Functions operations
- **Cloud Functions v2 (Node.js 22)**: For scheduled deletion jobs and email service
- **LangGraph.js**: For orchestrating multi-step deletion workflows (if using LangGraph for cleanup orchestration)
- **Email Service**: SendGrid, SendInBlue, or Firebase Cloud Messaging for email notifications
- **Session Management**: Existing session store (Redis, Firestore) or token blacklist mechanism

### Internal Dependencies
- **Module 001: Auth & Onboarding** (completed): Provides user authentication, session management, and organization baseline
- **Module 002: Store** (completed): Provides store schema; removal cascade deletes stores

### Known Implementation Gaps
- **Bulk User Operations**: Bulk remove, bulk promote are out of scope for v1 (implement in v1.1 if needed)
- **User Invitation**: Users currently added by admins or assumed to join via magic link + org code; formal invite system is separate feature
- **Fine-Grained RBAC**: Only `admin` and `member` roles in v1; more granular roles (billing admin, read-only) deferred

---

## Assumptions

1. Existing auth system and session management from `001-auth-onboarding-platform` is stable and available
2. Firestore Admin SDK is configured with sufficient permissions for all operations
3. Cloud Functions can trigger background jobs via Cloud Scheduler
4. Email service is available; failures are non-blocking (eventual retry)
5. Organization structure and stores from `002-store-module` are unchanged
6. No real-time user presence needed for v1 (manual page refresh sufficient)
7. User's primary org is sticky (not auto-updated on last-added org); explicit user action required

---

## Success Criteria (Go/No-Go)

### Functional
- ✅ Org admins can view complete member list with filters/sort/search
- ✅ User removal succeeds and removed user loses access within 5 minutes
- ✅ Cascade deletion of org-scoped data confirmed in Firestore
- ✅ Users can join multiple orgs and switch between them
- ✅ Audit log captures all user management events; queryable and exportable

### Non-Functional
- ✅ User list query: < 500 ms for 10k members
- ✅ User removal action: < 2 s (confirmed with load test)
- ✅ Deletion job: processes 100+ tasks within 24 h
- ✅ Audit log query: < 1 s (confirmed with query analysis)

### Operational
- ✅ Documentation complete (API docs, runbooks)
- ✅ Integration tests: 80%+ coverage, all passing
- ✅ Feature flag rollout: deploy to 10% → 50% → 100% over 2 weeks
- ✅ No P1 production incidents in first 2 weeks

---

## Rollout Strategy

**Week 1: Internal Testing**
- Deploy to staging Firebase project
- Smoke test all workflows with test users
- Load test user list with 10k synthetic members

**Week 2: Beta Rollout (10% of orgs)**
- Deploy to production with feature flag `user_management_beta`
- Target early adopters (friendly customers)
- Monitor for errors, performance issues

**Week 3: Gradual Rollout (50% → 100%)**
- Increase flag percentage based on error rates and user feedback
- Disable flag if critical issues found (rollback plan)
- Document any edge cases discovered

**Week 4+: Full Launch & Iteration**
- Feature flag removed after 2 weeks at 100%
- Gather user feedback for future enhancements (bulk operations, more granular roles)

---

## Future Enhancements (v1.1+)

- **Bulk User Operations**: Remove, promote, demote multiple users at once
- **User Invitation System**: Send formal invites with customizable expiry and welcome emails
- **Fine-Grained RBAC**: Billing admin, read-only member, store managers, etc.
- **Real-Time User Presence**: Display online/offline status and last-active timestamp in real-time
- **SSO & Directory Sync**: SAML/OIDC integration, automatic syncing from LDAP/Microsoft Graph
- **User Groups & Teams**: Organize members into teams with shared permissions
- **Membership Approval Workflow**: New members require admin approval before full access
- **Automatic Offboarding**: Revoke access based on identity/calendar (e.g., disable on last day of contract)

---

## Resources & Links

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Node.js 22 Runtime](https://cloud.google.com/functions/docs/runtime/nodejs-22-runtime)
- [Cloud Scheduler](https://cloud.google.com/scheduler)
- [HeroUI Table Component](https://www.heroui.com/components/table)

---

## Glossary

- **Org**: Organization; top-level container for users, stores, and API keys
- **Membership**: Relational record linking a user to an org with a role (admin/member)
- **Soft Delete**: Setting a `deletedAt` timestamp without removing the record; allows recovery
- **Hard Delete**: Permanently removing records from Firestore and Cloud Storage
- **Grace Period**: Time window (default 30 days) between soft delete and hard delete; allows recovery
- **Cascade Delete**: Deleting child records when parent is deleted (e.g., stores when user removed)
- **Audit Log**: Immutable append-only log of all user management events
- **Session Invalidation**: Revoking active sessions to prevent further API access
- **RBAC**: Role-Based Access Control; restricts operations based on user role
