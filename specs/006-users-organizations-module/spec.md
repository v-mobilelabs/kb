# Feature Specification: User & Organization Management Module

**Feature Branch**: `006-users-organizations-module`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Allow organization admins to view all users under an organization, remove users from orgs (not global deletion), and support multi-organization membership. When a user is removed from an org, their org data is scheduled for deletion."

---

## Clarifications

### Session 2026-04-14 (Pre-Spec Review)

- Q: Should a user who is removed from an organization have their global profile deleted? → A: No. User deletion from organization performs only org-specific offboarding. The user's global profile and ability to join other orgs remains intact.
- Q: What data should be deleted when a user is removed from an org? → A: Cascade delete all org-scoped data: stores, API keys, preferences, and any pending deletion tasks. However, audit log entries for that user in that org are retained for compliance.
- Q: What permission level is needed to perform user management operations? → A: Admin role (`admin`). Only organization admins can view user lists, send invitations, and remove users. Members cannot perform these actions.
- Q: How should user invitation work? → A: Invitation tokens are not explicitly implemented for this spec. Users join via organization codes or direct addition by admins. The invite flow is deferred to a subsequent feature.
- Q: What is the deletion scheduling mechanism? → A: Soft delete first (set `deletedAt` timestamp on user-org membership and org data). A scheduled Cloud Function (`retryOrgUserDeletion`) runs twice daily to hard-delete records older than the retention period (30 days by default, configurable per org).
- Q: Can a user belong to multiple organizations at once? → A: Yes. A user's `profiles/{userId}` maintains their primary `orgId` for dashboard navigation, but an `orgMemberships/{userId}/organizations/{orgId}` relational collection tracks all orgs they belong to.
- Q: How are organization admins designated? → A: The user who creates an organization is the initial admin. Admins can grant/revoke the admin role to/from any member. Role transitions are audited.
- Q: Should deleting a user automatically cascade-delete the organization if they are the sole owner? → A: No — the organization persists. If an external admin is available, they become the owner. If no admin remains, the organization becomes orphaned and requires manual intervention via a separate admin flow (out of scope for this spec).

### Session 2026-04-14 (Specification Clarification)

- Q: How should organizations customize the grace period for user deletion (1-365 days)? → A: **Per-org setting** in organization settings; applies to all removals in that org. No per-removal override. Default: 30 days.
- Q: When attempting to remove an organization's last admin, what should happen? → A: **Block removal**; show error "Cannot remove the last admin from the organization. Promote another member to admin first." Spec already reflects this correctly.
- Q: When a user is removed from an organization, which sessions should be invalidated? → A: **All global sessions** for that user (across all orgs and devices) are invalidated immediately. User must re-authenticate everywhere. This ensures removed users lose all access globally, not just in the removed org.
- Q: If a removed user is re-added to the same org within the grace period, should their deleted data be recovered? → A: **Always recover**; cancel the deletion task and restore access to stores, API keys, etc. This enables safe removal reversals. Spec already reflects this correctly.
- Q: Should the user list in User Management show real-time updates when other admins add/remove members? → A: **No real-time updates in v1**; user list refreshes only on manual page reload. Spec already explicitly states this. Defer real-time subscriptions to v2.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — View Organization Users (Priority: P1)

An organization admin navigates to the User Management section and sees a list of all members currently in their organization, including their name, email, role, join date, and last active timestamp. The list is paginated, sortable, and searchable. Admins understand who is part of their org and can take corrective action if needed.

**Why this priority**: User visibility is the foundation for all user management. Admins cannot make informed decisions without seeing the current membership.

**Independent Test**: Log in as an org admin. Navigate to User Management. Confirm a list of at least 2 members is displayed with correct names, emails, and roles. Verify pagination works, sorting by name/join date works, and email search filters the list correctly.

**Acceptance Scenarios**:

1. **Given** an admin user is on the User Management page, **When** the page loads, **Then** a list of all users belonging to their organization is displayed, paginated to 25 items per page.
2. **Given** a user list is displayed, **When** the user clicks a column header (Name, Email, Role, Join Date), **Then** the list re-sorts by that field (ascending/descending toggle on second click).
3. **Given** a user list is displayed, **When** the admin types in a search box, **Then** the list filters to show only users matching the search term (email prefix match; case-insensitive) in real-time or on Enter.
4. **Given** a user list is displayed on page 2, **When** the admin clicks to previous/next page, **Then** the pagination state updates and the next set of 25 items is loaded.
5. **Given** an organization has no users, **When** the User Management page loads, **Then** an empty state is shown with a message prompting the admin to invite members.
6. **Given** an admin views the user list, **When** the page loads, **Then** the admin's own user profile is included in the list (marked as "You" or visually distinct).
7. **Given** a non-admin user navigates to the User Management page, **When** the page loads, **Then** they are redirected to an access-denied page or see a message that this feature is restricted to admins only.

