# Feature Specification: Auth, Onboarding & Core Platform

**Feature Branch**: `001-auth-onboarding-platform`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "platform where user can login/sign up with magic link. After signup user will see onboarding modal where user will enter their name, Organization Name, Size. Dashboard welcome user. Profile (User Name, Delete Account). Settings: manage organization details (name), API Keys (manage API keys, key associated with the Organization)"

## Clarifications

### Session 2026-04-05

- Q: How should API keys be stored after creation? → A: Plaintext — the full key value is stored and is retrievable at any time. _(Deliberate decision; acknowledged risk: full key exposure if database is compromised — OWASP A02.)_
- Q: When a user deletes their account, what happens to the Organization they own and its API keys? → A: Cascade delete — user deletion permanently removes the Organization and all associated API keys.
- Q: What format should generated API keys take? → A: Prefixed random string — e.g., `cmo_<32 random alphanumeric characters>`. Prefix makes keys identifiable in logs and secret-scanning tools.
- Q: What predefined size ranges should appear in the onboarding Organization Size field? → A: 5 bands: `1–10`, `11–50`, `51–200`, `201–1000`, `1000+`.
- Q: Should the system log security-relevant events for audit purposes? → A: Yes — log magic link requests, API key creation, API key revocation, and account deletion; each entry captures actor, timestamp, and outcome.
- Added (user input): Dashboard displays KPI metrics — total active API keys (tile), key activity over time (bar chart), and errors over time (bar chart), all scoped to the user's organization.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Magic Link Authentication (Priority: P1)

A new or returning user arrives at the platform and needs to access their account without a password. They enter their email address, receive a one-time magic link in their inbox, and click it to be signed in instantly. New users who have never signed up before are created automatically on first magic link use.

**Why this priority**: Authentication is the entry gate to every other feature. Nothing else is accessible without it. It is the smallest deliverable that already provides end-to-end user value.

**Independent Test**: Open the app without a session, enter a valid email, receive the magic link email, click the link, and confirm the user lands on a protected page authenticated.

**Acceptance Scenarios**:

1. **Given** a visitor is unauthenticated, **When** they submit a valid email address, **Then** they receive a magic link email within 60 seconds and see a confirmation message instructing them to check their inbox.
2. **Given** a visitor clicks a valid, unexpired magic link, **When** the link is opened, **Then** they are signed in and redirected to the Dashboard (returning user) or the Onboarding flow (new user).
3. **Given** a visitor clicks an expired or already-used magic link, **When** the link is opened, **Then** they see a clear error message and are prompted to request a new link.
4. **Given** a visitor submits an invalid or malformed email, **When** they submit the form, **Then** an inline validation message is shown and no email is sent.
5. **Given** an authenticated user directly visits the login page, **When** the page loads, **Then** they are automatically redirected to the Dashboard.

---

### User Story 2 — New User Onboarding (Priority: P2)

After a brand-new user completes their first magic link authentication, they are presented with an onboarding modal before reaching the Dashboard. The modal collects their display name, the name of their organization, and the organization's size. Once submitted, their profile and organization are created and they land on the Dashboard.

**Why this priority**: Without an organization context, subsequent features (API keys, settings, multi-tenancy) have no tenant to operate within. The onboarding must be completed before the platform is usable.

**Independent Test**: Authenticate as a net-new user, complete the onboarding modal, and confirm that a user profile and an organization record both exist after submission, and that the Dashboard greets the user by name.

**Acceptance Scenarios**:

1. **Given** a newly authenticated user has no profile, **When** they land on the app, **Then** the onboarding modal appears immediately and cannot be dismissed without completing it.
2. **Given** the onboarding modal is open, **When** the user submits all required fields (display name, organization name, organization size), **Then** their user profile and organization are saved and they are taken to the Dashboard.
3. **Given** the onboarding modal is open, **When** the user attempts to submit with any field empty, **Then** inline validation errors appear and submission is blocked.
4. **Given** a returning user who has already completed onboarding signs in, **When** they authenticate, **Then** the onboarding modal does NOT appear and they land directly on the Dashboard.
5. **Given** an onboarding submission fails due to a transient error, **When** the error occurs, **Then** the user sees a descriptive error message and may retry without losing entered data.

