# Implementation Plan: Memory Module

**Feature Branch**: `003-memory-module`  
**Status**: Planning Phase  
**Created**: 2026-04-11

## Technical Context

### Technology Stack

**Frontend**:

- Next.js 16+ App Router (React 19)
- TanStack Query v5 (data fetching, caching, synchronization)
- Client-side Suspense + streaming for progressive data rendering
- HeroUI v3+ (components)
- Tailwind CSS v4

**Backend**:

- Next.js API Routes (v16+ Cloud Functions v2, Node.js 22)
- Firebase Admin SDK (Firestore, Auth context)
- LangGraph.js (memory condensation worker agent)
- `@google-cloud/vertexai` (Gemini for summarization)

**Data**:

- Firestore (memories, documents, condensation summaries)
- Cursor-based pagination via `startAfter(sortValue, docId)` pattern

### Dependencies & Integration Points

- **Auth**: Existing `withContext` pattern for org scoping
- **Store Module**: FR-002 pattern (list views, pagination, search/sort)
- **LangGraph**: Already integrated for workflow orchestration; will use for condensation agent
- **Gemini API**: Text summarization for condensation

---

## Constitution Check

**Project Principles** (from `.specify/memory/constitution.md`):

- ✅ Organisation-scoped multi-tenancy enforced at data access layer
- ✅ Cursor-based pagination matching established Store module patterns
- ✅ TypeScript 5.x strict mode, Zod validation for all request/response DTOs
- ✅ Cloud Functions v2 with proper transaction handling
- ✅ Graceful error handling with user-friendly messaging

**Architectural Constraints**:

- ✅ No public API; all routes require authenticated session
- ✅ Data isolation verified in all list queries (orgId filter + auth middleware)
- ✅ Atomic operations for capacity management via Firestore transactions

---

## Phase 0: Research & Dependency Validation

### Research Tasks

- [ ] **LangGraph Worker Agent Pattern** — Design memory condensation workflow using LangGraph.js; map state machine for FIFO eviction + summarization trigger
- [ ] **Gemini Summarization Integration** — Validate Gemini 3.1 Flash for multi-document summarization; confirm token limits for 10-document inputs
- [ ] **Session ID Tracking Strategy** — Clarify session_id scope (per-user session? per-browser session? or correlation ID?); determine if already available via auth context
- [ ] **TanStack Query + Streaming Patterns** — Research streaming JSON with TanStack Query; best practices for progressive list loading with cursor pagination
- [ ] **Firestore Transaction Limits** — Validate atomic transaction capacity for: (document creation + capacity check + FIFO eviction + documentCount update) and (condensation summary + 10 doc deletions + new doc insertion)

### Dependency Validation Checklist

- [ ] LangGraph.js supports Node.js 22
- [ ] Gemini API scoped correctly in Cloud Functions service account
- [ ] TanStack Query v5 compatible with React 19 Suspense boundaries
- [ ] Firestore batch write limits accommodate condensation workflow (max 500 writes)

---

## Phase 1: Design & Contracts

### 1a. Data Model Refinement

**Firestore Collections**:

```firestore
organizations/{orgId}
├── memories/{memoryId}
│   ├── title: string
│   ├── description: string | null
│   ├── documentCapacity: number (default: 100)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── documentCount: number
│   ├── sessionId: string (sessionId of memory creator)
│   ├── condenseThresholdPercent: number (default: 50, triggers condensation)
│   └── documents/{documentId}
│       ├── title: string
│       ├── content: string (plain text)
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       ├── sessionId: string (sessionId of document creator)
│       └── isCondensationSummary: boolean (flag for AI-generated summaries)
```

**New Fields**:

- `sessionId` on Memory and MemoryDocument — tracks creator session for audit/tracing
- `condenseThresholdPercent` on Memory — configurable trigger point for condensation (50% of capacity)
- `isCondensationSummary` on MemoryDocument — indicates AI-generated summary vs. user document

### 1b. Memory Condensation Workflow (LangGraph)

**State Machine**:

```
TRIGGERED (capacity check)
  → ANALYZE (select 10 oldest docs)
  → SUMMARIZE (Gemini summarization)
  → CONSOLIDATE (create summary doc, atomic delete 10 old docs)
  → COMPLETE
```

**Trigger Condition**:

- documentCount ≥ (documentCapacity × condenseThresholdPercent / 100)
- Default: trigger at 50 docs when capacity is 100

**Workflow Implementation**:

1. Cloud Function listener on document create detects capacity threshold
2. Invokes LangGraph agent asynchronously (non-blocking)
3. Agent queries 10 oldest documents, generates summary via Gemini
4. Creates new "ContextualSummary" document with `isCondensationSummary: true`
5. Atomically deletes 10 old documents (batch operation)
6. Logs condensation event to Cloud Logging

**Retry Strategy**:

- Automatic exponential backoff: 3 retries on failure
- Failed condensations logged to Cloud Logging; user notified via status badge if needed
- Condensation is non-blocking; document creation always succeeds

### 1c. API Contracts

#### Memory List API

**Route**: `GET /api/memories`

**Query Parameters**:

- `orgId` — from auth context
- `sort` — `createdAt_desc` (default), `createdAt_asc`, `title_asc`, `title_desc`
- `search` — prefix-match memory title filter
- `after` — cursor for pagination (last doc ID from previous page)
- `limit` — page size (default: 25, max: 100)

**Response** (streaming JSON):

```typescript
{
  data: Memory[],
  cursor: {
    nextAfter: string | null,
    hasMore: boolean
  },
  meta: {
    totalCount: number | null // estimated; not fetched for perf
  }
}
```

#### Memory Detail API

**Route**: `GET /api/memories/{memoryId}`

**Response**:

```typescript
{
  id: string,
  title: string,
  description: string | null,
  documentCapacity: number,
  documentCount: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  sessionId: string
}
```

#### Memory Document List API

**Route**: `GET /api/memories/{memoryId}/documents`

**Query Parameters**:

- `sort` — `createdAt_desc` (default), `createdAt_asc`, `title_asc`, `title_desc`, `updatedAt_desc`, `updatedAt_asc`
- `search` — prefix-match document title filter
- `after` — cursor for pagination
- `limit` — page size (default: 25)
- `includeCondensed` — `true` (default) includes AI-generated summaries; `false` hides them

**Response** (streaming):

```typescript
{
  data: MemoryDocument[],
  cursor: {
    nextAfter: string | null,
    hasMore: boolean
  }
}
```

#### Create Memory Document API

**Route**: `POST /api/memories/{memoryId}/documents`

**Request**:

```typescript
{
  title: string (1-500 chars),
  content: string (optional, max 10,000 chars)
}
```

**Response**:

```typescript
{
  id: string,
  title: string,
  content: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  sessionId: string,
  isCondensationSummary: false,
  _triggerCondensation: boolean // internal flag: was condensation triggered?
}
```

**Behavior**:

1. Create document in Firestore
2. Atomically increment `documentCount`
3. Check if documentCount ≥ threshold; if so, enqueue LangGraph condensation task (async, non-blocking)
4. Return document immediately (creation always succeeds)

#### Memory Mutation APIs (Create, Update, Delete)

**Create Memory** `POST /api/memories`:

```typescript
// Request
{ title, description?, documentCapacity?: number }

// Response
{ id, title, description, documentCapacity, createdAt, updatedAt, sessionId }
```

**Update Memory** `PUT /api/memories/{memoryId}`:

```typescript
// Request
{ title?, description?, documentCapacity?: number }

// Behavior if documentCapacity reduced:
// - Atomically evict oldest docs to match new capacity
// - Returns updated memory with new documentCount

// Response
{ id, title, description, documentCapacity, documentCount, updatedAt }
```

**Delete Memory** `DELETE /api/memories/{memoryId}`:

```typescript
// Cascade-deletes all documents; idempotent

// Response
{ success: boolean, deletedCount: number }
```

#### Memory Document Mutations