---

### User Story 2 — Remove User from Organization (Priority: P1)

An organization admin needs to offboard a member from their organization (e.g., due to a departed team member or role change). The admin selects a user in the user list and clicks a remove/deactivate button. A confirmation dialog appears listing what will be deleted (stores, API keys, etc.). After confirmation, the user is removed from the organization immediately and their org-scoped data is queued for permanent deletion after a 30-day retention window. The removed user receives a notification email (if the org has enabled notifications) and can no longer access org resources.

**Why this priority**: Removal is equally critical as visibility — admins must be able to control org membership and ensure offboarded users lose access to sensitive data. The delayed hard-delete balances data protection with recovery scenarios (accidental removal).

**Independent Test**: Log in as an admin. Navigate to User Management. Select a member (non-admin). Click Remove. Confirm the dialog. Verify the user disappears from the list. Confirm the user can no longer authenticate into that org (but their global profile remains). Verify a deletion task is created for hard-delete after 30 days.

**Acceptance Scenarios**:

1. **Given** an admin views the user list, **When** they click a "Remove" button on a non-admin user, **Then** a danger-intent modal appears ask for confirmation, listing what will be deleted (e.g., "2 stores, 1 API key, pending context data").
2. **Given** a removal confirmation modal is open, **When** the admin clicks "Cancel", **Then** the modal closes and no changes are made.
3. **Given** a removal confirmation modal is open, **When** the admin confirms removal, **Then** the user is immediately removed from the organization membership list.
4. **Given** a user is removed from an organization, **When** they attempt to authenticate and access resources in that org, **Then** they receive a 403 Forbidden error or are redirected to an access-denied page.
5. **Given** a user is removed from an organization, **When** the removal happens, **Then** all API keys for that user in that org are revoked (isRevoked=true, revokedAt timestamp set).
6. **Given** a user is removed from an organization, **When** the removal happens, **Then** all stores created by that user in that org are marked for deletion (soft delete with deletedAt timestamp set).
7. **Given** a 30-day grace period has passed since a user's removal, **When** the scheduled deletion job runs, **Then** all marked user data (stores, documents, files) is permanently deleted from Cloud Storage and Firestore.
8. **Given** a user is removed from an organization, **When** the removal happens and the org has notifications enabled, **Then** an offboarding email is sent to the removed user with information about the org, reason for removal (if provided), and recovery instructions (if a recovery window is in effect).
9. **Given** a user is an admin, **When** another admin clicks Remove on them, **Then** a confirmation warning appears stating "This user is an admin. Removing them will reduce admin capacity in the organization. Continue?".
10. **Given** a user is the last admin in an organization, **When** another admin attempts to remove them, **Then** the action is blocked and an error message appears: "Cannot remove the last admin from the organization. Promote another member to admin first."

---

### User Story 3 — Switch Between Multiple Organizations (Priority: P2)

A user who belongs to multiple organizations needs to switch context between orgs. They can see a list of their organizations in a dropdown or sidebar switcher, select a different org, and the dashboard and all app state switches to that organization's context. The user's primary organization (set in their profile) is remembered on next login.

**Why this priority**: Multi-org support requires switching UX to be seamless and intuitive. Without this, users in multiple orgs face friction every time they need to context-switch.

**Independent Test**: Create a test user and add them to 2+ organizations as a member. Log in and confirm they land on their primary org's dashboard. Click the org switcher, select a different org, and verify the dashboard updates to show that org's data (stores, keys, etc.). Log out and back in; confirm they land on their primary org again.

**Acceptance Scenarios**:

1. **Given** an authenticated user belongs to multiple organizations, **When** they view the app, **Then** an organization switcher (dropdown or sidebar menu) is visible and displays the list of all orgs they belong to.
2. **Given** the org switcher is open, **When** the user selects a different organization, **Then** the entire app context switches to that organization (dashboard data, store list, API keys, etc.) and the URL updates appropriately.
3. **Given** a user switches to a new organization, **When** the switch happens, **Then** the user's primary `orgId` in their profile is NOT automatically updated (it remains their original primary org).
4. **Given** a user settings/profile page is open, **When** they view their organization settings, **Then** they can set their preferred primary organization for next login.
5. **Given** a user has a primary organization set, **When** they log in, **Then** they land on the dashboard for their primary organization (not a random org).
6. **Given** a user belongs to multiple organizations, **When** they navigate to a specific org via URL or switcher, **Then** the org context is preserved within the app (back/forward navigation respects org state).
7. **Given** a user is removed from an organization they are currently viewing, **When** the removal is processed, **Then** they are automatically redirected to their primary organization's dashboard and shown a message: "You have been removed from [Org Name]."

---

### User Story 4 — Manage Organization Members (Admin Approval Workflow) (Priority: P3)

An admin user manages member permissions, roles, and approval workflows. An admin can elevate a member to admin status, demote an admin back to member, and see an audit trail of role changes. Promotion/demotion actions trigger audit log entries and (optionally) email notifications.

**Why this priority**: Role management is a secondary admin feature that becomes important once basic user visibility and removal are solid. It allows admins to distribute responsibility.

**Independent Test**: Log in as an admin. Navigate to User Management. Select a member. Click "Make Admin" and confirm. Verify their role changes in the list. Verify an audit log entry is created. Attempt to demote the user back to member and confirm the role change.

**Acceptance Scenarios**:

1. **Given** an admin views a member user in the list, **When** they click "Make Admin" (or similar action), **Then** a confirmation modal appears stating the privilege escalation.
2. **Given** the promotion confirmation is accepted, **When** the action is submitted, **Then** the user's role is updated to `admin` in the org membership and an audit log entry is created.
3. **Given** an admin views another admin user in the list, **When** they click "Demote to Member" (or similar), **Then** a confirmation modal appears (especially if this is the last admin).
4. **Given** a demotion is confirmed, **When** the action is submitted, **Then** the user's role is updated to `member` and an audit log entry is created.
5. **Given** a role change occurs, **When** the change is saved, **Then** the affected user receives an email notification (if notifications are enabled) informing them of their new role.

---

### User Story 5 — Audit Log: User Management Events (Priority: P3)

Organization admins can view an audit log of all user management events (user added, removed, promoted, demoted, accessed resources) within their organization. The audit log includes timestamp, actor, affected user, action, and outcome. This log is immutable and retained for compliance purposes.

**Why this priority**: Audit transparency is essential for compliance and security monitoring. It allows admins to track and investigate user access patterns.

**Independent Test**: Perform several user management actions (remove a user, promote a member to admin). Navigate to the Audit Log section. Verify all actions are recorded with correct timestamps, actor IDs, action types, and outcomes.

**Acceptance Scenarios**:

1. **Given** an admin navigates to the Audit Log section, **When** the page loads, **Then** a chronological list of all recent user management events is displayed, sorted by timestamp (newest first).
2. **Given** an audit log is displayed, **When** the admin filters by event type (e.g., "User Added", "User Removed", "Role Changed"), **Then** only matching events are shown.
3. **Given** an audit log is displayed, **When** the admin searches by affected user email or actor email, **Then** only related events are displayed.
4. **Given** an audit log entry is viewed, **When** the admin clicks on an entry, **Then** full details are shown (actor ID, affected user ID, timestamp, action details, outcome).
5. **Given** audit log retention is set to 1 year, **When** audit entries reach that age, **Then** they are automatically archived (moved to long-term storage or marked as archived, not deleted).

---

### Edge Cases

- What happens when an admin attempts to remove themselves from an organization? → The action is blocked with a message: "You cannot remove yourself. Transfer admin role to another member first or have another admin remove you."
- What happens when a removed user attempts to access a specific org resource (e.g., a direct link to a store)? → A 403 error is returned and the user is informed they no longer have access to that org.
- What happens when two admins simultaneously attempt to remove the last admin? → The first removal succeeds. The second request responds with an error: "Cannot remove the last admin from the organization."
- What happens when a user is removed from an org but has multiple sessions active (multiple browser tabs)? → All sessions for that user in that org are immediately invalidated (via a session revocation token). Active requests result in 401 Unauthorized, and the user is redirected to login.
- What happens when a user is removed and then re-added to the same org within the 30-day grace period? → The scheduled deletion task is cancelled. The user's data is preserved (recovery scenario).
- What happens when a search query on the user list returns no results? → An empty state is shown: "No users match your search. Current members: 5."
- What happens when the org has paginated user lists and a page is deleted (e.g., the last user on page 2 is removed and no more stay on page 2)? → The user is redirected to the last valid page.
- What happens when an organization's admin removes a member but the Firestore write succeeds while the email notification fails? → The removal is persisted (eventual consistency for notifications). An error is logged and an admin is notified to retry/investigate the email delivery via a separate admin dashboard.
- What happens if the scheduled deletion job fails to hard-delete some records? → Deletion tasks are retried up to 3 times with exponential backoff. If all retries fail, the task is marked as `failed` and surfaced in an admin dashboard for manual investigation.
- What happens when viewing the user list and a new user joins the org in real-time? → The list is not automatically refreshed (no real-time updates in v1). The admin must manually refresh the page to see the new member.

