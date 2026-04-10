# Tasks: Auth, Onboarding & Core Platform

**Input**: Design documents from `/specs/001-auth-onboarding-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the spec — test tasks are omitted.

**Organization**: Tasks are grouped by user story (P1–P5) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Exact file paths included in descriptions

## Path Conventions

- **Project type**: Next.js full-stack App Router
- **Source root**: `src/`
- **Domain layer**: `src/data/`
- **Abstractions**: `src/lib/`
- **UI**: `src/components/`, `src/app/`
- **Actions**: `src/actions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and base configuration.

- [ ] T001 Initialize Next.js 16+ project with App Router, React 19, TypeScript 5.x, and install all dependencies (firebase, firebase-admin, @tanstack/react-query, heroui, tailwindcss, recharts, zod, @opentelemetry/api) in `package.json`
- [ ] T002 [P] Configure Tailwind CSS v4 with Hero UI v3+ plugin and base theme in `tailwind.config.ts`
- [ ] T003 [P] Create design tokens file with spacing, radii, and color theme rules (60-30-10) in `src/lib/tokens.ts`
- [ ] T004 [P] Create environment variable schema and `.env.local.example` with all Firebase + app config keys per quickstart.md
- [ ] T005 [P] Create Firestore index configuration in `firestore.indexes.json` with composite indexes for `auditLog (orgId, eventType, timestamp)` and `apiKeys (isRevoked, createdAt)`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core abstractions and infrastructure that MUST be complete before ANY user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement `Result<T, E>` type and `AppError` type in `src/lib/result.ts`
- [ ] T007 Implement Firebase Admin SDK singleton (Firestore + Auth) in `src/lib/firebase/admin.ts`
- [ ] T008 [P] Implement Firebase Client SDK singleton in `src/lib/firebase/client.ts`
- [ ] T009 Implement `AbstractFirebaseRepository<T>` abstract class with CRUD, filter, sort, search, cursor-based pagination, `count` (`getCountFromServer`), and `sum` (`getSumFromServer`) aggregate methods; support both top-level and subcollection paths with automatic org-scoping in `src/lib/abstractions/abstract-firebase-repository.ts`
- [ ] T010 Implement `BaseUseCase<TInput, TOutput>` abstract class with Zod schema validation and OpenTelemetry span tracing wrapping the abstract `handle()` method; returns `Result<TOutput, AppError>` in `src/lib/abstractions/base-use-case.ts`
- [ ] T011 Implement `withContext` HOC that reads session cookie via `cookies()`, verifies with `Admin.auth().verifySessionCookie()`, resolves user profile + orgId, and injects `AppContext { user, orgId, uid }` in `src/lib/middleware/with-context.ts`
- [ ] T012 [P] Implement `ReusableConfirmModal` component with `danger` color intent, configurable title/message/confirm-label, and dismiss/confirm callbacks using Hero UI Modal in `src/components/shared/reusable-confirm-modal.tsx`
- [ ] T013 [P] Create `AuditLogEntry` model and `AuditEventType` union type (including `API_KEY_USAGE_SUCCESS`, `API_KEY_USAGE_FAILURE` for external API usage events) in `src/data/organizations/models/audit-log-entry.model.ts`; implement `AuditLogRepository` extending `AbstractFirebaseRepository<AuditLogEntry>` for the `/auditLog/{logId}` collection in `src/data/organizations/repositories/audit-log-repository.ts`
- [ ] T014 [P] Create TanStack Query provider wrapper component and mount it in the root layout `src/app/layout.tsx`

**Checkpoint**: Foundation ready — `Result`, `AbstractFirebaseRepository`, `BaseUseCase`, `WithContext`, `ReusableConfirmModal`, and TanStack Query provider are all available. User story work can begin.

---

## Phase 3: User Story 1 — Magic Link Authentication (Priority: P1) 🎯 MVP

**Goal**: A visitor can sign in or sign up via email magic link and receive a valid session cookie. Authenticated users are redirected away from `/login`.

