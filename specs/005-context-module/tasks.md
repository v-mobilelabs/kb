# Implementation Tasks: Context Module

**Feature**: 005-context-module  
**Created**: 2026-04-13  
**Dependency Graph**: Tasks ordered by prerequisites; parallelizable tasks marked with `→`

---

## Task Breakdown by Phase

### Phase 0: Infrastructure & Setup

**Objective**: Establish data models, permissions, and base queries  
**Dependencies**: None  
**Estimated**: 2 days

#### Task 0.1: Firestore Collection Setup

- **Description**: Create `/organizations/{orgId}/contexts` collection structure, indexes, and security rules
- **File**: `firestore.indexes.json`, `firestore.rules`
- **Subtasks**:
  - Define index: `orgId, updatedAt DESC` for list queries
  - Define index: `orgId, name` for name search (future)
  - Write security rules: org scoping, auth validation
  - Deploy rules to Firebase
- **Acceptance**: Rules deployed; can read/write from authenticated user in org; cannot cross-org access
- **Dependencies**: None

#### Task 0.2: RTDB Structure & Security Rules Setup

- **Description**: Create `/contexts/{contextId}/documents` paths and security rules; set up `/contextAccessControl` path for access grants
- **File**: `database.rules.json`
- **Subtasks**:
  - Define RTDB path structure: `/contexts/{contextId}/documents/{docId}`
  - Write rules: Verify org access via `/contextAccessControl/{userId}/{contextId}`
  - Write rules: Validate document structure (id, contextId, createdAt, updatedAt)
  - Deploy rules to Firebase
- **Acceptance**: Rules deployed; can read/write documents only if user has access grant; cannot bypass via direct path access
- **Dependencies**: Task 0.1

#### Task 0.3: Zod Validation Schemas

- **Description**: Create reusable Zod schemas for context and document validation
- **File**: `src/lib/schemas/context-schema.ts`
- **Subtasks**:
  - `contextInputSchema`: name (1-100 chars), windowSize (positive int | null)
  - `documentInputSchema`: name (optional), metadata (optional, any JSON)
  - `contextListFiltersSchema`: page, sort, direction, contextId
  - Export all schemas from module
- **Acceptance**: All schemas compile; can validate inputs without errors
- **Dependencies**: Task 0.1

#### Task 0.4: Server Action Stubs

- **Description**: Generate TypeScript stubs and export signatures for all context/document actions
- **File**: `src/actions/context-actions.ts`
- **Security**: `orgId` MUST NOT be accepted as a parameter in any action. All actions MUST obtain `orgId` internally from `withAuthenticatedContext()` (the same session-based middleware used across the platform, found in `src/lib/middleware/with-context.ts`). Client-supplied `orgId` values are untrusted and MUST be rejected.
- **Subtasks**:
  - `createContext(input)` → `Promise<Result<Context, AppError>>`
  - `getContext(contextId)` → `Promise<Result<Context, AppError>>`
  - `listContexts(filters)` → `Promise<Result<{items, hasNext, cursor}, AppError>>`
  - `updateContext(contextId, input)` → `Promise<Result<Context, AppError>>`
  - `deleteContext(contextId)` → `Promise<Result<{success: true}, AppError>>`
  - `createDocument(contextId, input)` → `Promise<Result<Document, AppError>>`
  - `getDocument(contextId, docId)` → `Promise<Result<Document, AppError>>`
  - `listDocuments(contextId, filters)` → `Promise<Result<{items, hasNext}, AppError>>`
  - `updateDocument(contextId, docId, input)` → `Promise<Result<Document, AppError>>`
  - `deleteDocument(contextId, docId)` → `Promise<Result<{success: true}, AppError>>`
- **Acceptance**: All functions exported with correct signatures; `orgId` sourced only from session; TypeScript compilation passes
- **Dependencies**: Task 0.3

---

### Phase 1: Context Lifecycle (P1 - User Story 1)

**Objective**: Implement context CRUD (create, list, read, update, delete) with transactions and conflict detection  
**Dependencies**: Phase 0 complete  
**Estimated**: 4 days

