# Implementation Plan: Context Module

**Feature Branch**: `005-context-module`  
**Created**: 2026-04-13  
**Status**: Active  
**Target**: Next.js 16+ App Router + Cloud Functions v2 + Firestore + RTDB

---

## Executive Summary

The Context Module enables organization-scoped management of conversation contexts with configurable token windows and document collections. Contexts are persisted in **Firestore** (org-scoped), while context documents are stored in **Realtime Database** (context ID-scoped) for granular access control and real-time synchronization. This hybrid approach provides:

- **Consistency**: Firestore transactions for atomic context operations and conflict detection
- **Real-time Access**: RTDB for efficient document streaming within contexts
- **Scalability**: Separate databases allow independent scaling per access pattern
- **Security**: Organization-scoped Firestore collection + context-scoped RTDB paths

---

## Technical Context

### Active Technologies

- **Frontend**: TypeScript 5.x, Next.js 16+ App Router, React 19, TanStack Query v5, HeroUI v3+, Tailwind CSS v4
- **Backend**: Cloud Functions v2 (Node.js 22), Firebase Admin SDK
- **Databases**:
  - **Firestore**: Contexts collection (org-scoped, with transactions for conflict handling)
  - **RTDB**: Context documents (context ID-scoped paths with security rules)
- **APIs**: Server Actions, TanStack Query mutations, Firestore transactions (FR-019)
- **State Management**: TanStack Query for server state, React hooks for local UI state
- **Validation**: Zod for schema validation (FR-022 form validation)

### Key Decisions

1. **Hybrid Database Strategy**:
   - **Firestore** (`/organizations/{orgId}/contexts/{contextId}`): Context metadata (name, window size, timestamps, document count)
   - **RTDB** (`/contexts/{contextId}/documents/`): Context documents (real-time, subscriptions-friendly)
   - **Rationale**: Firestore transactions for atomic context operations; RTDB for low-latency document access and real-time streams

2. **Concurrent Edit Handling** (FR-019):
   - Firestore transactions with read-committed isolation
   - Optimistic update in client; conflict detection on server
   - HTTP 409 response on conflict; explicit client refresh

3. **Security Scoping**:
   - Firestore: Organization ID in path + rules enforce org context from session
   - RTDB: Context ID in path + rules verify org membership before granting access

4. **State Management**:
   - TanStack Query for server-side pagination, filtering, sorting
   - React hooks for form state (context creation/editing)
   - Optimistic updates in mutation handlers

---

## Data Model

### Firestore Collection: `/organizations/{orgId}/contexts/{contextId}`

```
Context Document {
  id: string;                     // auto-generated Firestore doc ID
  orgId: string;                  // from session context
  name: string;                   // 1-100 chars, not unique per org
  windowSize: number | null;      // optional; any positive integer
  documentCount: number;          // denormalized count; incremented on doc add
  createdAt: Timestamp;           // server timestamp
  updatedAt: Timestamp;           // server timestamp
  createdBy: string;              // user ID for audit trail
  metadata?: {
    description?: string;         // future: optional context description
  };
}
```

**Indexes**:

- `orgId, updatedAt DESC` (for list queries with sorting)
- `orgId, name` (for future name-based search)
- `orgId, documentCount DESC` (for filtering by item count)

**Security Rules**:

```
match /organizations/{orgId}/contexts/{contextId} {
  allow read: if request.auth != null &&
              request.auth.customClaims.orgId == orgId;
  allow create: if request.auth != null &&
                request.resource.data.orgId == orgId &&
                request.auth.customClaims.orgId == orgId &&
                request.resource.data.name.size() > 0 &&
                request.resource.data.name.size() <= 100;
  allow update: if request.auth != null &&
                resource.data.orgId == orgId &&
                request.auth.customClaims.orgId == orgId;
  allow delete: if request.auth != null &&
                resource.data.orgId == orgId &&
                request.auth.customClaims.orgId == orgId;
}
```

### Realtime Database Path: `/contexts/{contextId}/documents/{docId}`

```
Document Record {
  id: string;                     // auto-generated ID (uuid)
  contextId: string;              // parent context ref
  name: string;                   // optional; user-provided identifier
  metadata?: any;                 // flexible JSON structure
  createdAt: number;              // Unix timestamp (RTDB native)
  updatedAt: number;              // Unix timestamp
  createdBy: string;              // user ID for audit
}
```