---

### User Story 3 — Dashboard with Metrics & KPIs (Priority: P3)

After authentication and onboarding, the user lands on the Dashboard — the home page of the platform. The Dashboard greets the user by their display name and presents organization-scoped KPI metrics: total active API keys, API key activity over time (bar chart), and API errors over time (bar chart). Navigation to Profile and Settings is provided.

**Why this priority**: The Dashboard is the core navigation hub and the primary surface for operational visibility. Once auth and onboarding are solid, the Dashboard ties the experience together and gives users actionable insight into their API key usage.

**Independent Test**: Authenticate as an onboarded user with at least one API key. Confirm the Dashboard shows the correct display name greeting, a total key count matching the actual count, a key activity bar chart with at least one data point, and an errors bar chart. Confirm an unauthenticated user cannot access the page.

**Acceptance Scenarios**:

1. **Given** an authenticated, onboarded user visits the Dashboard, **When** the page loads, **Then** a personalized welcome message including their display name is shown.
2. **Given** an authenticated user visits the Dashboard, **When** the page loads, **Then** a KPI tile displaying the total number of active API keys for their organization is shown.
3. **Given** an authenticated user visits the Dashboard, **When** the page loads, **Then** a bar chart displaying API key activity (number of requests per time period) for their organization is shown.
4. **Given** an authenticated user visits the Dashboard, **When** the page loads, **Then** a bar chart displaying API errors (number of failed requests per time period) for their organization is shown.
5. **Given** an organization has no API key activity, **When** the Dashboard loads, **Then** the activity and error bar charts render in an empty/zero state with a descriptive placeholder (not an error).
6. **Given** an unauthenticated visitor tries to access the Dashboard directly, **When** the page loads, **Then** they are redirected to the login page.
7. **Given** the Dashboard is loaded, **When** any network delay occurs, **Then** skeleton placeholders matching the exact layout of each metric widget are displayed until content is ready (zero layout shift).

---

### User Story 4 — Profile Management (Priority: P4)

An authenticated user can visit their Profile page to view or update their display name. They can also permanently delete their account from this page, after confirming the destructive action through a confirmation dialog.

**Why this priority**: Profile management is a baseline expectation for any platform. Account deletion is also required for privacy compliance.

**Independent Test**: Navigate to Profile, update the display name, confirm the new name persists on the Dashboard greeting. Then initiate account deletion, dismiss the confirmation, confirm account still exists. Then confirm deletion, and confirm the session is ended and the account is removed.

**Acceptance Scenarios**:

1. **Given** an authenticated user visits the Profile page, **When** the page loads, **Then** their current display name is pre-filled in an editable field.
2. **Given** a user updates their display name and saves, **When** the save is confirmed, **Then** the new name is reflected everywhere on the platform (Dashboard greeting, etc.) without a full page reload.
3. **Given** a user clicks "Delete Account", **When** the button is clicked, **Then** a confirmation modal appears clearly stating the account and all associated data will be permanently deleted.
4. **Given** the delete confirmation modal is open, **When** the user confirms deletion, **Then** their account and all personal data are permanently removed, their session is ended, and they are redirected to the login page.
5. **Given** the delete confirmation modal is open, **When** the user dismisses it, **Then** the modal closes and no deletion occurs.

---

### User Story 5 — Organization Settings & API Key Management (Priority: P5)

An authenticated user can visit the Settings page to update their organization's name. They can also manage API keys that are scoped to their organization: view existing keys (masked), create new keys, and revoke keys they no longer need.

**Why this priority**: Settings unlock the programmatic integration story (API keys) and let organizations keep their profile accurate. It depends on the organization context established during onboarding.

**Independent Test**: Navigate to Settings, update the organization name and confirm it persists. Create a new API key, confirm it is displayed once unmasked on creation. Revoke the key and confirm it no longer appears in the list.

**Acceptance Scenarios**:

1. **Given** an authenticated user visits the Settings page, **When** the page loads, **Then** the organization's current name is shown in an editable field.
2. **Given** a user updates the organization name and saves, **When** the save is confirmed, **Then** the new name is persisted and reflected immediately on the page.
3. **Given** a user visits the API Keys section, **When** the section loads, **Then** all existing API keys for the organization are listed, with key values masked (e.g., showing only the last 4 characters).
4. **Given** a user creates a new API key, **When** creation succeeds, **Then** the full key value is displayed once as a copyable value and never shown again in full after the user navigates away.
5. **Given** a user clicks "Revoke" on an existing API key, **When** the button is clicked, **Then** a confirmation modal appears warning that the key will stop working immediately.
6. **Given** the revoke confirmation modal is confirmed, **When** the action completes, **Then** the key is removed from the list and any requests using that key are rejected from that point forward.
7. **Given** an authenticated user tries to access another organization's settings or API keys via a direct URL, **When** the request is processed, **Then** access is denied and a not-found or forbidden response is shown.

---

### Edge Cases

- What happens when the magic link email is not received? The user can request a new link without penalty. Rate limiting applies to prevent abuse: maximum 5 link requests per email per hour.
- What happens when a user deletes their account? The deletion cascades: the user record, their owned Organization, and all associated API keys are permanently and atomically removed. Any in-flight API requests using those keys are rejected immediately after deletion completes.
- What happens when a user tries to set an empty display name? Inline validation blocks submission; the name field is required and must be at least 2 characters.
- What happens if the user closes the browser mid-onboarding without submitting? On next login the onboarding modal reappears; partial data is not persisted.
- What happens when an API key is used after revocation? The request is rejected immediately; no grace period.
- What happens if the organization name field in Settings is cleared and saved? Inline validation blocks submission; organization name is required.

---

## Requirements _(mandatory)_

### Functional Requirements

**Authentication**

- **FR-001**: The system MUST allow users to initiate sign-in or sign-up by submitting their email address; no password is required.
- **FR-002**: The system MUST send a time-limited, single-use magic link to the submitted email address.
- **FR-003**: Magic links MUST expire after 15 minutes of issuance and become invalid after a single use.
- **FR-004**: The system MUST automatically create a new user account on first successful magic link redemption if no account exists for that email.
- **FR-005**: The system MUST redirect authenticated users away from the login page to the Dashboard.
- **FR-006**: The system MUST rate-limit magic link requests to a maximum of 5 per email address per hour.

**Onboarding**

- **FR-007**: The system MUST detect first-time users (no completed profile) and present the onboarding modal before granting access to any platform page.
- **FR-008**: The onboarding modal MUST collect: display name (required, ≥ 2 characters), organization name (required), and organization size (required, one of: `1–10`, `11–50`, `51–200`, `201–1000`, `1000+`).
- **FR-009**: The system MUST prevent the onboarding modal from being dismissed or bypassed until all fields are valid and submitted.
- **FR-010**: On successful onboarding submission, the system MUST create a user profile record linked to the authenticated user and an organization record linked to that user.

**Dashboard**

- **FR-011**: The Dashboard MUST display a personalized greeting using the authenticated user's display name.
- **FR-012**: The Dashboard MUST be inaccessible to unauthenticated users; direct URL access MUST redirect to the login page.
- **FR-025**: The Dashboard MUST display a KPI tile showing the total count of active (non-revoked) API keys for the authenticated user's organization.
- **FR-026**: The Dashboard MUST display a bar chart showing API key activity (total successful requests) for the organization, aggregated daily over the last 30 calendar days.
- **FR-027**: The Dashboard MUST display a bar chart showing API errors (failed requests) for the organization, aggregated by the same time period as the activity chart. All metric widgets MUST render a descriptive empty state when no data is available.

**Profile**

- **FR-013**: The Profile page MUST display the user's current display name in an editable field.
- **FR-014**: The system MUST persist an updated display name and reflect it across the platform immediately after saving.
- **FR-015**: The system MUST require confirmation via a modal before processing account deletion.
- **FR-016**: On confirmed account deletion, the system MUST cascade-delete: the user's personal data, their owned Organization, and all API keys belonging to that Organization are permanently removed. The user's session MUST be ended and they MUST be redirected to the login page.

**Settings — Organization**