#### Task 1.1: Create Context (Server Action + Firestore Transaction)

- **Description**: Implement `createContext()` with transaction, RTDB initialization, and access grant
- **File**: `src/actions/context-actions.ts`, `functions/src/lib/context-service.ts`
- **Subtasks**:
  - Validate input: name (1-100), windowSize (positive int | null)
  - Firestore transaction:
    - Write `/organizations/{orgId}/contexts/{contextId}` doc
    - Increment documentCount = 0
    - Set createdBy, timestamps
  - RTDB initialization: Create `/contexts/{contextId}/documents` (empty path)
  - Access grant: Write to `/contextAccessControl/{userId}/{contextId}`
  - Return: `{id, name, windowSize, createdAt, documentCount}`
- **Acceptance**: Context created; appears in list; accessible from RTDB; user has read/write access
- **Dependencies**: Task 0.1, 0.2, 0.3, 0.4
- **Tags**: `server-action`, `transaction`, `firestore`, `rtdb`

#### Task 1.2→: List Contexts (Server Action + TanStack Query)

- **Description**: Implement `listContexts()` with pagination and sorting
- **File**: `src/actions/context-actions.ts`, `src/lib/query-keys.ts`, `src/lib/hooks/use-contexts.ts`
- **Subtasks**:
  - Server action: Query Firestore `/organizations/{orgId}/contexts` with:
    - Sort: `name (A→Z / Z→A) | createdAt (newest / oldest)`
    - Pagination: Cursor-based via `startAfter(sortValue, docId)`
    - Return: `{items, hasNext, cursor}`
  - Query key: `contexts.list(orgId, page, sort, direction)`
  - TanStack hook: `useContextList()` with options for sort/pagination
  - Error handling: 401 (org mismatch), 500 (query error)
- **Acceptance**: List loads; pagination works; sorting changes order; no data corruption
- **Dependencies**: Task 1.1
- **Parallel**: Can start while 1.1 completes
- **Tags**: `server-action`, `query`, `pagination`, `firestore`

#### Task 1.3: Get Context Detail (Server Action + TanStack Query)

- **Description**: Implement `getContext()` to fetch single context by ID
- **File**: `src/actions/context-actions.ts`, `src/lib/query-keys.ts`, `src/lib/hooks/use-context.ts`
- **Subtasks**:
  - Server action: Read from `Firestore /organizations/{orgId}/contexts/{contextId}`
  - Verify org scope + auth
  - Return: Full context doc
  - Error handling: 404 (not found), 401 (org mismatch)
  - TanStack hook: `useContextDetail()`
  - Query key: `contexts.detail(orgId, contextId)`
- **Acceptance**: Single context fetched; all fields populated; 404 on missing context
- **Dependencies**: Task 1.1
- **Parallel**: Can start while 1.1 completes
- **Tags**: `server-action`, `query`, `firestore`

#### Task 1.4: Update Context (Server Action + Conflict Detection)

- **Description**: Implement `updateContext()` with Firestore transaction + FR-019 conflict detection
- **File**: `src/actions/context-actions.ts`
- **Subtasks**:
  - `orgId` obtained from `withAuthenticatedContext()` — MUST NOT be a parameter
  - Input: `{name?: string, windowSize?: number}`
  - Firestore transaction:
    - Read current context (get current field values)
    - Validate input (name 1-100, windowSize positive int)
    - Update `/organizations/{orgId}/contexts/{contextId}` with new values + updatedAt
    - `createdBy` and `createdAt` MUST NOT be overwritten on update
    - If field has changed since transaction start, abort (conflict)
  - Return: `{id, name, windowSize, updatedAt}`
  - Error handling: 409 (conflict), 404 (not found), 400 (validation)
  - Client-side: On 409, show error toast + refresh prompt
- **Acceptance**: Update persists; conflict detection works; 409 error on concurrent edits; `createdBy`/`createdAt` unchanged
- **Dependencies**: Task 1.3
- **Tags**: `server-action`, `transaction`, `firestore`, `conflict-detection`