**Path Structure**:

```
/contexts/{contextId}/
  documents/
    {docId}/
      id: docId
      name: "conversation-turn-1"
      metadata: { role: "user", content: "..." }
      createdAt: 1713018000
      updatedAt: 1713018000
      createdBy: "user123"
```

**Security Rules** (RTDB):

```json
{
  "rules": {
    "contexts": {
      "{contextId}": {
        ".read": "root.child('contextAccessControl').child(auth.uid).child($contextId).exists()",
        ".write": "root.child('contextAccessControl').child(auth.uid).child($contextId).exists()",
        "documents": {
          "{docId}": {
            ".validate": "newData.hasChildren(['id', 'contextId', 'createdAt', 'updatedAt'])",
            "id": { ".validate": "newData.val() == $docId" },
            "contextId": { ".validate": "newData.val() == $contextId" }
          }
        }
      }
    },
    "contextAccessControl": {
      "{userId}": {
        "{contextId}": { ".validate": true }
      }
    }
  }
}
```

**Note**: Context access control is maintained via a separate `/contextAccessControl/{userId}/{contextId}` path. When a context is created or accessed, write a token to this path to grant the user access. On context deletion, clean up this path.

---

## API Design

### Server Actions (Next.js App Router)

#### Context Operations

**`createContext(orgId, input)`**

- Input: `{ name: string; windowSize?: number }`
- Returns: `{ id, name, windowSize, createdAt, documentCount }`
- Implementation: Firestore transaction, creates context doc and initializes RTDB path
- Error handling: Validation error (400), conflict error (409), auth error (401)

**`getContext(orgId, contextId)`**

- Returns: Full context metadata
- Implementation: Firestore document read
- Error: 404 if not found, 401 if org mismatch

**`listContexts(orgId, { page, pageSize, sort, direction })`**

- Pagination: Cursor-based via `startAfter(sortValue, docId)`
- Sort options: `name | createdAt` (default: `createdAt DESC`)
- Returns: `{ items: Context[], hasNext: boolean, cursor: string }`
- Implementation: TanStack Query hook with Firestore query

**`updateContext(orgId, contextId, input)`**

- Input: `{ name?: string; windowSize?: number }`
- Implementation: Firestore transaction with conflict detection (FR-019)
- Returns: Updated context doc
- Error: 409 on conflict (field changed since read), retry with refresh

**`deleteContext(orgId, contextId)`**

- Implementation: Firestore transaction (delete context + denormalized fields) + Cloud Function to cascade-delete RTDB documents
- Returns: `{ success: true }`
- Error: 404 if not found

#### Document Operations

**`createDocument(orgId, contextId, input)`**

- Input: `{ name?: string; metadata?: Record<string, any> }`
- Implementation:
  1. Write to RTDB: `/contexts/{contextId}/documents/{docId}`
  2. Increment context `documentCount` in Firestore transaction
- Returns: `{ id, contextId, name, metadata, createdAt }`
- Error: 401 if org/context access denied

**`listDocuments(orgId, contextId, { page, pageSize, sort, direction, filterId })`**

- Pagination: `pageSize` (default 25) via array slice in RTDB
- Sort options: `id | name | createdAt | updatedAt`
- Filter: `filterId` for exact match (FR-012)
- Implementation:
  1. Query RTDB `/contexts/{contextId}/documents` with sorting/filtering
  2. Apply pagination on client side (RTDB order-by + limit)
- Returns: `{ items: Document[], hasNext: boolean }`
- Error: 401 if context access denied

**`getDocument(orgId, contextId, docId)`**

- Returns: Full document record from RTDB
- Implementation: Direct RTDB read
- Error: 404 if not found, 401 if access denied

**`updateDocument(orgId, contextId, docId, input)`**

- Input: `{ name?: string; metadata?: Record<string, any> }`
- Implementation: RTDB update (optimistic; no transaction needed at RTDB level)
- Returns: Updated document
- Error: 404 if not found

**`deleteDocument(orgId, contextId, docId)`**

- Implementation:
  1. Delete from RTDB: `/contexts/{contextId}/documents/{docId}`
  2. Decrement context `documentCount` in Firestore transaction
- Returns: `{ success: true }`
- Error: 404 if not found

---

## Client Architecture

### Query Structure (TanStack Query v5)