**Independent Test**: Open the app unauthenticated → enter email → receive magic link → click link → land on Dashboard authenticated.

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create `UserProfile` interface and `OrgSize` type in `src/data/auth/models/user-profile.model.ts`
- [ ] T016 [P] [US1] Create `SendMagicLinkDto` Zod schema (email validation) in `src/data/auth/dto/send-magic-link-dto.ts`
- [ ] T017 [US1] Implement `UserProfileRepository` extending `AbstractFirebaseRepository<UserProfile>` for `/profiles/{userId}` collection in `src/data/auth/repositories/user-profile-repository.ts`
- [ ] T018 [US1] Implement `SendMagicLinkUseCase` extending `BaseUseCase` — validates email, checks rate limit via audit log count query (≤5/hr per email), calls `sendSignInLinkToEmail`, writes `MAGIC_LINK_REQUEST` audit entry in `src/data/auth/use-cases/send-magic-link-use-case.ts`
- [ ] T019 [US1] Implement `sendMagicLinkAction` Server Action (pre-auth, no `withContext`) calling `SendMagicLinkUseCase` in `src/actions/auth-actions.ts`
- [ ] T020 [US1] Implement magic link callback API route — verify `oobCode`, exchange for ID token, mint `HttpOnly; Secure; SameSite=Lax` session cookie via `Admin.auth().createSessionCookie()`, check profile existence, write `MAGIC_LINK_REDEEMED` audit entry, redirect to `/dashboard` in `src/app/api/auth/callback/route.ts`
- [ ] T021 [US1] Build login page with email input, inline Zod validation, submit button calling `sendMagicLinkAction`, "Check your inbox" confirmation state, and redirect-if-authenticated guard in `src/app/(auth)/login/page.tsx`
- [ ] T022 [P] [US1] Create login page skeleton in `src/app/(auth)/login/loading.tsx`
- [ ] T023 [US1] Implement `(platform)` layout with auth guard — read session cookie, verify via `withContext`, redirect unauthenticated users to `/login`, pass user context to children in `src/app/(platform)/layout.tsx`

**Checkpoint**: Users can sign in/up via magic link and reach the authenticated platform layout. FR-001 through FR-006 satisfied.

---

## Phase 4: User Story 2 — New User Onboarding (Priority: P2)

**Goal**: First-time users see a blocking onboarding modal that collects display name, org name, and org size, creating their profile and organization.

**Independent Test**: Authenticate as new user → onboarding modal appears and is not dismissable → complete all fields → submit → profile and org exist in Firestore → Dashboard greets by name.

### Implementation for User Story 2

- [ ] T024 [P] [US2] Create `Organization` interface in `src/data/organizations/models/organization.model.ts`
- [ ] T025 [P] [US2] Create `CompleteOnboardingDto` Zod schema in `src/data/auth/dto/complete-onboarding-dto.ts`
- [ ] T026 [US2] Implement `OrganizationRepository` extending `AbstractFirebaseRepository<Organization>` for `/organizations/{orgId}` collection in `src/data/organizations/repositories/organization-repository.ts`
- [ ] T027 [US2] Implement `CompleteOnboardingUseCase` extending `BaseUseCase` — creates profile with `onboardingCompletedAt` timestamp, creates org linked to user, uses Firestore batch write, returns both records in `src/data/auth/use-cases/complete-onboarding-use-case.ts`
- [ ] T028 [US2] Implement `completeOnboardingAction` Server Action wrapped in `withContext` calling `CompleteOnboardingUseCase` in `src/actions/auth-actions.ts`
- [ ] T029 [US2] Build `OnboardingModal` client component — Hero UI Modal (non-dismissable: ESC disabled, no backdrop close), form fields for display name (min 2), org name (required), org size (dropdown with 5 bands), inline Zod validation, `useMutation` calling `completeOnboardingAction`, error retry with data preservation in `src/components/onboarding/onboarding-modal.tsx`
- [ ] T030 [US2] Integrate onboarding detection in `(platform)` layout — check `onboardingCompletedAt` on user profile; if null, render `OnboardingModal` overlay with `pointer-events-none` on background; unmount on successful submission in `src/app/(platform)/layout.tsx`

**Checkpoint**: Net-new users are gated by onboarding; returning users skip it. FR-007 through FR-010 satisfied.

---

## Phase 5: User Story 3 — Dashboard with Metrics & KPIs (Priority: P3)