**Update Document** `PUT /api/memories/{memoryId}/documents/{documentId}`:

```typescript
// Request
{ title?, content? }

// Note: Cannot update isCondensationSummary after creation

// Response
{ id, title, content, updatedAt }
```

**Delete Document** `DELETE /api/memories/{memoryId}/documents/{documentId}`:

```typescript
// Atomically deletes and decrements documentCount

// Response
{
  success: boolean;
}
```

### 1d. Frontend Data Layer (TanStack Query)

**Query Keys** (using TanStack Query v5):

```typescript
// Memories list
queryKey: ["memories", { orgId, sort, search, limit }];

// Single memory
queryKey: ["memories", memoryId];

// Memory documents
queryKey: ["memories", memoryId, "documents", { sort, search, limit }];

// Single document
queryKey: ["memories", memoryId, "documents", documentId];
```

**Mutations**:

```typescript
// Create memory
useMutation({
  mutationFn: (data) => POST /api/memories
  onSuccess: (newMemory) => {
    queryClient.setQueryData(['memories', { ... }], old => [...old, newMemory])
  }
})

// Create document (with potential condensation)
useMutation({
  mutationFn: (data) => POST /api/memories/{id}/documents
  onSuccess: (newDoc, _variables, context) => {
    // Refetch document list (cursor may have changed due to eviction)
    queryClient.invalidateQueries({ queryKey: ['memories', memoryId, 'documents'] })
  }
})
```

**Streaming & Suspense**:

- Memory list API returns streaming JSON for progressive rendering
- Documents wrapped in `<Suspense>` boundaries with skeleton fallback
- TanStack Query `useQuery` + `useSuspenseQuery` for list views
- Leverage React 19 server components for initial server-side pagination load

---

## Phase 2: Architecture & Workflows

### 2a. LangGraph Condensation Agent

**Graph Structure** (pseudocode):

```typescript
// nodes/condense-memory-node.ts
const condenseMemoryGraph = new StateGraph({
  state: MemoryCondensationState {
    memoryId: string,
    documentCapacity: number,
    documentCount: number,
    sessionId: string,
    oldestDocs: MemoryDocument[],
    summary: string,
    summaryTitle: string,
    status: 'pending' | 'processing' | 'success' | 'failed'
  }
})

// Step 1: Fetch 10 oldest documents
.addNode('selectOldestDocs', async (state) => {
  const docs = await admin.firestore()
    .collection(`organizations/${orgId}/memories/${memoryId}/documents`)
    .orderBy('createdAt', 'asc')
    .limit(10)
    .get()
  return { oldestDocs: docs.docs.map(d => d.data()) }
})

// Step 2: Generate summary via Gemini
.addNode('summarizeDocs', async (state) => {
  const content = state.oldestDocs
    .map(d => `Title: ${d.title}\nContent: ${d.content}`)
    .join('\n---\n')

  const response = await vertexAI.generateContent({
    model: 'gemini-3.1-flash',
    contents: {
      role: 'user',
      parts: [{
        text: `Summarize these ${state.oldestDocs.length} documents into a single 2-4 sentence contextual summary that captures the essence and key points:\n\n${content}`
      }]
    }
  })

  const summary = response.response.text()
  const summaryTitle = `Contextual Summary: ${state.oldestDocs[0].createdAt.toDateString()} to ${state.oldestDocs[state.oldestDocs.length - 1].createdAt.toDateString()}`

  return { summary, summaryTitle, status: 'processing' }
})

// Step 3: Atomic consolidation (create summary + delete old docs)
.addNode('consolidate', async (state) => {
  const batch = admin.firestore().batch()

  // Create new summary document
  const summaryRef = admin.firestore()
    .collection(`organizations/${orgId}/memories/${memoryId}/documents`)
    .doc()

  batch.set(summaryRef, {
    title: state.summaryTitle,
    content: state.summary,
    createdAt: new Date(),
    updatedAt: new Date(),
    sessionId: state.sessionId,
    isCondensationSummary: true
  })

  // Delete 10 oldest documents
  state.oldestDocs.forEach(doc => {
    const docRef = admin.firestore()
      .collection(`organizations/${orgId}/memories/${memoryId}/documents`)
      .doc(doc.id)
    batch.delete(docRef)
  })

  // Update memory documentCount: -10 + 1 = -9
  const memoryRef = admin.firestore()
    .collection(`organizations/${orgId}/memories`)
    .doc(state.memoryId)

  batch.update(memoryRef, {
    documentCount: FieldValue.increment(-9),
    updatedAt: new Date()
  })

  await batch.commit()

  return { status: 'success' }
})

// Flow: selectOldestDocs → summarizeDocs → consolidate
```

