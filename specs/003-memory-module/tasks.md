# Implementation Tasks: Memory Module

**Branch**: `003-memory-module`
**Status**: Ready to implement
**Last Updated**: 2026-04-11

## 📋 Summary

**Total tasks**: 60
**Parallelisable tasks**: 43 (marked [P])
**User Stories**: 3 (US1 P1, US2 P2, US3 P2)

**Phases**:

1. **Setup** (5 tasks) — Firestore schema, indexes, security rules, query keys, navigation
2. **Foundational** (7 tasks) — Zod schemas, TypeScript types, repository base, server context, cache tags
3. **Phase 3 — [US1] Memory Lifecycle** (14 tasks) — Memory API routes, data hooks, UI list + CRUD
4. **Phase 4 — [US2] Memory Document Management** (18 tasks) — Document API routes, FIFO eviction helper, data hooks, UI document list + CRUD
5. **Phase 5 — [US3] Memory Condensation** (11 tasks) — LangGraph worker agent, Gemini summarization, trigger wiring, condensation UI
6. **Polish** (5 tasks) — Empty states, search-result empty states, E2E validation

---

## 📚 Related Documents

| Document             | Purpose                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| [spec.md](./spec.md) | Full feature specification (FR-001 to FR-026, SC-001 to SC-008)               |
| [plan.md](./plan.md) | Architecture; API contracts, LangGraph state machine, TanStack Query patterns |

---

## Phase 1: Setup

_Project initialization — must complete before any user story work begins._

- [x] T001 Add Firestore composite indexes for memories collection (`createdAt desc`, `title asc`) in `firestore.indexes.json`
- [x] T002 Add Firestore composite indexes for memory documents subcollection (`createdAt desc`, `title asc`, `updatedAt desc`) in `firestore.indexes.json`
- [x] T003 [P] Add Firestore security rules for `organizations/{orgId}/memories/{memoryId}` and `organizations/{orgId}/memories/{memoryId}/documents/{documentId}` in `firestore.rules` — scope all reads/writes to authenticated org members
- [x] T004 [P] Register `memories` cache tag constants in `src/lib/cache-tags.ts`
- [x] T005 [P] Add `memories` top-level sidebar navigation entry in the platform layout component alongside the Stores entry in `src/components/layout/`

---

## Phase 2: Foundational

_Blocking prerequisites for all user stories — data types, Zod schemas, repository base, query keys._

- [x] T006 Define TypeScript types for `Memory` and `MemoryDocument` entities including all fields (`sessionId`, `documentCapacity`, `condenseThresholdPercent`, `isCondensationSummary`) in `src/data/memories/types.ts`
- [x] T007 [P] Define all Zod validation schemas for memories — creation/update DTO shapes (`CreateMemorySchema`, `UpdateMemorySchema`, `CreateMemoryDocumentSchema`, `UpdateMemoryDocumentSchema`) and API request/response contract schemas matching plan.md contracts — in `src/data/memories/schemas.ts`
- [x] T009 [P] Add TanStack Query v5 query key factory for memories and memory documents in `src/lib/query-keys.ts` — keys for list, detail, documents-list, and document-detail
- [x] T010 [P] Implement `MemoryRepository` class with typed Firestore read/write methods (CRUD, cursor-based `listMemories`) in `src/data/memories/repositories/memory-repository.ts`
- [x] T011 [P] Implement `MemoryDocumentRepository` class with typed Firestore read/write methods including atomic `documentCount` increment/decrement via `FieldValue.increment` in `src/data/memories/repositories/memory-document-repository.ts`
- [x] T012 [P] Add cursor utility helpers for memory list and document list sort fields (reuse/extend `src/lib/cursor.ts` pattern from store module)
- [x] T013 [P] Add server context helper for memory use cases — extract `orgId` and `sessionId` from auth session in `src/lib/server-context.ts`

---

## Phase 3: User Story 1 — Memory Lifecycle Management [US1]

**Story Goal**: Users can create, view, edit, and delete memories. List supports search, sort, and cursor pagination.