#### Task 1.5: Delete Context (Cascade Delete via Cloud Function)

- **Description**: Implement `deleteContext()` with transaction + async cascade via Cloud Function
- **File**: `src/actions/context-actions.ts`, `functions/src/triggers/on-context-deleted.ts`
- **Subtasks**:
  - Server action:
    - Firestore transaction: Delete `/organizations/{orgId}/contexts/{contextId}`
    - Trigger: Cloud Function `onContextDeleted()`
  - Cloud Function:
    - Delete all RTDB documents: `/contexts/{contextId}/documents/*`
    - Delete access grants: `/contextAccessControl/*/contextId`
    - Log completion
  - Error handling: 404 (not found), 401 (org mismatch)
  - Client-side: Show confirm dialog with doc count (FR-020); success toast
- **Acceptance**: Context deleted; all RTDB docs cleaned up; access grants revoked; success toast shown
- **Dependencies**: Task 1.1, 1.4
- **Tags**: `server-action`, `cloud-function`, `cascade-delete`, `rtdb`

#### Task 1.6→: Context CRUD Frontend Components

- **Description**: Build React components for context list, detail, create/edit forms
- **File**: `src/components/contexts/`, templates: `ContextList.tsx`, `ContextDetail.tsx`, `ContextForm.tsx`
- **Subtasks**:
  - `ContextList`: Display list with skeleton loaders (FR-020); sort/pagination controls; delete action with confirm
  - `ContextDetail`: Show context metadata; edit button; delete button
  - `ContextForm`: Input fields (name, windowSize); validation (FR-022); success/error toasts (FR-020)
  - All use TanStack Query hooks + mutations
- **Acceptance**: Components render; can create/view/edit/delete/list contexts; UI shows all metadata
- **Dependencies**: Task 1.2, 1.3, 1.4, 1.5
- **Parallel**: Can start while actions complete
- **Tags**: `frontend`, `react`, `components`, `form-validation`

---

### Phase 2: Context Window Configuration (P1 - User Story 2)

**Objective**: Implement window size management (FR-001, FR-002, FR-006)  
**Dependencies**: Phase 1 complete  
**Estimated**: 1 day

#### Task 2.1: Window Size Input Component

- **Description**: Create reusable input component for window size with validation
- **File**: `src/components/contexts/WindowSizeInput.tsx`
- **Subtasks**:
  - Input type: number; placeholder: "Enter token size (optional)"
  - Validation: positive integer only; show inline error if invalid
  - Clear button to unset (restore to null/unbounded)
  - Tooltip: "Maximum token limit for this context. Leave blank for no limit."
- **Acceptance**: Input accepts valid integers; rejects negative/zero/non-integer; displays inline errors
- **Dependencies**: Task 1.6
- **Tags**: `frontend`, `form`, `validation`

#### Task 2.2: Display Window Size in Lists & Details

- **Description**: Update context components to show window size prominently
- **File**: `src/components/contexts/ContextList.tsx`, `ContextDetail.tsx`
- **Subtasks**:
  - List: Add column for window size; show "Unbounded" if null
  - Detail: Display window size in metadata section
- **Acceptance**: Window size visible in all context views
- **Dependencies**: Task 2.1, 1.6
- **Tags**: `frontend`, `display`

#### Task 2.3: Edit Window Size

- **Description**: Allow updating window size in context detail/edit form
- **File**: `src/components/contexts/ContextForm.tsx`
- **Subtasks**:
  - Include WindowSizeInput in form
  - Reuse `updateContext()` mutation
  - Form validation (FR-022): blur + debounce
  - Conflict handling (FR-019): Show 409 error with refresh prompt
- **Acceptance**: Can edit window size; persists to Firestore; conflicts handled gracefully
- **Dependencies**: Task 2.1, 2.2, 1.4
- **Tags**: `frontend`, `form`, `mutation`

---

### Phase 3: Document Management (P2 - User Story 3)