**Invocation** (from document create Cloud Function):

```typescript
// functions/src/workflows/condense-memory-workflow.ts
export async function maybeTriggerMemoryCondensation(
  orgId: string,
  memoryId: string,
  newDocumentCount: number,
  documentCapacity: number,
  sessionId: string,
) {
  const condenseThreshold = documentCapacity * 0.5; // 50% by default

  if (newDocumentCount >= condenseThreshold) {
    // Enqueue async condensation (non-blocking)
    const graph = condenseMemoryGraph.compile();
    await graph.invoke(
      {
        memoryId,
        documentCapacity,
        documentCount: newDocumentCount,
        sessionId,
        status: "pending",
      },
      { runId: `condense-${memoryId}-${Date.now()}` },
    );

    logger.info(`Triggered memory condensation for ${memoryId}`);
  }
}
```

### 2b. Session ID Handling

**Session ID Source**:

- Captured from `ctx.session.id` (assuming auth middleware provides this)
- Passed to Firestore on memory and document creation
- Used for audit logging and tracing

**Implementation**:

```typescript
// pages/api/memories/route.ts
export async function POST(req: Request) {
  const ctx = await withContext(req); // Extract session context
  const sessionId = ctx.session?.id || "unknown";

  const memoryData = {
    title,
    description,
    documentCapacity: documentCapacity || 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    sessionId, // ← Capture session ID
    documentCount: 0,
  };

  // ... create in Firestore
}
```

### 2c. Client-Side Streaming & Suspense Integration

**Pattern** (react-suspense + TanStack Query):

```typescript
// components/memories-list.tsx
function MemoriesList() {
  return (
    <Suspense fallback={<MemoriesSkeletonList count={25} />}>
      <MemoriesContent />
    </Suspense>
  )
}

function MemoriesContent() {
  const [sort, setSort] = useState('createdAt_desc')
  const [search, setSearch] = useState('')

  // useSuspenseQuery from TanStack Query v5
  const { data, fetchNextPage, hasNextPage } = useSuspenseInfiniteQuery({
    queryKey: ['memories', { sort, search }],
    queryFn: async ({ pageParam }) => {
      const response = await fetch(
        `/api/memories?sort=${sort}&search=${search}&after=${pageParam}&limit=25`,
        { headers: { 'Accept': 'application/json' } }
      )
      // Server streams JSON chunks; TanStack Query handles buffering
      return response.json()
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.cursor.nextAfter
  })

  const allMemories = data.pages.flatMap(page => page.data)

  return (
    <div>
      <MemoryList items={allMemories} />
      {hasNextPage && <button onClick={() => fetchNextPage()}>Load More</button>}
    </div>
  )
}
```

---

## Phase 3: Implementation Tasks (Ordered by Dependency)

### Layer 1: Data Layer & Infrastructure

- [ ] **Firestore schema migration**: Add `sessionId`, `documentCapacity`, `condenseThresholdPercent`, `isCondensationSummary` fields
- [ ] **Firestore indexes**: Create composite indexes for memory list sorts + pagination
- [ ] **Firestore security rules**: Scope memory/document queries to orgId via auth context
- [ ] **Cloud Logging setup**: Configure logging for condensation events (success/failure)

### Layer 2: Backend APIs