```typescript
// Context Queries
useContextList({ orgId, page, sort, direction })
  → key: ['contexts', orgId, page, sort, direction]

useContextDetail({ orgId, contextId })
  → key: ['contexts', orgId, contextId]

// Document Queries
useDocumentList({ orgId, contextId, page, sort, direction, filterId })
  → key: ['documents', contextId, page, sort, direction, filterId]

useDocumentDetail({ orgId, contextId, docId })
  → key: ['documents', contextId, docId]
```

### Mutation Handlers (with optimistic updates + FR-020/FR-021/FR-022)

**Context Mutations**:

- `useMutateCreateContext`: Optimistic add to list; on conflict (409), show error toast with refresh prompt
- `useMutateUpdateContext`: Optimistic update to detail; on conflict, show 409 error; auto-retry (FR-021)
- `useMutateDeleteContext`: Confirm dialog (FR-020) showing doc count; optimistic remove; show success toast
- `useMutateDeleteContext`: Auto-retry on network failure (FR-021)

**Document Mutations**:

- `useMutateCreateDocument`: Optimistic add with loading spinner; auto-retry on failure
- `useMutateUpdateDocument`: Optimistic update; inline errors
- `useMutateDeleteDocument`: Confirm dialog; cascade decrement context count

### Form Components (with FR-022 validation)

```typescript
// ContextForm.tsx
- Real-time validation on blur + 500ms debounce
- Inline error messages below fields
- Submit button always enabled
- Success/error toasts on submit

// DocumentForm.tsx
- Same validation pattern as ContextForm
- Metadata field supports arbitrary JSON (with JSONEditor)
```

### List Components (with FR-020 feedback)

```typescript
// ContextList.tsx
- Skeleton loaders during load (FR-020)
- Sort dropdown + pagination controls
- Detail row shows: name, window size, doc count, updated date
- Delete action: confirm dialog (FR-020) with doc count
- Success/error toasts (FR-020)

// DocumentList.tsx
- Similar structure for documents
- Sort by: id | name | createdAt | updatedAt
- Filter by docId (exact match, FR-012)
```

---

## Implementation Phases

### Phase 0: Infrastructure & Setup

**Objective**: Establish data models, permissions, and base queries

**Tasks**:

1. **Firestore Setup**
   - Create `/organizations/{orgId}/contexts` collection
   - Define Firestore indexes (`orgId, updatedAt DESC` etc.)
   - Write security rules (org scoping, auth validation)

2. **RTDB Setup**
   - Create `/contexts/{contextId}/documents` paths with structure
   - Write RTDB security rules (context access control validation)
   - Set up `/contextAccessControl/{userId}/{contextId}` path

3. **Zod Schemas**
   - `contextInputSchema`: name (1-100), windowSize (positive int | null)
   - `documentInputSchema`: name (optional), metadata (optional)
   - `contextListFiltersSchema`: page, sort, direction, contextId

4. **Server Action Stubs**
   - Generate TypeScript stubs for all server actions (context + document operations)
   - Export from `src/actions/context-actions.ts`

**Deliverables**: Firestore/RTDB paths configured; security rules deployed; base action signatures

---

### Phase 1: Context Lifecycle (P1 - User Story 1)

**Objective**: Implement FR-001 to FR-008 (context CRUD, transactions, cascade delete)

**Tasks**:

1. **Context Creation** (FR-001, FR-002)
   - `createContext()` server action with transaction + window size validation
   - Firestore doc write
   - Initialize RTDB `/contexts/{contextId}/documents` path (empty)
   - Grant user RTDB access via `/contextAccessControl/{userId}/{contextId}`

2. **Context List** (FR-003, FR-004)
   - `listContexts()` server action with pagination + sort (name, createdAt)
   - TanStack Query hook: `useContextList()`
   - Frontend: Skeleton loaders (FR-020), sort controls, pagination

3. **Context Detail** (FR-005)
   - `getContext()` server action
   - TanStack Query hook: `useContextDetail()`
   - Detail view showing all metadata

4. **Context Update** (FR-006)
   - `updateContext()` server action with Firestore transaction + conflict detection (FR-019)
   - Mutation hook with optimistic update
   - Form validation (FR-022): blur + debounce, inline errors
   - Conflict error handling: Show 409 error, prompt refresh