**Objective**: Implement document CRUD within contexts (FR-009 to FR-013)  
**Dependencies**: Phase 1 complete  
**Estimated**: 3 days

#### Task 3.1: Create Document (Server Action + RTDB Write)

- **Description**: Implement `createDocument()` with RTDB write + Firestore count increment
- **File**: `src/actions/context-actions.ts`
- **Subtasks**:
  - Input: `{name?: string, metadata?: any}`
  - Generate docId (uuid)
  - RTDB write: `/contexts/{contextId}/documents/{docId}` with all fields
  - Firestore transaction: Increment `/organizations/{orgId}/contexts/{contextId}.documentCount`
  - Return: `{id, contextId, name, metadata, createdAt}`
  - Error handling: 401 (access denied), 400 (validation)
- **Acceptance**: Document created in RTDB; context count incremented; returned with all fields
- **Dependencies**: Phase 1 complete ($taskPhase1)
- **Tags**: `server-action`, `rtdb`, `firestore`, `transaction`

#### Task 3.2→: List Documents (Server Action with Sort/Filter)

- **Description**: Implement `listDocuments()` with pagination, sorting, and ID filtering
- **File**: `src/actions/context-actions.ts`, `src/lib/query-keys.ts`, hooks
- **Subtasks**:
  - Server action: **If `filterId` is provided** → call `getDocument(contextId, filterId)` directly via `ref.child(docId).get()` and return as a single-item array (FR-012 exact match; avoids unbounded full-collection RTDB read). **If no `filterId`** → query RTDB `/contexts/{contextId}/documents` with:
    - Sort: `id | name | createdAt | updatedAt` using `.orderByChild()` (ascending/descending)
    - Pagination: `.limitToFirst(pageSize + 1)` cursor-based (default 25)
  - Query key: `documents.list(contextId, page, sort, direction, filterId)`
  - TanStack hook: `useDocumentList()`
  - Return: `{items, hasNext}`
  - Error handling: 401 (access denied), 404 (context not found), 404 on filterId miss
- **Acceptance**: Documents listed with sort/filter/pagination all working; filterId lookup uses direct RTDB child read (not full scan); no data corruption
- **Dependencies**: Task 3.1
- **Parallel**: Can start while 3.1 completes
- **Tags**: `server-action`, `query`, `rtdb`, `pagination`

#### Task 3.3: Get Document Detail (Server Action)

- **Description**: Implement `getDocument()` to fetch single document from RTDB
- **File**: `src/actions/context-actions.ts`
- **Subtasks**:
  - Server action: Read from `RTDB /contexts/{contextId}/documents/{docId}`
  - Verify org/context access
  - Return: Full document record
  - Error handling: 404 (not found), 401 (access denied)
  - TanStack hook: `useDocumentDetail()`
- **Acceptance**: Single document fetched; all fields populated; 404 on missing
- **Dependencies**: Task 3.1
- **Parallel**: Can start while 3.1 completes
- **Tags**: `server-action`, `query`, `rtdb`

#### Task 3.4: Update Document (Server Action + RTDB Update)

- **Description**: Implement `updateDocument()` with RTDB update
- **File**: `src/actions/context-actions.ts`
- **Subtasks**:
  - Input: `{name?: string, metadata?: any}`
  - RTDB update: `/contexts/{contextId}/documents/{docId}` with new fields + `updatedAt` (Unix timestamp) — use `.update()` (patch), NOT `.set()` (replace)
  - `createdBy` and `createdAt` MUST NOT be overwritten on update (C4)
  - Return: Updated document
  - Error handling: 404 (not found), 401 (access denied)
  - **FR-019 scope**: FR-019 conflict detection (HTTP 409) applies to Firestore context metadata only (name, windowSize). RTDB document updates are last-write-wins (eventually consistent by design) — this is intentional and acceptable for document content edits.
- **Acceptance**: Document updated in RTDB; `createdBy`/`createdAt` fields unchanged; `updatedAt` updated; returned on completion
- **Dependencies**: Task 3.3
- **Tags**: `server-action`, `mutation`, `rtdb`