- [ ] **Memory CRUD APIs**: `POST /api/memories`, `PUT /api/memories/{id}`, `DELETE /api/memories/{id}`, with transaction handling
- [ ] **Memory list API**: `GET /api/memories` with cursor pagination, search, sort; streaming JSON response
- [ ] **Memory document CRUD**: `POST|PUT|DELETE /api/memories/{memoryId}/documents/{documentId}`
- [ ] **Memory document list API**: `GET /api/memories/{memoryId}/documents` with pagination, search, sort

### Layer 3: LangGraph Worker & Condensation

- [ ] **LangGraph condensation workflow**: Implement state machine with Gemini summarization
- [ ] **Cloud Function trigger**: Wire up document create → condensation check → async LangGraph invocation
- [ ] **Error handling & retry**: Exponential backoff for failed condensations
- [ ] **Logging & observability**: Log condensation events, track latency

### Layer 4: Frontend Data & UI

- [ ] **Query keys & TanStack Query setup**: Configure `@tanstack/react-query` with memory module keys
- [ ] **useMemoriesQuery hooks**: Fetch memories list with infinite pagination
- [ ] **useMemoryDocumentsQuery hooks**: Fetch documents within a memory
- [ ] **Mutations**: useMutation for create/update/delete on memories and documents
- [ ] **Suspense integration**: Wrap list views in `<Suspense>` boundaries with skeleton fallbacks
- [ ] **Streaming JSON client**: Configure TanStack Query to handle streaming API responses

### Layer 5: UI Components

- [ ] **Memories list page**: Search, sort, pagination with skeleton loaders
- [ ] **Memory detail page**: Header with capacity indicator, document list below
- [ ] **Memory document list**: Search, sort, filter (show/hide condensed summaries)
- [ ] **Create memory form**: Title, description, document capacity input
- [ ] **Create document form**: Title, content textarea (plain text)
- [ ] **Edit document modal**: In-place editing with unsaved discard behavior
- [ ] **Delete confirmations**: Danger modals with cascade counts
- [ ] **Condensation status badge**: Show when condensation is in progress (optional, for future)

### Layer 6: Integration & Testing

- [ ] **End-to-end tests**: Create memory → add docs → verify FIFO eviction at capacity
- [ ] **Condensation e2e**: Trigger condensation at 50% threshold; verify summary document created and old ones deleted
- [ ] **Session ID tracking**: Verify sessionId captured on create
- [ ] **Data isolation**: Org-scoped queries; cross-org access rejected
- [ ] **Performance testing**: List loads < 2s; search debounce < 1s

---

## Success Metrics (Phase 3 Completion)

- ✅ All 20 functional requirements + condensation feature implemented
- ✅ APIs follow spec contracts; cursor pagination works end-to-end
- ✅ LangGraph condensation triggers at 50% capacity, generates summaries, evicts old docs
- ✅ Session ID captured and stored on all write operations
- ✅ Frontend uses TanStack Query + Suspense for list rendering
- ✅ Data isolation enforced (100% org-scoped queries)
- ✅ Performance targets met: list < 2s, search < 1s, document create < 2s
- ✅ All routes return 401 for unauthenticated requests

---

## Assumptions & Constraints

- Auth context (`withContext`) already provides orgId and sessionId
- Gemini API enabled in Cloud Functions service account
- LangGraph.js Node.js 22 compatible
- TanStack Query v5 compatible with React 19 Suspense
- Firestore supports up to 500 writes per batch (condensation uses ~12 writes max)
- No shared mutations between multiple browser tabs (optimistic updates sufficient)

---

## Risk Mitigation

| Risk                                                  | Mitigation                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| Condensation task exceeds Firestore transaction limit | Design batch writes to stay ≤ 50 ops; split if needed         |
| Gemini API latency blocks document creation           | Condensation runs async; document creation always succeeds    |
| Session ID not available in auth context              | Fallback to 'unknown' or derive from JWT claims               |
| TanStack Query streaming buffer overflow              | Implement backpressure; limit page size to 25 items           |
| Cross-org data leakage via cursor pagination          | Add orgId check in all list queries; integration tests verify |