**Independent Test Criteria**: Create one memory → it appears in list → edit its title → it updates → delete it with confirmation → it disappears. No documents required.

### API Layer

- [x] T014 [P] [US1] Implement `GET /api/memories` route handler with cursor pagination, search (prefix match on `title`), sort (`createdAt_desc`, `createdAt_asc`, `title_asc`, `title_desc`), and streaming JSON response in `src/app/api/memories/route.ts`
- [x] T015 [P] [US1] Implement `POST /api/memories` route handler: validate request with Zod, write memory to Firestore with `sessionId` from auth context, return created memory in `src/app/api/memories/route.ts`
- [x] T016 [P] [US1] Implement `GET /api/memories/[memoryId]` route handler: fetch single memory by ID scoped to orgId in `src/app/api/memories/[memoryId]/route.ts`
- [x] T017 [P] [US1] Implement `PUT /api/memories/[memoryId]` route handler: validate request, update title/description/documentCapacity; if capacity reduced below current count atomically evict oldest documents via batch delete in `src/app/api/memories/[memoryId]/route.ts`
- [x] T018 [US1] Implement `DELETE /api/memories/[memoryId]` route handler: cascade-delete all documents subcollection in a batch then delete memory document; respond idempotently in `src/app/api/memories/[memoryId]/route.ts`

### Data Hooks

- [x] T019 [P] [US1] Implement `useMemoriesQuery` hook using `useSuspenseInfiniteQuery` from TanStack Query v5 for paginated memory list in `src/lib/hooks/use-memories-query.ts`
- [x] T020 [P] [US1] Implement `useMemoryQuery` hook using `useSuspenseQuery` for single memory detail in `src/lib/hooks/use-memory-query.ts`
- [x] T021 [P] [US1] Implement `useCreateMemoryMutation`, `useUpdateMemoryMutation`, `useDeleteMemoryMutation` hooks with `useMutation`; invalidate memories query on success in `src/lib/hooks/use-memory-mutations.ts`

### UI Components

- [x] T022 [US1] Implement `MemoriesPage` with Suspense boundary, skeleton fallback (`MemoriesSkeletonList`), and URL-synced search/sort state in `src/app/(platform)/memories/page.tsx`
- [x] T023 [P] [US1] Implement `MemoriesList` component rendering paginated memory cards with title, description, document count, capacity indicator, and "Load More" cursor pagination in `src/components/memories/memories-list.tsx`
- [x] T024 [P] [US1] Implement `MemoryCard` component showing memory metadata with edit and delete action affordances in `src/components/memories/memory-card.tsx`
- [x] T025 [P] [US1] Implement `CreateMemoryModal` form with title (required), description (optional), and document capacity fields (default 100) with Zod validation in `src/components/memories/create-memory-modal.tsx`
- [x] T026 [P] [US1] Implement `EditMemoryModal` form pre-populated with existing memory data; warn inline if new capacity is below current document count in `src/components/memories/edit-memory-modal.tsx`
- [x] T027 [US1] Implement `DeleteMemoryModal` danger confirmation showing document count that will cascade-deleted in `src/components/memories/delete-memory-modal.tsx`

---

## Phase 4: User Story 2 — Memory Document Management [US2]

**Story Goal**: Users open a memory and can create, view, edit, and delete plain-text documents. List supports search, sort, pagination, and shows condensation summary badges.

**Independent Test Criteria**: Open existing memory → create doc with title + content → it appears in list → edit content → changes persist → delete with confirmation → it disappears. Condensation not required.

### API Layer