#### Task 3.5: Delete Document (Server Action + Cascade Count Update)

- **Description**: Implement `deleteDocument()` with RTDB delete + Firestore count decrement
- **File**: `src/actions/context-actions.ts`
- **Subtasks**:
  - RTDB delete: `/contexts/{contextId}/documents/{docId}`
  - Firestore transaction: Decrement `/organizations/{orgId}/contexts/{contextId}.documentCount`
  - Return: `{success: true}`
  - Error handling: 404 (not found), 401 (access denied)
- **Acceptance**: Document deleted from RTDB; context count decremented; no orphaned data
- **Dependencies**: Task 3.1, 3.4
- **Tags**: `server-action`, `mutation`, `rtdb`, `firestore`, `transaction`

#### Task 3.6→: Document CRUD Frontend Components

- **Description**: Build React components for document list, detail, create/edit forms
- **File**: `src/components/documents/`, templates: `DocumentList.tsx`, `DocumentDetail.tsx`, `DocumentForm.tsx`
- **Subtasks**:
  - `DocumentList`: Display list with skeleton loaders (FR-020); sort/filter/pagination; delete action with confirm
  - `DocumentDetail`: Show document metadata + raw metadata JSON; edit button
  - `DocumentForm`: Input fields (name, metadata JSON); validation (FR-022); toasts (FR-020)
  - All use TanStack Query hooks + mutations
- **Acceptance**: Components render; can create/view/edit/delete/list/filter/sort documents
- **Dependencies**: Task 3.2, 3.3, 3.4, 3.5
- **Parallel**: Can start while actions complete
- **Tags**: `frontend`, `react`, `components`, `form-validation`

---

### Phase 4: Resilience & Error Handling

**Objective**: Implement FR-019 (transactions/conflicts), FR-020 (feedback), FR-021 (retry), FR-022 (validation)  
**Dependencies**: Phase 1 & 3 complete  
**Estimated**: 2 days

#### Task 4.1: Mutation Wrapper with Auto-Retry (FR-021)

- **Description**: Create mutation wrapper with exponential backoff retry logic
- **File**: `src/lib/hooks/use-retry-mutation.ts`
- **Subtasks**:
  - Wrapper: Auto-retry failed mutations up to 3 times with 1s/2s/4s delays
  - **Spinner MUST remain visible from attempt 1 through the final (3rd) retry** — spinner must NOT disappear and reappear between retries
  - On attempts 1–3 failure: retry silently with spinner active (no toast yet)
  - **Only after all 3 retries exhausted**: dismiss spinner, show error toast with "Try again" button (manual retry triggers a fresh attempt)
  - Test: Simulate network failures, verify 3 retries occur before toast; spinner visible continuously throughout
- **Acceptance**: Mutations retry automatically; spinner is continuous from first attempt through last retry; toast appears ONLY after all 3 retries exhausted; "Try again" button triggers a fresh attempt
- **Dependencies**: Phase 1 & 3 complete
- **Tags**: `frontend`, `mutation`, `error-handling`, `resilience`

#### Task 4.2: Conflict Error Handler (FR-019)

- **Description**: Create mutation error handler for 409 conflict detection
- **File**: `src/lib/hooks/use-conflict-handler.ts`
- **Subtasks**:
  - On 409 error: Show error toast with message "Context updated from another tab. Please refresh."
  - Add "Refresh & Retry" button to toast
  - On refresh click: Invalidate TanStack query + retry mutation
  - Test: Concurrent edit from two tabs, verify conflict detection
- **Acceptance**: 409 error shown clearly; refresh + retry works; data is not silently overwritten
- **Dependencies**: Task 4.1
- **Tags**: `frontend`, `mutation`, `error-handling`, `transaction`

#### Task 4.3: Toast & Confirm Dialog Components (FR-020)