**Goal**: Authenticated, onboarded users see a personalized Dashboard with total active keys KPI tile, key activity bar chart, and error bar chart.

**Independent Test**: Log in as onboarded user → Dashboard shows greeting with display name, KPI tile showing total active keys, activity bar chart, errors bar chart (empty states if no data), skeletons during load.

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create `GetDashboardMetricsDto` Zod schema (empty — org context from `WithContext`) in `src/data/organizations/dto/dashboard-metrics-dto.ts`
- [ ] T032 [US3] Implement `GetDashboardMetricsUseCase` extending `BaseUseCase` — uses `getCountFromServer` for active key count from `/organizations/{orgId}/apiKeys` (isRevoked == false), queries `auditLog` aggregates by day over last 30 days for activity and errors, returns `{ totalActiveKeys, keyActivity[], errors[] }` in `src/data/organizations/use-cases/get-dashboard-metrics-use-case.ts`
- [ ] T033 [US3] Implement `/api/dashboard/metrics` API route wrapped in `withContext` calling `GetDashboardMetricsUseCase` in `src/app/api/dashboard/metrics/route.ts`
- [ ] T034 [P] [US3] Build `KpiTile` reusable client component — displays a label + numeric value, supports loading state in `src/components/dashboard/kpi-tile.tsx`
- [ ] T035 [P] [US3] Build `KeyActivityChart` client component — Recharts `BarChart` with `ResponsiveContainer`, `XAxis` (date), `YAxis` (count), `Tooltip`, `Bar`; empty state with descriptive placeholder when data is empty in `src/components/dashboard/key-activity-chart.tsx`
- [ ] T036 [P] [US3] Build `ErrorActivityChart` client component — same Recharts setup as `KeyActivityChart`, filtered to error data; empty state with descriptive placeholder in `src/components/dashboard/error-activity-chart.tsx`
- [ ] T037 [US3] Build Dashboard page (SSR) — personalized greeting, TanStack Query `useQuery` with key `['dashboard-metrics', orgId]` fetching `/api/dashboard/metrics`, renders `KpiTile` + `KeyActivityChart` + `ErrorActivityChart`, protected by `(platform)` layout auth guard in `src/app/(platform)/dashboard/page.tsx`
- [ ] T038 [P] [US3] Create Dashboard skeleton matching exact layout of KPI tile + two bar chart containers (zero CLS) in `src/app/(platform)/dashboard/loading.tsx`

**Checkpoint**: Dashboard displays personalized greeting and all three metric widgets (or empty states). FR-011, FR-012, FR-025, FR-026, FR-027 satisfied.

---

## Phase 6: User Story 4 — Profile Management (Priority: P4)

**Goal**: Authenticated users can update their display name (with optimistic UI) and delete their account with cascade confirmation.

**Independent Test**: Navigate to Profile → update display name → see optimistic update → verify on Dashboard. Click Delete Account → dismiss → no deletion. Confirm deletion → session ends, redirected to login, Firestore records gone.

### Implementation for User Story 4

- [ ] T039 [P] [US4] Create `UpdateDisplayNameDto` Zod schema in `src/data/auth/dto/update-display-name-dto.ts`
- [ ] T040 [P] [US4] Create `DeleteAccountDto` Zod schema in `src/data/auth/dto/delete-account-dto.ts`
- [ ] T041 [US4] Implement `UpdateDisplayNameUseCase` extending `BaseUseCase` — validates input, updates `/profiles/{uid}.displayName` via `UserProfileRepository`, returns updated name in `src/data/auth/use-cases/update-display-name-use-case.ts`
- [ ] T042 [US4] Implement `DeleteAccountUseCase` extending `BaseUseCase` — writes `ACCOUNT_DELETED` audit entry, executes Firestore batched write to delete all apiKeys, org, profile, then calls `Admin.auth().deleteUser()`, clears session cookie in `src/data/auth/use-cases/delete-account-use-case.ts`
- [ ] T043 [US4] Implement `updateDisplayNameAction` Server Action wrapped in `withContext` calling `UpdateDisplayNameUseCase` in `src/actions/profile-actions.ts`
- [ ] T044 [US4] Implement `deleteAccountAction` Server Action wrapped in `withContext` calling `DeleteAccountUseCase` in `src/actions/profile-actions.ts`
- [ ] T045 [US4] Build Profile page (SSR) — display name in editable field with `useMutation` + optimistic update on save (TanStack Query key `['profile', uid]`), "Delete Account" button triggering `ReusableConfirmModal` with `danger` intent, `useMutation` calling `deleteAccountAction` on confirm, redirect to `/login` on success in `src/app/(platform)/profile/page.tsx`
- [ ] T046 [P] [US4] Create Profile page skeleton matching exact layout (zero CLS) in `src/app/(platform)/profile/loading.tsx`