---

## Requirements _(mandatory)_

### Functional Requirements

#### User Visibility & Listing (FR-001 – FR-009)

- **FR-001**: Organization admins MUST be able to access a dedicated "User Management" section within the app.
- **FR-002**: The User Management section MUST display a paginated list (25 items per page) of all members currently in the organization, including: user name (display name), email, baseRole (`owner`, `admin`, or `member`), join date, and last active timestamp.
- **FR-003**: The user list MUST be sortable by: name (A→Z / Z→A), email (A→Z / Z→A), role, and join date (newest / oldest). Default sort order is join date descending.
- **FR-004**: The user list MUST support text search by email (case-insensitive, prefix match). Substring matching is out of scope for v1.
- **FR-005**: The admin viewing the list MUST see themselves marked distinctly (e.g., "(You)" badge or visual highlight) so they can identify their own profile.
- **FR-006**: Non-admin users MUST NOT have access to the User Management section. Any attempt to access it MUST result in a 403 Forbidden response or redirect to an access-denied page.
- **FR-007**: The user list MUST be scoped to the current organization context. Users in one org MUST NOT see members from other orgs.
- **FR-008**: Each paginated page MUST remain responsive even if the organization has large membership (testing up to 10k members requires cursor-based pagination; v1 may use offset-based but with performance caveats).
- **FR-009**: The `lastActiveAt` timestamp MUST be updated whenever a user accesses any protected resource in the org (stores, API keys, etc.) and SHOULD be cached to avoid excessive writes (e.g., update max once per 5 minutes).

#### User Removal & Offboarding (FR-010 – FR-022)

- **FR-010**: Organization admins MUST be able to initiate removal of a non-admin member from the organization by clicking a "Remove" action on that user in the user list.
- **FR-011**: When a remove action is initiated, a danger-intent confirmation modal MUST appear listing the immediate consequences: number of stores, API keys, and other org-scoped data that will be queued for deletion.
- **FR-012**: After confirming removal, the user MUST be immediately removed from the organization membership and MUST NOT appear in the user list (immediate soft delete: `deletedAt` timestamp set, optional hard delete via scheduled task).
- **FR-013**: All API keys created by the removed user in that organization MUST be immediately revoked (`isRevoked = true`, `revokedAt` timestamp set) and unusable for API requests.
- **FR-014**: All stores created by the removed user in that organization MUST be marked for deletion (soft delete: `deletedAt` timestamp set). Hard deletion occurs after a configurable grace period (default 30 days).
- **FR-015**: Connected API key activity logs and audit trail entries related to the removed user in that org MUST be preserved (immutable history) and accessible to admins via audit log queries for compliance purposes.
- **FR-016**: Removed users MUST NOT be able to re-authenticate into the removed organization. Any attempt to access org resources MUST result in a 403 Forbidden error.
- **FR-017**: Removed users MUST retain their global user profile and ability to join other organizations (user deletion from org ≠ global account deletion).
- **FR-018**: An admin MUST NOT be able to remove themselves from an organization (the UI action MUST be disabled or blocked with an error message).
- **FR-019**: An admin MUST NOT be able to remove the last remaining admin from an organization (the action MUST be blocked; the system MUST maintain at least one admin per org).
- **FR-020**: When a user is removed, all active sessions for that user in that organization MUST be invalidated (session tokens revoked). Subsequent requests from that user to any org resource MUST receive 401 Unauthorized.
- **FR-021**: If a removed user is re-added to the organization within the grace period (before hard deletion commences), their soft-deleted data MUST be recoverable and the scheduled hard deletion MUST be cancelled.
- **FR-022**: A removal action MUST create an immutable audit log entry capturing: timestamp, admin actor ID, affected user ID, removal reason (if provided), and outcome.