- [x] T028 [P] [US2] Implement `GET /api/memories/[memoryId]/documents` route handler with cursor pagination, search, sort (`createdAt_desc`, `createdAt_asc`, `title_asc`, `title_desc`, `updatedAt_desc`, `updatedAt_asc`), `includeCondensed` filter, and streaming JSON response in `src/app/api/memories/[memoryId]/documents/route.ts`
- [x] T052 [US2] Implement `evictOldestDocumentsToCapacity` helper — when `documentCount` equals `documentCapacity`, atomically delete the oldest document in the same Firestore transaction as the new document write; uses dynamic doc count not a hardcoded limit — in `src/data/memories/repositories/memory-document-repository.ts` _(moved from Phase 5; must be complete before T029 ships — resolves C1)_
- [x] T029 [US2] Implement `POST /api/memories/[memoryId]/documents` route handler: validate with Zod, write document with `sessionId`, invoke `evictOldestDocumentsToCapacity` (T052) when at capacity, atomically increment `documentCount` via transaction, check condensation threshold and enqueue async condensation if triggered, return created document in `src/app/api/memories/[memoryId]/documents/route.ts` _(requires T052)_
- [x] T030 [P] [US2] Implement `GET /api/memories/[memoryId]/documents/[documentId]` route handler: fetch single document scoped to orgId and memoryId in `src/app/api/memories/[memoryId]/documents/[documentId]/route.ts`
- [x] T031 [P] [US2] Implement `PUT /api/memories/[memoryId]/documents/[documentId]` route handler: validate request, update title/content, refresh `updatedAt`; `isCondensationSummary` is immutable after creation in `src/app/api/memories/[memoryId]/documents/[documentId]/route.ts`
- [x] T032 [US2] Implement `DELETE /api/memories/[memoryId]/documents/[documentId]` route handler: delete document and atomically decrement `documentCount` in a transaction in `src/app/api/memories/[memoryId]/documents/[documentId]/route.ts`

### Data Hooks

- [x] T033 [P] [US2] Implement `useMemoryDocumentsQuery` hook using `useSuspenseInfiniteQuery` for paginated and filterable document list in `src/lib/hooks/use-memory-documents-query.ts`
- [x] T034 [P] [US2] Implement `useMemoryDocumentQuery` hook using `useSuspenseQuery` for single document detail in `src/lib/hooks/use-memory-document-query.ts`
- [x] T035 [P] [US2] Implement `useCreateMemoryDocumentMutation`, `useUpdateMemoryDocumentMutation`, `useDeleteMemoryDocumentMutation` hooks; invalidate documents list query on success in `src/lib/hooks/use-memory-document-mutations.ts`

### UI Components

- [x] T036 [US2] Implement `MemoryDetailPage` showing memory metadata header with capacity bar and document list below; Suspense boundary with skeleton; URL-synced `search`, `sort`, and `includeCondensed` query params preserved and readable on page mount in `src/app/(platform)/memories/[memoryId]/page.tsx`
- [x] T037 [P] [US2] Implement `MemoryDocumentList` component with search input (debounced), sort selector, `includeCondensed` toggle, skeleton loaders during load (sort/filter disabled while loading), and cursor pagination in `src/components/memories/memory-document-list.tsx`
- [x] T038 [P] [US2] Implement `MemoryDocumentRow` component showing title, `updatedAt`, creation date, and condensation summary badge when `isCondensationSummary` is true in `src/components/memories/memory-document-row.tsx`
- [x] T039 [P] [US2] Implement `MemoryDocumentDetailPage` showing full plain-text content display with "AI-Generated Summary" banner when `isCondensationSummary` is true in `src/app/(platform)/memories/[memoryId]/documents/[documentId]/page.tsx`
- [x] T040 [P] [US2] Implement `CreateMemoryDocumentModal` form with title (required) and plain-text content textarea (optional, max 10,000 chars) and Zod validation in `src/components/memories/create-memory-document-modal.tsx`
- [x] T041 [P] [US2] Implement `EditMemoryDocumentModal` form pre-populated with existing document data; unsaved changes are discarded silently on close in `src/components/memories/edit-memory-document-modal.tsx`
- [x] T042 [US2] Implement `DeleteMemoryDocumentModal` danger confirmation for individual document deletion in `src/components/memories/delete-memory-document-modal.tsx`
- [x] T043 [P] [US2] Implement `MemoryCapacityBar` component displaying current document count vs capacity limit; show warning colour when documentCount ≥ condenseThresholdPercent of capacity in `src/components/memories/memory-capacity-bar.tsx`

---

## Phase 5: User Story 3 — Memory Condensation [US3]