**Checkpoint**: Profile page fully functional — display name updates with optimistic feedback, account deletion cascades correctly. FR-013 through FR-016 satisfied.

---

## Phase 7: User Story 5 — Organization Settings & API Key Management (Priority: P5)

**Goal**: Authenticated users can update their org name and manage API keys (create, list masked, revoke with confirmation) scoped to their organization.

**Independent Test**: Navigate to Settings → update org name → see optimistic update. Create API key → full key shown once. Navigate away and back → only masked value. Revoke key → confirm → removed from list, KPI decrements.

### Implementation for User Story 5

- [ ] T047 [P] [US5] Create `ApiKey` interface in `src/data/organizations/models/api-key.model.ts`
- [ ] T048 [P] [US5] Create `UpdateOrganizationDto` Zod schema in `src/data/organizations/dto/update-organization-dto.ts`
- [ ] T049 [P] [US5] Create `CreateApiKeyDto` Zod schema in `src/data/organizations/dto/create-api-key-dto.ts`
- [ ] T050 [P] [US5] Create `RevokeApiKeyDto` (aliased as `ApiKeyDto`) Zod schema in `src/data/organizations/dto/api-key-dto.ts`
- [ ] T051 [US5] Implement `ApiKeyRepository` extending `AbstractFirebaseRepository<ApiKey>` for `/organizations/{orgId}/apiKeys/{keyId}` subcollection with org-scoped queries in `src/data/organizations/repositories/api-key-repository.ts`
- [ ] T052 [US5] Implement `UpdateOrganizationUseCase` extending `BaseUseCase` — validates name, updates `/organizations/{orgId}` via `OrganizationRepository` in `src/data/organizations/use-cases/update-organization-use-case.ts`
- [ ] T053 [US5] Implement `CreateApiKeyUseCase` extending `BaseUseCase` — generates `cmo_` + 32 random chars via Web Crypto API, computes maskedKey, stores plaintext key in `/organizations/{orgId}/apiKeys/{keyId}`, writes `API_KEY_CREATED` audit entry, returns full key in `src/data/organizations/use-cases/create-api-key-use-case.ts`
- [ ] T054 [US5] Implement `ListApiKeysUseCase` extending `BaseUseCase` — queries active keys (isRevoked == false) from `ApiKeyRepository`, returns masked list in `src/data/organizations/use-cases/list-api-keys-use-case.ts`
- [ ] T055 [US5] Implement `RevokeApiKeyUseCase` extending `BaseUseCase` — verifies key belongs to ctx.orgId, sets `isRevoked: true` + `revokedAt`, writes `API_KEY_REVOKED` audit entry, idempotency guard for already-revoked in `src/data/organizations/use-cases/revoke-api-key-use-case.ts`
- [ ] T056 [US5] Implement `updateOrganizationAction` Server Action wrapped in `withContext` calling `UpdateOrganizationUseCase` in `src/actions/organization-actions.ts`
- [ ] T057 [US5] Implement `createApiKeyAction` Server Action wrapped in `withContext` calling `CreateApiKeyUseCase` in `src/actions/organization-actions.ts`
- [x] T058 [US5] Implement `revokeApiKeyAction` Server Action wrapped in `withContext` calling `RevokeApiKeyUseCase` in `src/actions/organization-actions.ts`
- [x] T059 [P] [US5] Build `ApiKeyCreateForm` client component — name input with Zod validation, `useMutation` calling `createApiKeyAction`, on success display full key in copyable field (shown once), append masked key to TanStack Query cache `['api-keys', orgId]` in `src/components/settings/api-key-create-form.tsx`
- [x] T060 [P] [US5] Build `ApiKeyList` client component — `useQuery` with key `['api-keys', orgId]`, renders masked keys with name + created date, "Revoke" button on each triggering `ReusableConfirmModal` with `danger` intent, `useMutation` with optimistic removal on confirm in `src/components/settings/api-key-list.tsx`
- [x] T061 [US5] Build Settings page (SSR) — org name in editable field with `useMutation` + optimistic update (TanStack Query key `['organization', orgId]`), API Keys section rendering `ApiKeyCreateForm` + `ApiKeyList`, protected by `(platform)` layout in `src/app/(platform)/settings/page.tsx`
- [x] T062 [P] [US5] Create Settings page skeleton matching exact layout of org name field + API key list table (zero CLS) in `src/app/(platform)/settings/loading.tsx`