5. **Context Delete & Cascade** (FR-007, FR-008)
   - `deleteContext()` server action with transaction + Cloud Function
   - Confirm dialog showing doc count to delete (FR-020)
   - Success toast on completion (FR-020)
   - Auto-retry on network failure (FR-021)
   - Cloud Function: `onContextDeleted()` cleans up RTDB + `/contextAccessControl`

**Deliverables**: Context CRUD fully functional; transactions working; users can create/list/update/delete contexts

---

### Phase 2: Context Window Configuration (P1 - User Story 2)

**Objective**: Implement FR-001-002, FR-006 (window size management)

**Tasks**:

1. **Window Size Input Component**
   - Component: accepts optional positive integer
   - Client validation: form (FR-022), ≥1
   - Real-time error feedback

2. **Window Size Persistence**
   - Server: `createContext()` + `updateContext()` handle window size
   - Firestore: Store in context doc
   - Frontend: Display in context card + detail view

3. **Update Window Size**
   - Edit form in detail page
   - Form validation (FR-022): blur + debounce
   - Conflict handling on save (FR-019)

**Deliverables**: Window size configurable on create/edit; displayed in lists/details

---

### Phase 3: Document Management (P2 - User Story 3)

**Objective**: Implement FR-009 to FR-013 (document CRUD within context)

**Tasks**:

1. **Create Document** (FR-009)
   - `createDocument()` server action
   - RTDB write + Firestore `documentCount` increment (transaction)
   - Mutation: optimistic add to list
   - Loading spinner during mutation (FR-020)

2. **Document List** (FR-010, FR-011)
   - `listDocuments()` server action with pagination + sort (id, name, createdAt, updatedAt)
   - Filtering by docId (exact match, FR-012)
   - TanStack Query hook: `useDocumentList()`
   - Frontend: Skeleton loaders, sort/filter controls (FR-020)

3. **Document Detail** (FR-009, FR-010)
   - `getDocument()` server action
   - TanStack Query hook: `useDocumentDetail()`
   - Display full document with metadata

4. **Update Document** (via FR-009)
   - `updateDocument()` server action
   - RTDB update (no transaction needed; RTDB is eventually consistent)
   - Mutation: optimistic update
   - Form validation (FR-022)

5. **Delete Document** (FR-013)
   - `deleteDocument()` server action
   - RTDB delete + Firestore `documentCount` decrement (transaction)
   - Confirm dialog (FR-020)
   - Success toast (FR-020)
   - Auto-retry on failure (FR-021)

**Deliverables**: Full document CRUD in context; list/detail views; pagination/sort/filter working

---

### Phase 4: Resilience & Error Handling (Cross-Cutting)

**Objective**: Implement FR-019 (transactions), FR-020 (feedback), FR-021 (retry), FR-022 (validation)

**Tasks**:

1. **Transaction Error Handling** (FR-019)
   - Firestore transaction wrapper catching conflict errors (409)
   - Client mutation interceptor: on 409, show error toast with "refresh and retry" action
   - Test: Concurrent edit from two tabs, verify conflict detection

2. **Async Feedback & Confirmations** (FR-020)
   - Toast component: success/error + dismissible
   - Confirm dialog component: Shows delete details (e.g., "Delete context + 42 docs?")
   - Skeleton loaders in context/document lists
   - Progress bars for long-running operations (if any)

3. **Auto-Retry Logic** (FR-021)
   - Mutation wrapper: Auto-retry up to 3 times with 1s/2s/4s backoff
   - Show spinner during retries
   - After exhaustion, show error with manual retry button
   - Test: Simulate network failure, verify retry and recovery

4. **Form Validation Timing** (FR-022)
   - Zod + custom hook: `useValidatedForm(schema)`
   - Validation on blur + 500ms debounce
   - Submit button always enabled (no lockout)
   - Inline error display
   - Test: Form shows errors at right times, no noise

**Deliverables**: All error handling + resilience + UX feedback fully functioning; tested with simulated failures

---

### Phase 5: Organization Scoping & Security (Cross-Cutting)

**Objective**: Implement FR-014, FR-018 (org scoping, auditing)

**Tasks**:

1. **Server Action Org Context**
   - `withContext()` middleware in server actions
   - Extract orgId from session + validate
   - Pass orgId to all Firestore/RTDB queries
   - Audit trail: createdBy, updatedAt on all operations

2. **Firestore Rules Verification**
   - Test: User from Org A cannot read/write Org B contexts
   - Test: Unauthenticated user cannot access any context