- **Description**: Create reusable toast and confirm dialog components with styling
- **File**: `src/components/feedback/Toast.tsx`, `ConfirmDialog.tsx`
- **Subtasks**:
  - Toast: success/error/info variants; auto-dismiss after 5s; manual close
  - Confirm dialog: Title, description, detail (e.g., "Delete 42 documents?"), confirm/cancel buttons
  - Danger intent styling (red) for destructive actions
- **Acceptance**: Toasts show correct messages; confirm dialogs display details; styling matches HeroUI
- **Dependencies**: None (can start independently)
- **Tags**: `frontend`, `component`, `ui`

#### Task 4.4: Form Validation Hook (FR-022)

- **Description**: Create hook for real-time validation with blur + debounce
- **File**: `src/lib/hooks/use-validated-form.ts`
- **Subtasks**:
  - Hook: Accepts Zod schema, field values
  - Validates on blur event + 500ms debounce on keystroke
  - Returns: `{errors, touched, isValid}`
  - Submit button remains enabled even if errors present (no lockout)
  - Inline error display below field
- **Acceptance**: Validation triggers correctly; errors shown at right times; no noise during typing
- **Dependencies**: Task 0.3 (Zod schemas)
- **Tags**: `frontend`, `form`, `validation`

#### Task 4.5: Integrate Error Handlers into Mutations

- **Description**: Apply auto-retry, conflict handling, and toasts to all mutations
- **File**: All mutation hooks in `src/lib/hooks/`
- **Subtasks**:
  - Apply `useRetryMutation()` wrapper to all mutations
  - Apply conflict handler to context update mutations (FR-019)
  - Add success/error toasts to all mutations (FR-020)
  - Add loading spinners to mutation triggers
- **Acceptance**: All mutations show loading states; errors show toasts with retry; success toasts appear
- **Dependencies**: Task 4.1, 4.2, 4.3
- **Tags**: `frontend`, `mutation`, `integration`

#### Task 4.6: Integration Tests for Error Handling

- **Description**: Write tests for all error paths (retry, conflict, validation)
- **File**: `tests/context-error-handling.test.ts`
- **Subtasks**:
  - Test auto-retry timing: Simulate network failure, verify delays are ~1s/2s/4s, all 3 retries attempted before toast
  - Test retry exhaustion: After 3 failures, verify toast shows exactly once with "Try again" button; spinner dismissed
  - Test spinner continuity: Spinner stays visible from attempt 1 through attempt 3 without flickering
  - Test conflict (concurrent tabs): Concurrent field edits from two tabs, verify 409 error + "Refresh & Retry" prompt (NOT auto-retry)
  - Test validation timing: Invalid inputs, verify errors shown on blur and after 500ms debounce (not on keystroke)
  - Test toasts: All operations show appropriate success/error feedback
- **Acceptance**: All tests passing; error paths verified
- **Dependencies**: Task 4.1, 4.2, 4.3, 4.4, 4.5
- **Tags**: `testing`, `integration`

---

### Phase 5: Organization Scoping & Security

**Objective**: Implement FR-014, FR-018 (org scoping, auditing, cross-org rejection)  
**Dependencies**: All phases complete  
**Estimated**: 1 day

#### Task 5.1: Server Action Organization Context

- **Description**: Audit all server actions to ensure org context flows correctly from the existing `withAuthenticatedContext()` middleware
- **File**: `src/lib/middleware/with-context.ts` (review), all action files in `src/actions/context-actions.ts`
- **Subtasks**:
  - Audit: Confirm all 10 context/document actions call `withAuthenticatedContext()` and extract `orgId` from session — NOT from action parameters
  - Verify: No action accepts `orgId` as a caller-supplied parameter (enforced by T0.4 definitions)
  - Verify: `withAuthenticatedContext()` throws 401 on missing/invalid session before any Firestore/RTDB query executes
  - Add audit fields: Confirm `createdBy`, `updatedAt` are stamped on all write operations (enforced by T1.4 and T3.4 guards)
- **Acceptance**: All 10 actions validated; `orgId` sourced only from session middleware; cross-org access rejected with 401; audit fields present on all writes
- **Dependencies**: All actions from Phase 1, 2, 3
- **Tags**: `server-action`, `security`, `org-scoping`