**Checkpoint**: Settings fully functional — org name editable, API keys creatable/listable/revocable with org isolation. FR-017 through FR-024 satisfied.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [x] T063 Add Next.js `middleware.ts` route guard — redirect unauthenticated users from `/(platform)/*` to `/login` and authenticated users from `/(auth)/*` to `/dashboard` (thin cookie presence check) in `src/middleware.ts`
- [x] T064 [P] Add `error.tsx` error boundary components for each route group — `(auth)` and `(platform)` — rendering user-friendly error UI with retry in `src/app/(auth)/error.tsx` and `src/app/(platform)/error.tsx`
- [x] T065 [P] Add navigation sidebar/header to `(platform)` layout with links to Dashboard, Profile, and Settings; include user display name and sign-out button in `src/app/(platform)/layout.tsx`
- [x] T066 Run quickstart.md end-to-end validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 / P1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 / P2 (Phase 4)**: Depends on Phase 3 (needs UserProfileRepository + platform layout auth guard)
- **User Story 3 / P3 (Phase 5)**: Depends on Phase 4 (needs onboarding gate to be in place); also needs audit log infrastructure from Phase 2
- **User Story 4 / P4 (Phase 6)**: Depends on Phase 4 (needs UserProfileRepository + profile); can run in parallel with Phase 5
- **User Story 5 / P5 (Phase 7)**: Depends on Phase 4 (needs OrganizationRepository + org record); can run in parallel with Phase 5 and 6
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — this IS the MVP
- **US2 (P2)**: Depends on US1 (needs auth flow + platform layout)
- **US3 (P3)**: Depends on US2 (needs onboarding + org context for metrics), also uses audit log
- **US4 (P4)**: Depends on US2 (needs profile record); independent of US3 and US5
- **US5 (P5)**: Depends on US2 (needs org record); independent of US3 and US4

### Within Each User Story

- DTOs / Models before Repositories
- Repositories before Use Cases
- Use Cases before Server Actions / API Routes
- Server Actions before UI Components / Pages
- Pages + Skeletons can parallel after Actions

### Parallel Opportunities

**Phase 1**: T002, T003, T004, T005 can all run in parallel after T001
**Phase 2**: T008, T012, T013, T014 can run in parallel; T009 + T010 can parallel with each other (both need T006 + T007)
**Phase 3**: T015 + T016 in parallel; T022 in parallel with T021
**Phase 4**: T024 + T025 in parallel
**Phase 5**: T031, T034, T035, T036 all in parallel; T038 in parallel with T037
**Phase 6**: T039 + T040 in parallel; T046 in parallel with T045
**Phase 7**: T047–T050 all in parallel; T059 + T060 in parallel; T062 in parallel with T061
**Phase 8**: T063, T064, T065 can all run in parallel

After Phase 4 completes, Phases 5, 6, and 7 can run in parallel if staffed.

---

## Implementation Strategy

### MVP (Recommended first delivery)

Phases 1 + 2 + 3 + 4 = **User Story 1 (Magic Link Auth) + User Story 2 (Onboarding)**.
This provides a usable platform where users can authenticate and have their org context established.

### Incremental additions (after MVP)

- **Phase 5 (US3)**: Add Dashboard KPIs and charts — gives operational visibility
- **Phase 6 (US4)**: Add Profile (name update + account deletion) — privacy compliance
- **Phase 7 (US5)**: Add Settings + API Key management — enables integrations
- **Phase 8**: Polish — middleware, error boundaries, navigation