#### Multi-Organization Support (FR-023 – FR-030)

- **FR-023**: Users MUST be able to belong to multiple organizations simultaneously (tracked via `orgMemberships/{userId}/organizations/{orgId}`).
- **FR-024**: Each user profile MUST maintain a primary `orgId` field representing their preferred organization context (used for dashboard landing page on login).
- **FR-025**: Users MUST be able to view a list of all organizations they belong to (org switcher dropdown or sidebar menu).
- **FR-026**: Users MUST be able to switch to any organization they belong to by selecting it from the org switcher. The app context (dashboard, stores, API keys) MUST immediately update to reflect the selected org.
- **FR-027**: When a user switches organizations, the URL MUST update to reflect the new org context.
- **FR-028**: When a user logs in, they MUST be redirected to their primary organization's dashboard (or a neutral landing page if they have no org membership due to edge case removal).
- **FR-029**: Users MUST be able to update their preferred primary organization from their Profile/Settings page.
- **FR-030**: When a user is removed from their current org context (via admin removal), they MUST be automatically redirected to their primary org's dashboard (or another accessible org) and shown a notification: "You have been removed from [Org Name]."

#### Role & Permission Management (FR-031 – FR-035)

- **FR-031**: Each organization member MUST have a baseRole (built-in system role): `owner`, `admin`, or `member`.
  - `owner`: Org creator; has full access; cannot be removed or demoted (requires manual admin intervention to transfer ownership).
  - `admin`: Can manage users, view audit logs, and access/modify org resources; cannot be the last admin in org.
  - `member`: Can view/use org resources; limited by assigned custom roles (v2, deferred).
- **FR-032**: Only `owner` or `admin` MUST be able to access User Management, remove members, and manage baseRoles.
- **FR-033**: Admins MUST be able to promote a `member` to `admin` status via the User Management UI (except when doing so would leave zero admins; see FR-019). Promotion MUST create an immutable audit log entry.
- **FR-034**: Admins MUST be able to demote an `admin` to `member` status (except when doing so would leave zero admins; see FR-019). Demotion MUST create an audit log entry.
- **FR-035**: The user who creates an organization MUST automatically be assigned the `owner` baseRole for that organization. Subsequent admins are assigned `admin` baseRole.

#### Data Deletion & Scheduling (FR-036 – FR-043)