- **FR-017**: The Settings page MUST display the organization's current name in an editable field.
- **FR-018**: The system MUST persist an updated organization name immediately after saving; the name field is required.

**Settings — API Keys**

- **FR-019**: The system MUST list all API keys associated with the user's organization, displaying each key in a masked format (last 4 characters visible).
- **FR-020**: The system MUST generate API keys in the format `cmo_<32 random alphanumeric characters>`. The full key value is stored in plaintext and MUST be displayed in full upon creation. The list view MUST display only a masked format (prefix + last 4 characters, e.g., `cmo_...ab3z`). _(Plaintext storage — deliberate architectural decision; see Clarifications.)_
- **FR-021**: The system MUST require confirmation via a modal before revoking an API key.
- **FR-022**: On confirmed revocation, the system MUST immediately invalidate the API key; no grace period applies.
- **FR-023**: The system MUST enforce organization-level isolation: users MUST only be able to view or manage API keys belonging to their own organization.
- **FR-024**: The system MUST emit a structured audit log entry for each of the following security-relevant events: magic link request (including outcome), API key creation, API key revocation, and account deletion. Each entry MUST capture: event type, actor (user identifier or email), timestamp, and outcome (success or failure with reason).

### Key Entities

- **User**: Represents an authenticated individual. Key attributes: unique identifier, email address, display name, onboarding completion status, timestamps.
- **Organization**: Represents a tenant workspace. Key attributes: unique identifier, name, size range (one of: `1–10`, `11–50`, `51–200`, `201–1000`, `1000+`), owner (linked User), timestamps.
- **ApiKey**: Represents a programmatic access credential scoped to an Organization. Key attributes: unique identifier, full key value (stored in plaintext; format: `cmo_<32 random alphanumeric chars>`), masked display value (prefix + last 4 chars, e.g., `cmo_...ab3z`), revocation status, linked Organization, timestamps. _(Deliberate: plaintext storage chosen; full key is recoverable from the database.)_

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete the full sign-up and onboarding flow (from email submission to Dashboard) in under 3 minutes under normal email delivery conditions.
- **SC-002**: The magic link email is delivered to the user's inbox within 60 seconds of request in 95% of cases.
- **SC-003**: 95% of new users successfully complete the onboarding modal on first attempt without abandoning.
- **SC-004**: The Dashboard, Profile, and Settings pages each load their primary content within 2 seconds on a 10 Mbps connection with 50 ms latency (Lighthouse "Fast 3G" throttling profile).
- **SC-005**: No layout shift occurs on any page load (zero CLS); skeleton placeholders match final content dimensions exactly.
- **SC-006**: Organization isolation is absolute: in automated access-control tests, zero cross-tenant data leaks are detected.
- **SC-007**: API key revocation takes effect within 1 second of confirmation; no revoked key successfully authenticates any subsequent request.
- **SC-008**: Account deletion completes within 5 seconds and results in the user being unable to log back in with the deleted email.
- **SC-009**: 100% of security-relevant events (magic link requests, API key creation, API key revocation, account deletion) produce a structured audit log entry; no such event is unlogged.

---

## Assumptions

- Users have access to a valid email inbox they can check during the authentication flow; email delivery time is not within the system's control beyond dispatch.
- Organization size is a fixed enum with 5 bands: `1–10`, `11–50`, `51–200`, `201–1000`, `1000+`; no free-text entry is permitted.
- Each user belongs to exactly one organization in this version; multi-organization membership is out of scope.
- The user who creates an organization during onboarding is the sole owner; role-based access control within an organization is out of scope for this feature.
- API keys are long-lived credentials with no automatic expiration; manual revocation is the only lifecycle action in this version.
- The platform is accessed via a web browser; native mobile app support is out of scope for this feature.
- Email sending infrastructure is assumed to be available and configured in the deployment environment; selecting or configuring an email provider is not part of this feature.
- Dashboard KPI charts (FR-026, FR-027) depend on `API_KEY_USAGE_SUCCESS` and `API_KEY_USAGE_FAILURE` audit log events. These events are emitted by an external API gateway or consumer service when API keys are used to authenticate requests. This feature defines the event schema and chart rendering; the external event producer is out of scope.