#### Task 5.2: Firestore Security Rules Verification

- **Description**: Write tests to verify Firestore rules prevent cross-org access
- **File**: `tests/firestore-security.test.ts`
- **Subtasks**:
  - Test: User from Org A cannot read Org B contexts
  - Test: User from Org A cannot write to Org B contexts
  - Test: Unauthenticated user cannot access any context
  - Test: Rules correctly extract orgId from auth context
- **Acceptance**: All security tests passing; cross-org rejection verified
- **Dependencies**: Task 0.1, 5.1
- **Tags**: `testing`, `security`, `firestore-rules`

#### Task 5.3: RTDB Security Rules Verification

- **Description**: Write tests to verify RTDB rules prevent unauthorized access
- **File**: `tests/rtdb-security.test.ts`
- **Subtasks**:
  - Test: User without access grant cannot read/write context documents
  - Test: After access grant, user can read/write
  - Test: After context deletion, access grant is removed
  - Test: Unauthenticated user cannot access any document
- **Acceptance**: All RTDB security tests passing; access control verified
- **Dependencies**: Task 0.2, 1.5, 5.1
- **Tags**: `testing`, `security`, `rtdb-rules`

#### Task 5.5: URL Query Parameter Sync (FR-017)

- **Description**: Persist active sort, filter, and pagination state in URL query params so context list and document list views are bookmarkable and shareable
- **File**: `src/app/(platform)/contexts/page.tsx`, `src/app/(platform)/contexts/[contextId]/page.tsx`, list client components
- **Subtasks**:
  - Context list: Read `sort`, `direction`, `cursor` from `useSearchParams` on mount; initialize TanStack Query with these values
  - Context list: On sort/direction change, call `router.push()` with updated params; reset `cursor` on sort change
  - Document list: Read `sort`, `direction`, `cursor`, `filterId` from `useSearchParams` on mount
  - Document list: On any filter/sort change, update URL params via `router.push()`; reset cursor
  - Verify: Refresh page with params → same view restored; share URL → org member sees same filtered view
- **Acceptance**: All list state (sort, direction, filter, cursor) round-trips through URL; page refresh restores exact view; param changes use `push` (not `replace`) to support browser back navigation
- **Dependencies**: Task 1.2, 1.6, 3.2, 3.6
- **Tags**: `frontend`, `url-state`, `router`

#### Task 5.4: Audit Logging

- **Description**: Add Cloud Logging for all context/document operations
- **File**: `src/lib/logging.ts` (enhance), Cloud Functions
- **Subtasks**:
  - Log all operations: create/read/update/delete for contexts and documents
  - Include: orgId, userId, action, timestamp, result (success/failure/error)
  - Route to Cloud Logging
  - Verify logs appear in Firebase Console
- **Acceptance**: All operations logged; logs include required fields; searchable in Cloud Logging
- **Dependencies**: Task 5.1
- **Tags**: `logging`, `audit`, `observability`

---

### Phase 6: Performance & Scale (Optional - Post-v1)

**Objective**: Optimize queries, caching, real-time subscriptions  
**Dependencies**: All phases complete  
**Estimated**: 2 days

#### Task 6.1: Query Optimization

- **Description**: Optimize Firestore and RTDB queries with indexes and constraints
- **File**: `firestore.indexes.json`, server actions
- **Subtasks**:
  - Firestore: Add composite indexes for multi-field queries if needed
  - RTDB: Use `.orderByChild()` for efficient document sorting
  - Implement cursor-based pagination for large result sets
  - Test: Measure query performance with 1K+ contexts/10K+ documents
- **Acceptance**: Queries return in < 1s (SC-005); indexes deployed
- **Dependencies**: Task 1.2, 3.2
- **Tags**: `performance`, `optimization`, `firestore`, `rtdb`

#### Task 6.2: TanStack Query Caching Strategy