**Story Goal**: When a memory's document count reaches the condensation threshold (default 50%), a LangGraph Worker Agent is triggered asynchronously. It summarizes the 10 oldest documents via Gemini 3.1 Flash into a single Contextual Summary document, then atomically deletes those 10 documents.

**Independent Test Criteria**: Create a memory with capacity 20 and threshold 50%. Add 10 documents — the 10th document creation reaches the condensation threshold (50% of 20). Verify: (a) condensation workflow triggered asynchronously, (b) 1 summary document appears with `isCondensationSummary: true`, (c) 10 oldest documents deleted atomically, (d) `documentCount` decremented by 9 (net: 10 deleted + 1 summary created), (e) document creation API returned `200` before condensation completed.

### LangGraph Worker (Cloud Functions)

- [x] T044 Define `MemoryCondensationState` TypeScript interface with all state fields (`memoryId`, `orgId`, `documentCapacity`, `documentCount`, `sessionId`, `oldestDocs`, `summary`, `summaryTitle`, `status`) in `functions/src/workflows/memory-condensation/types.ts`
- [x] T045 [P] [US3] Implement `selectOldestDocsNode` LangGraph node: query 10 oldest documents by `createdAt asc` from memory's documents subcollection scoped to orgId in `functions/src/workflows/memory-condensation/nodes/select-oldest-docs-node.ts`
- [x] T046 [P] [US3] Implement `summarizeDocsNode` LangGraph node: concatenate 10 document titles + contents, call Gemini 3.1 Flash to generate a 2–4 sentence contextual summary, construct `summaryTitle` from date range of source docs in `functions/src/workflows/memory-condensation/nodes/summarize-docs-node.ts`
- [x] T047 [US3] Implement `consolidateNode` LangGraph node: create Firestore batch — (a) set new summary document with `isCondensationSummary: true`, (b) delete all `state.oldestDocs` source document refs (dynamic count — not hardcoded to 10), (c) update memory `documentCount` via `FieldValue.increment(-(state.oldestDocs.length - 1))` (n deleted + 1 created) — commit batch atomically in `functions/src/workflows/memory-condensation/nodes/consolidate-node.ts`
- [x] T048 [US3] Compose and compile `condenseMemoryGraph` StateGraph wiring `START → selectOldestDocs → summarizeDocs → consolidate → END` with exponential backoff retry (3 retries: 2s, 4s, 8s) and Cloud Logging on success/failure in `functions/src/workflows/memory-condensation/graph.ts`
- [x] T049 [US3] Implement `maybeTriggerMemoryCondensation` helper: check `documentCount >= documentCapacity * condenseThresholdPercent / 100`; if true invoke compiled LangGraph graph asynchronously (non-blocking), passing `orgId` (from auth context) and `memoryId` in the invocation payload in `functions/src/workflows/memory-condensation/trigger.ts`

### API Integration

- [x] T050 [US3] Wire `maybeTriggerMemoryCondensation` into the `POST /api/memories/[memoryId]/documents` handler (T029) after document creation and `documentCount` increment — call without `await` so document creation response is immediate in `src/app/api/memories/[memoryId]/documents/route.ts` _(implemented via Firestore trigger `onMemoryDocumentCreated` in Cloud Functions — cleanly decoupled from Next.js build)_
- [x] T051 [P] [US3] Wire `maybeTriggerMemoryCondensation` into the `POST /api/memories/[memoryId]/documents` Cloud Functions handler (for server-side invocations) in `functions/src/handles/on-memory-document-created.ts` _(implemented as Firestore onDocumentCreated trigger — handles both Next.js and Cloud Functions document creation paths)_

### FIFO Capacity Eviction (non-condensation path)

- [x] T053 [US3] Wire `evictOldestDocumentsToCapacity` (T052, implemented in Phase 4) into `PUT /api/memories/[memoryId]` when `documentCapacity` is reduced below current `documentCount` — evict oldest docs to meet new limit atomically in `src/app/api/memories/[memoryId]/route.ts`

### Condensation UI