- **FR-036**: When a user is removed from an org, all org-scoped data associated with the user MUST be soft-deleted: memberships, stores, API keys, custom data records, and context records MUST have a `deletedAt` timestamp set immediately.
- **FR-037**: A deletion task record MUST be created in a `deletionTasks/{taskId}` collection capturing: affected user ID, affected org ID, timestamp of removal, scheduled hard-delete time (removal time + grace period), retry counter, and status (`pending`, `in_progress`, `completed`, `failed`).
- **FR-038**: A scheduled Cloud Function (`retryOrgUserDeletion`) MUST run at least once daily (configurable frequency, default twice daily) to hard-delete records where `deletedAt + gracePeriod <= now()`.
- **FR-039**: Hard deletion MUST permanently remove: Firestore documents (stores, custom data, API keys), Cloud Storage files (user's uploaded files), and any derived embeddings/indexes (Gemini File Search indexes).
- **FR-040**: If hard deletion fails for any records, the deletion task MUST be retried up to 3 times with exponential backoff (1 minute, 5 minutes, 30 minutes). Failed tasks MUST be logged and surfaced to organization admins via the audit log or a dedicated task dashboard.
- **FR-041**: Audit log entries and deletion task history MUST be retained indefinitely (never hard-deleted) for compliance purposes.
- **FR-042**: Organizations MUST be able to configure their grace period (default 30 days) within Admin Settings. _(scope: Admin settings feature; not covered in this spec but called out here as a dependency.)_
- **FR-043**: If a user is re-added to an org within the grace period, any pending deletion task MUST be automatically cancelled and the soft-deleted data MUST be unmarked (`deletedAt = null`) for recovery.

#### Notifications & Communication (FR-044 – FR-047)

- **FR-044**: When a user is removed from an organization, an offboarding email MUST be sent to the removed user (if org notifications are enabled) containing: organization name, removal timestamp, and a link to their profile/dashboard.
- **FR-045**: When a user is promoted to admin, a notification email MUST be sent (if notifications enabled) containing: organization name, new role, and a link to User Management.
- **FR-046**: When a user is demoted from admin, a notification email MUST be sent (if notifications enabled) containing: organization name, new role, and a link to their dashboard.
- **FR-047**: If email delivery fails for any notification, the action MUST still succeed (non-blocking). The failure MUST be logged and a retry mechanism MUST attempt delivery up to 3 times within a 24-hour window.

#### Audit & Compliance (FR-048 – FR-050)

- **FR-048**: All user management actions (add, remove, role change) MUST create immutable audit log entries in `organizations/{orgId}/auditLogs/{logId}`.
- **FR-049**: Audit log entries MUST be queryable by: event type, actor ID, affected user ID, and timestamp range. Admins MUST be able to export audit logs as CSV.
- **FR-050**: Audit log entries MUST never be deleted. Archival (move to cold storage) is allowed after 1 year; deletion is prohibited.

---

### Non-Functional Requirements

- **NFR-001**: User listing queries MUST return within 500 ms for organizations with up to 10,000 members (requires efficient Firestore indexes and potential cursor-based pagination).
- **NFR-002**: User removal actions MUST complete within 2 seconds (Firestore writes + API key revocation).
- **NFR-003**: Session invalidation for removed users MUST occur within 5 minutes (eventual consistency via token revocation broadcast or periodic refresh).
- **NFR-004**: Scheduled deletion tasks MUST complete within 24 hours of the grace period expiration.
- **NFR-005**: All user-facing forms MUST update within 100 ms of user input to provide immediate feedback (no visible lag).
- **NFR-006**: Audit logs MUST be queryable within 1 second for time ranges up to 1 year.

---

### Scope Clarification: v1 vs v2 Features

**v1 (This Spec)**:
- ✅ User visibility, listing, search, pagination, sorting
- ✅ User removal with soft-delete + hard-delete scheduling (grace period recovery)
- ✅ Multi-org membership + org switching
- ✅ System baseRoles (owner, admin, member)
- ✅ Audit logging for all user management events
- ✅ Session invalidation on removal

**v2 (Deferred)**:
- ⏳ Custom roles (create, update, delete per org)
- ⏳ ABAC policies (attribute-based access control)
- ⏳ Fine-grained permission management

### Success Criteria

- ✅ Org admins/owners can view a complete, sortable, searchable list of members in their org.
- ✅ Org admins/owners can remove members and all member's org-scoped data is scheduled for deletion.
- ✅ Removed users cannot access the org and their global profile persists.
- ✅ Users can belong to multiple organizations and switch between them seamlessly.
- ✅ BaseRole promotions and demotions are audited and communicated to affected users.
- ✅ Audit logs are immutable, queryable, and retained for compliance (never deleted).
- ✅ Deletion scheduling prevents data loss via grace period and recovery mechanisms.
- ✅ System performance is acceptable (queries < 500 ms, removals < 2 s, deletions < 24 h).
- ✅ Email notifications sent on removal, promotion, demotion (infrastructure task required).

---

## API Endpoints & Server Actions

### Queries (Server Actions)

#### `getOrgUserList(orgId, { page?, sortBy?, sortOrder?, searchEmail? }): Promise<UserListResponse>`

Returns a paginated list of users in an organization.

**Request**:
```typescript
interface GetOrgUserListRequest {
  orgId: string;
  page?: number; // 1-indexed; default: 1
  sortBy?: "name" | "email" | "role" | "joinDate"; // default: "joinDate"
  sortOrder?: "asc" | "desc"; // default for joinDate: "desc"; others: "asc"
  searchEmail?: string; // prefix match; case-insensitive
  limit?: number; // default: 25
}
```

**Response**:
```typescript
interface UserListResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UserListItem {
  id: string; // userId
  email: string;
  displayName: string;
  role: "admin" | "member";
  joinedAt: Date;
  lastActiveAt: Date | null;
  isCurrentUser: boolean; // true if viewing user is the same as this user
}
```

**Authorization**: Requires `admin` role in the org.

**Firestore Query**:
```
organizations/{orgId}/memberships
  where deletedAt == null
  where orgId == orgId
  orderBy {sortBy}
  limit {limit}
  offset {(page - 1) * limit}
```

---

#### `getOrgAuditLog(orgId, { page?, filterEventType?, filterActorId?, filterUserId?, dateFrom?, dateTo? }): Promise<AuditLogResponse>`

Returns audit log entries for user management events in an organization.

**Request**:
```typescript
interface GetOrgAuditLogRequest {
  orgId: string;
  page?: number; // 1-indexed; default: 1
  filterEventType?: "USER_ADDED" | "USER_REMOVED" | "ROLE_PROMOTED" | "ROLE_DEMOTED";
  filterActorId?: string; // admin who performed the action
  filterUserId?: string; // affected user
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number; // default: 50
}
```

**Response**:
```typescript
interface AuditLogResponse {
  entries: AuditLogEntry[];
  pagination: { page: number; limit: number; total: number; hasNext: boolean };
}

interface AuditLogEntry {
  id: string;
  eventType: "USER_ADDED" | "USER_REMOVED" | "BASE_ROLE_CHANGED" | "MEMBERSHIP_RESTORED" | "API_KEY_REVOKED_ON_REMOVAL";
  actorId: string; // admin who performed action
  actorEmail: string;
  affectedUserId: string;
  affectedUserEmail: string;
  timestamp: Date;
  details: {
    reason?: string; // optional reason for removal
    previousBaseRole?: "owner" | "admin" | "member"; // for role changes
    newBaseRole?: "owner" | "admin" | "member"; // for role changes
  };
  outcome: "success" | "failure";
  errorMessage?: string;
}
```

**Authorization**: Requires `admin` role in the org.

---

#### `getUserOrgList(): Promise<UserOrgListResponse>`

Returns all organizations the current user belongs to.

**Response**:
```typescript
interface UserOrgListResponse {
  organizations: UserOrgItem[];
  primaryOrgId: string;
}

interface UserOrgItem {
  id: string; // orgId
  name: string;
  role: "admin" | "member";
  memberCount: number;
  joinedAt: Date;
}
```

**Authorization**: Requires authenticated user.

---

### Mutations (Server Actions)

#### `removeUserFromOrg(orgId, userId, { reason?: string }): Promise<RemoveUserResponse>`

Removes a user from an organization and schedules their org-scoped data for deletion.

**Request**:
```typescript
interface RemoveUserRequest {
  orgId: string;
  userId: string;
  reason?: string; // optional reason logged in audit trail
}
```

**Response**:
```typescript
interface RemoveUserResponse {
  success: boolean;
  message: string;
  deletionTaskId: string; // ID of scheduled deletion task for tracking
}
```

**Preconditions**:
- Caller MUST be an admin in `orgId`.
- User being removed MUST NOT be the only admin in `orgId`.
- Caller MUST NOT remove themselves (allowed only if another admin exists).

**Side Effects**:
1. Set `deletedAt = now()` on user membership in `organizations/{orgId}/memberships/{userId}`.
2. Revoke all API keys: iterate `organizations/{orgId}/apiKeys` where `createdBy == userId` and set `isRevoked = true`, `revokedAt = now()`.
3. Soft-delete all stores: iterate `organizations/{orgId}/stores` where `createdBy == userId` and set `deletedAt = now()`.
4. Create deletion task: insert record into `deletionTasks/{taskId}` with status `pending`, scheduled hard-delete time = `now() + gracePeriod`, retry counter = 0.
5. Invalidate sessions: broadcast revocation token for user in org (via session store or token blacklist).
6. Send email: queue offboarding email to removed user (async; non-blocking).
7. Create audit log: insert entry with eventType `USER_REMOVED`, actor = caller, affected user = `userId`, outcome = `success`.

**Errors**:
- `FORBIDDEN`: Caller is not admin, or attempting to remove themselves, or removing last admin.
- `NOT_FOUND`: User or org does not exist.
- `INTERNAL`: Transient error during write; client should retry with exponential backoff.

**Idempotency**: Calling this twice for the same user should be idempotent. If user is already soft-deleted, return success with the same message.

---

#### `promoteUserToAdmin(orgId, userId): Promise<PromoteUserResponse>`

Promotes a member to admin role.

**Request**:
```typescript
interface PromoteUserRequest {
  orgId: string;
  userId: string;
}
```

**Response**:
```typescript
interface PromoteUserResponse {
  success: boolean;
  message: string;
}
```

**Preconditions**:
- Caller MUST be an admin in `orgId`.
- Target user MUST be a member (role === "member") in that org.

**Side Effects**:
1. Update membership: set `role = "admin"` on `organizations/{orgId}/memberships/{userId}`.
2. Create audit log: eventType `ROLE_PROMOTED`, previousRole = `member`, newRole = `admin`.
3. Send email: queue promotion email to promoted user.

**Errors**:
- `FORBIDDEN`: Caller is not admin.
- `CONFLICT`: Target user already has admin role.
- `NOT_FOUND`: User or org does not exist.

---

#### `demoteAdminToMember(orgId, userId): Promise<DemoteAdminResponse>`

Demotes an admin to member role.

**Request**:
```typescript
interface DemoteAdminRequest {
  orgId: string;
  userId: string;
}
```

**Response**:
```typescript
interface DemoteAdminResponse {
  success: boolean;
  message: string;
}
```

**Preconditions**:
- Caller MUST be an admin in `orgId`.
- Target user MUST have admin role.
- At least one other admin MUST remain after demotion (cannot demote last admin).

**Side Effects**: Same as `promoteUserToAdmin` but with eventType `ROLE_DEMOTED`.

---

#### `switchUserOrg(newOrgId): Promise<SwitchOrgResponse>`

Switches the current user's active organization context.

**Request**:
```typescript
interface SwitchOrgRequest {
  newOrgId: string;
}
```

**Response**:
```typescript
interface SwitchOrgResponse {
  success: boolean;
  message: string;
  redirect: string; // URL to new org's dashboard
}
```

**Preconditions**:
- User MUST belong to `newOrgId` (membership record exists and not soft-deleted).

**Side Effects**: None persistent; org context changes in session/client state. Note: primary org is NOT updated; that requires explicit profile update.

---

#### `setPrimaryOrg(orgId): Promise<SetPrimaryOrgResponse>`

Sets the user's preferred primary organization (used for login landing page).

**Request**:
```typescript
interface SetPrimaryOrgRequest {
  orgId: string;
}
```

**Response**:
```typescript
interface SetPrimaryOrgResponse {
  success: boolean;
  message: string;
}
```

**Preconditions**: User MUST belong to `orgId`.

**Side Effects**: Update `profiles/{userId}.orgId = orgId`.

---

## Assumptions

1. **Existing Auth System**: A working authentication system (magic link, session cookies) is already implemented per `001-auth-onboarding-platform`. User profiles exist in `profiles/{userId}` and organizations in `organizations/{orgId}`.

2. **Existing Org Membership**: A new `organizations/{orgId}/memberships/{userId}` subcollection tracks all org-user relationships (replaces or supplements a simple foreign key in the profile).

3. **Firestore Admin SDK**: All server-side operations use Firebase Admin SDK with sufficient permissions (delete, write, read) on Firestore and Cloud Storage.

4. **Cloud Functions v2**: A scheduled Cloud Function runs daily (or more frequently) to process deletion tasks and hard-delete expired records.

5. **Email Service**: A working email service (Firebase Cloud Messaging, SendGrid, etc.) is available to send off-boarding, promotion, and demotion notifications. Failures are non-blocking.

6. **Session Management**: A session store or token-based mechanism exists to invalidate sessions for removed users (e.g., Redis, Firestore, or in-memory token blacklist with TTL).

7. **TanStack Query**: Client-side data fetching uses TanStack Query v5 with appropriate cache invalidation strategies after mutations.

8. **UI Components**: HeroUI v3+ components are available for tables, modals, dropdowns, paginated lists, and access-control elements.

9. **No Real-Time Updates**: User list updates are not real-time in v1 (manual refresh required). Real-time presence/activity is deferred to a future feature.

10. **Single Primary Org Model**: While users can join multiple orgs, they have exactly one primary org for initial login context. Switching orgs does not update the primary org (explicit action required).

11. **Grace Period Configuration**: Organizations can configure their grace period for hard deletion. This is configurable by org admins via a settings feature (out of scope for this spec but assumed to exist).

12. **Data Retention Compliance**: Audit logs and deletion task history are never hard-deleted, only archived. This satisfies compliance requirements (SOC 2, GDPR audit trail).

---

## Open Questions for Future Refinement

1. Should inviting new users be part of this spec, or is it a separate feature? → Currently scoped out; users are added only by admins programmatically or join via org code.
2. Should role-based access control (RBAC) with more granular permissions (e.g., read-only, billing admin) be supported in v1? → No; v1 supports only `admin` and `member` roles.
3. Should removed users receive a "recovery window" notification email informing them about the 30-day grace period and how to request restoration? → Recommended but not required in v1.
4. Should the system support bulk user actions (bulk remove, bulk promote)? → No; v1 supports single-user actions only for safety.
5. Should deletion tasks have a configurable retry policy per organization? → No; default exponential backoff with 3 retries is hardcoded for v1.