- **Description**: Tune TanStack Query staleTime, gcTime for optimal cache behavior
- **File**: `src/lib/query-keys.ts`, query hooks
- **Subtasks**:
  - Set appropriate staleTime (e.g., 5 min for context list, 10 min for detail)
  - Configure gcTime (garbage collection)
  - Verify cache invalidation on mutations
  - Test: No unnecessary refetches; mutations update cache instantly
- **Acceptance**: Caching working correctly; list loads from cache when appropriate; mutations instant
- **Dependencies**: All query hooks
- **Tags**: `performance`, `caching`, `tanstack-query`

#### Task 6.3: Real-Time Document Subscriptions (Optional)

- **Description**: Implement RTDB listeners for live document updates across sessions
- **File**: `src/lib/hooks/use-realtime-documents.ts` (new)
- **Subtasks**:
  - Create hook: Subscribe to RTDB `/contexts/{contextId}/documents` with listener
  - Sync updates to TanStack Query cache
  - Auto-refresh document list on changes from other sessions
  - Handle cleanup on unmount
- **Acceptance**: Document changes from other sessions appear in real-time in current session
- **Dependencies**: Task 3.2 (document list)
- **Tags**: `performance`, `real-time`, `rtdb`, `subscriptions`

---

## Task Summary

| Phase       | Tasks                | Estimated    | Dependencies      |
| ----------- | -------------------- | ------------ | ----------------- |
| **Phase 0** | 4 tasks              | 2 days       | None              |
| **Phase 1** | 6 tasks (1 parallel) | 4 days       | Phase 0           |
| **Phase 2** | 3 tasks (1 parallel) | 1 day        | Phase 1           |
| **Phase 3** | 6 tasks (2 parallel) | 3 days       | Phase 1           |
| **Phase 4** | 6 tasks              | 2 days       | Phase 1, 3        |
| **Phase 5** | 4 tasks              | 1 day        | All phases        |
| **Phase 6** | 3 tasks (optional)   | 2 days       | All phases        |
| **TOTAL**   | **32 tasks**         | **~13 days** | Sequential phases |

## Parallelizable Tasks

- **Phase 0**: 0.1 → 0.2 → 0.3 / 0.4 (sequential due to dependencies)
- **Phase 1**: 1.2 & 1.3 → 1.4 & 1.6 (can parallelize independent actions)
- **Phase 2**: 2.2 & 2.3 (can parallelize)
- **Phase 3**: 3.2 & 3.3 (can parallelize after 3.1)
- **Phase 4**: 4.3 (can start independently)
- **Phase 5**: 5.2 & 5.3 (can parallelize)

**Critical Path**: Phase 0 → Phase 1 → Phase 3 → Phase 4 → Phase 5 (~13 days)

---

## Testing Checklist

- [ ] Phase 0 tests pass (schemas, stubs compile)
- [ ] Phase 1: CRUD operations work; list returns correct order; pagination works
- [ ] Phase 1: Firestore transaction conflict detected on concurrent edits (409)
- [ ] Phase 1: Cascade delete removes all RTDB documents
- [ ] Phase 2: Window size persists; displayed correctly
- [ ] Phase 3: Documents created/listed/updated/deleted correctly
- [ ] Phase 3: Document count increments/decrements with add/delete
- [ ] Phase 4: Auto-retry works (3 attempts, exponential backoff)
- [ ] Phase 4: Validation triggers at correct times (blur + debounce)
- [ ] Phase 5: Cross-org access rejected (Firestore + RTDB)
- [ ] Phase 5: Unauthenticated access rejected
- [ ] Phase 6 (optional): Real-time updates work across sessions
- [ ] Load test: 1K contexts, 10K documents, queries < 1s

---

## Deployment Checklist

- [ ] Firestore indexes deployed to Firebase
- [ ] Firestore security rules deployed
- [ ] RTDB structure created
- [ ] RTDB security rules deployed
- [ ] Cloud Functions deployed (cascade delete)
- [ ] Environment variables set (project ID, etc.)
- [ ] Logging configured in Cloud Logging
- [ ] Monitoring alerts set (if applicable)
- [ ] Documentation updated (API docs, setup guide)