- [x] T054 [P] [US3] Add "AI-Generated Summary" banner at top of `MemoryDocumentDetailPage` (T039) when `isCondensationSummary: true`, with explanatory note that content is machine-generated in `src/app/(platform)/memories/[memoryId]/documents/[documentId]/page.tsx`
- [x] T055 [P] [US3] Add `CondensationSummaryBadge` component (chip/label) displayed on `MemoryDocumentRow` (T038) when `isCondensationSummary: true` in `src/components/memories/condensation-summary-badge.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T058 [P] Implement `MemoriesEmptyState` component: shown when memory list is empty (zero total records); includes CTA to create first memory in `src/components/memories/memories-empty-state.tsx`
- [x] T059 [P] Implement `MemoryDocumentsEmptyState` component: shown when document list within a memory is empty (zero total records); includes CTA to create first document in `src/components/memories/memory-documents-empty-state.tsx`
- [x] T060 [P] Implement `MemoriesSkeletonList` component: renders skeleton placeholder items while memory list is loading; sort/filter controls rendered as disabled in `src/components/memories/memories-skeleton-list.tsx`
- [x] T061 [P] Implement `MemoryDocumentsSkeletonList` component: renders skeleton placeholder rows while document list is loading in `src/components/memories/memory-documents-skeleton-list.tsx`
- [x] T063 [P] Implement search-result empty states for memories list and document list — distinct from zero-items empty states; shown when a search query returns zero results; display the active search term and a "Clear search" affordance in `src/components/memories/memories-search-empty-state.tsx` and `src/components/memories/memory-documents-search-empty-state.tsx`
- [x] T062 Validate full end-to-end flows: (a) memory CRUD with list, search, sort (b) document CRUD within memory (c) capacity eviction at limit (d) condensation trigger at threshold with summary creation and source deletion (e) org-scoped data isolation (f) performance targets: memory creation < 30s, doc creation < 2s, sort update < 1s, deletion < 10s — update memory module test scenarios in `tests/api/COMPLETE_REFERENCE.md`

---

## Dependencies

```
Phase 1 (T001–T005) → must complete before Phase 2
Phase 2 (T006–T013) → must complete before Phases 3, 4, 5
Phase 3 (T014–T027) → US1; no dependency on US2 or US3
Phase 4 (T028–T043, T052) → US2; depends on US1 completion; T052 (FIFO eviction helper) moved here from Phase 5 and must precede T029
Phase 5 (T044–T051, T053–T055) → US3; depends on T029 (document create route, Phase 4) being implemented first
Phase 6 (T058–T063) → depends on all phases; T062 is final validation gate
```

---

## Parallel Execution Examples

### Phase 3 (US1 — Memory Lifecycle)

Run in parallel after T006–T013 complete:

- T014, T015, T016 (API route handlers — different files, no shared state)
- T019, T020, T021 (data hooks — independent files)
- T023, T024, T025, T026 (UI components — no cross-dependencies)

### Phase 4 (US2 — Document Management)

Run in parallel after T029 (POST document) is complete:

- T028, T030, T031 (GET + PUT routes — can be developed alongside T029)
- T033, T034, T035 (data hooks — independent per entity)
- T037, T038, T040, T041, T043 (UI components — all independent files)

### Phase 5 (US3 — Condensation)

Run in parallel after T044 (types) is complete:

- T045, T046 (LangGraph nodes — independent files)
- T047 depends on T045 + T046 outputs
- T048 depends on T047
- T054, T055 (UI — independent of each other)

---

## Implementation Strategy

**MVP (Recommended First Delivery) — Phase 1 + 2 + 3**:

- All infrastructure, types, and schemas (T001–T013)
- Full Memory CRUD with list, search, sort, pagination (T014–T027)
- Delivers US1 as a complete, independently testable increment

**Increment 2 — Phase 4**:

- FIFO eviction helper T052 (required before T029 ships)
- Full Memory Document CRUD with list, search, sort, pagination (T028–T043)
- Delivers US2 with condensation UI scaffold (badges, capacity bar)

**Increment 3 — Phase 5 + 6**:

- LangGraph condensation worker agent (T044–T051, T053–T055)
- Polish, empty states, search-result empty states, E2E validation (T058–T063)