3. **RTDB Rules Verification**
   - Test: User cannot write to `/contexts/{contextId}/documents` without access grant
   - Test: Deleting context removes access from `/contextAccessControl`

4. **Audit Logging**
   - Log all context/document operations to Cloud Logging
   - Include orgId, userId, action, timestamp, result

**Deliverables**: Full org isolation verified; no cross-org data leakage

---

### Phase 6: Performance & Scale (Optional - Post-v1)

**Objective**: Optimize queries, caching, real-time subscriptions

**Tasks**:

1. **Query Optimization**
   - RTDB orders: Use `.orderByChild()` for document sort
   - Firestore: Use indexes for multi-field queries
   - Implement cursor-based pagination for large result sets

2. **Caching Strategy**
   - TanStack Query staleTime + gcTime tuning
   - Cache invalidation on mutations

3. **Real-Time Subscriptions (Optional)**
   - Subscribe to document changes via RTDB listeners
   - Auto-refresh document list on changes from other sessions

**Deliverables**: Optimized queries; fast list loads (< 1s, SC-005)

---

## Integration Points

### Existing Modules

- **Auth Module** (001-auth-onboarding-platform):
  - Rely on session cookie + `withContext()` for orgId extraction
  - Session validation for all server actions
- **Store Module** (002-store-module):
  - Similar org scoping pattern; reuse organizational isolation approach
  - No direct integration; parallel features

### New Dependencies

- **TanStack Query v5**: Already active (per copilot-instructions.md)
- **Zod**: Already active; leverage for context/document validation
- **HeroUI v3+**: For form components, tooltips, confirm dialogs
- **Cloud Functions v2**: For cascade-delete on context removal

---

## Success Metrics (from Spec)

- **SC-001**: Create context in < 5s ✓ (Firestore transaction)
- **SC-002**: Retrieve context by ID in < 1s ✓ (RTDB direct read)
- **SC-003**: Create/retrieve/delete document without leaving detail page ✓ (client-side mutations)
- **SC-004**: Cascade delete < 10s for 500 docs ✓ (RTDB bulk delete via Cloud Function)
- **SC-005**: First page load < 1s; filter/sort < 500ms ✓ (TanStack Query + indexed queries)
- **SC-006**: 100% cross-org rejection ✓ (Firestore/RTDB rules enforcement)
- **SC-007**: Window size immediately reflected ✓ (optimistic updates)

---

## Risks & Mitigations

| Risk                                                           | Impact | Mitigation                                                                                     |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Firestore transaction contention under high concurrent edits   | P2     | Implement exponential backoff in client; retry (FR-021); monitor transaction conflicts in logs |
| RTDB path size limits for large document collections           | P1     | Implement pagination at file level (500 docs/page); test with 1000+ docs before scale          |
| Sync issues between Firestore context count + actual RTDB docs | P1     | Cloud Function reconciliation job (periodic); consistency check on context open                |
| User loses edits due to conflict (409 error)                   | P2     | Clear error message + refresh prompt; consider save draft to localStorage                      |
| Mobile network resilience (slow/drop during mutation)          | P2     | Auto-retry (FR-021) + offline queue (future)                                                   |

---

## Timeline Estimate

- **Phase 0** (Infrastructure): 2 days
- **Phase 1** (Context CRUD): 4 days
- **Phase 2** (Window Config): 1 day
- **Phase 3** (Document CRUD): 3 days
- **Phase 4** (Error Handling & Resilience): 2 days
- **Phase 5** (Security & Org Scoping): 1 day
- **Phase 6** (Performance): 2 days (optional, post-v1)

**Total**: ~13 days (excluding Phase 6)

---

## Deliverables Checklist

- [ ] Firestore `/organizations/{orgId}/contexts` collection with indexes + rules
- [ ] RTDB `/contexts/{contextId}/documents` paths with rules
- [ ] 10 server actions (create/list/get/update/delete × context/document) + delete cascade
- [ ] TanStack Query hooks for context/document CRUD
- [ ] React components for context & document management UI
- [ ] Form validation (Zod + FR-022 timing)
- [ ] Error handling (FR-019 conflicts, FR-021 retries, FR-020 feedback)
- [ ] Organization scoping & security verification
- [ ] Integration tests: concurrent edits, cascade delete, org isolation
- [ ] Performance tests: list load times, sort/filter performance
- [ ] Audit logging for all operations
