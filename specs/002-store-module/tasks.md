# Implementation Tasks: Store Module — Task Index

**Branch**: `002-store-module`  
**Status**: Implementation in progress  
**Last Updated**: 2026-04-07

## 📋 Task Organization

This project contains **two complementary task files**:

### 🔄 Current Work: Data Fetching Refactor

**File**: [tasks-refactor.md](./tasks-refactor.md)  
**Scope**: Query layer modernization (28 tasks, Phases 1–6)  
**Focus**: SSR + `'use cache'` + GET route handlers + cursor pagination  
**Status**: In progress (implementation of Next.js 16 patterns)  
**Start Here**: If you're working on query migration, cache tags, or cursor-based pagination

### 📦 Reference: Complete Feature Archive

**File**: [tasks-archive.md](./tasks-archive.md)  
**Scope**: Original complete feature plan (69 tasks, all phases)  
**Status**: Mostly complete (49/69 tasks done [x]); some blocked by refactor  
**Use For**: Reference on CRUD use cases, Cloud Functions, and file management (to resume after refactor)

---

## 🎯 Current Scope

The **refactor** (tasks-refactor.md) focuses on modernizing how **queries** are served (SSR + `'use cache'` + GET routes). It does **NOT** include:

- ❌ File upload/download mutations (see tasks-archive.md T031–T034)
- ❌ File management UI (see tasks-archive.md T038–T041)
- ❌ Custom JSON mutations (see tasks-archive.md T042–T043)
- ❌ Cloud Functions enrichment (see tasks-archive.md T050–T063)

These remain in the archive and will be addressed after the refactor is complete.

---

## 📚 Related Documents

| Document                         | Purpose                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| [spec.md](./spec.md)             | Full feature specification (FR-001 to FR-028, SC-001 to SC-006)      |
| [plan.md](./plan.md)             | Architecture & data fetching strategy; includes Decision 8 Deep-Dive |
| [data-model.md](./data-model.md) | Firestore schema, entities, and relationships                        |
| [quickstart.md](./quickstart.md) | Dev setup guide and env vars                                         |
| [contracts/](./contracts/)       | API contracts for GET route handlers                                 |

---

## 🚀 Quick Navigation

**If you're implementing the refactor:**  
→ Read [tasks-refactor.md](./tasks-refactor.md) (28 tasks, 6 phases)

**If you need complete context:**  
→ Read [tasks-archive.md](./tasks-archive.md) (69 tasks, reference for all features)

**If you're new to the project:**  
→ Start with [spec.md](./spec.md), then [plan.md](./plan.md), then choose refactor vs archive based on your task

---

## 📊 Project Status

| Component                  | Status                            | Reference                                      |
| -------------------------- | --------------------------------- | ---------------------------------------------- |
| **Refactor** (Query Layer) | 🔄 In Progress (14/28 tasks done) | tasks-refactor.md                              |
| **Archive** (Full Feature) | ✅ Mostly Done (49/69 tasks done) | tasks-archive.md                               |
| **Models & DTOs**          | ✅ Complete                       | tasks-archive.md Phase 2                       |
| **Store CRUD**             | ✅ Complete                       | tasks-archive.md Phase 3                       |
| **File Management**        | ⏸️ Blocked                        | tasks-archive.md Phase 4 (blocked by refactor) |
| **Custom JSON**            | ⏸️ Blocked                        | tasks-archive.md Phase 5 (blocked by refactor) |
| **Cloud Functions**        | 🔄 Ready to Start                 | tasks-archive.md Phase 6                       |

---

## ⚡ For Code Review

**Blocking Issues** (resolved via remediation):

- ✅ Dual task-list confusion → split into tasks-refactor.md + tasks-archive.md
- ✅ Scope ambiguity → each file now clearly states "what's in + what's out"
- ✅ Task conflict (T012 vs T018 rename) → T012 now clarified as "remove + add revalidateTag"

**Analysis Report**: See [../ANALYSIS.md](../ANALYSIS.md) for specification consistency audit

---

## Summary

**Total tasks**: 28  
**Parallelisable tasks**: 11 (marked [P])  
**User Stories**: 3 (US1 P1, US2 P2, US3 P3)

**Phases**:

1. **Setup** (3 tasks) — Enable `cacheComponents`, create cache tags, cursor utility
2. **Foundational** (4 tasks) — Query DTOs, cursor-based pagination in repositories
3. **US1: Store List Queries** (7 tasks) — Cached query functions, GET route, SSR page, client refactor
4. **US2: Document List Queries** (8 tasks) — Cached query functions, GET routes, enrichment polling
5. **US3: Custom JSON Mutation Cache** (2 tasks) — `revalidateTag` in custom doc mutations
6. **Polish** (4 tasks) — Prev/next pagination UI, URL roundtrip validation, cleanup

**What this changes**: Server Actions (`listStoresAction`, `listDocumentsAction`) are removed. All queries go through `'use cache'` functions called from SSR pages and GET route handlers. TanStack Query calls GET routes (not Server Actions). Mutations add `revalidateTag(tag, 'max')` to invalidate caches. Enrichment polling uses per-document `refetchInterval`.

---

## Dependency Graph

```
Phase 1: Setup
    ↓
Phase 2: Foundational ─────────────────────────────────┐
    ↓                                                   │
    ├──► Phase 3: US1 (Store List Queries)              │
    │              │                                    │
    │              ▼                                    │
    ├──► Phase 4: US2 (Document List Queries) ──────────┘
    │
    └──► Phase 5: US3 (Custom JSON Mutation Cache)
                   │
                   ▼
            Phase 6: Polish
```

---

## Phase 1: Setup — Cache Infrastructure

**Purpose**: Enable Next.js 16 `'use cache'` directive and create shared utilities for cache tags and cursor encoding.

- [x] T001 Enable `cacheComponents: true` in [next.config.ts](../../next.config.ts) — required for `'use cache'` directive, `cacheTag()`, and `cacheLife()` to function
- [x] T002 [P] Create [src/lib/cache-tags.ts](../../src/lib/cache-tags.ts) — export three tag builder functions: `storeCacheTag(orgId: string) → 'stores-${orgId}'`, `storeDetailCacheTag(orgId: string, id: string) → 'store-${orgId}-${id}'`, `docsCacheTag(orgId: string, storeId: string) → 'docs-${orgId}-${storeId}'`
- [x] T003 [P] Create cursor encoding utility in [src/lib/cursor.ts](../../src/lib/cursor.ts) — `encodeCursor(item: { id: string; sortValue: string | number }): string` (base64url of JSON), `decodeCursor(cursor: string): { id: string; sortValue: string | number } | null` (returns null on invalid input; no throw)

---

## Phase 2: Foundational — Query DTOs & Cursor Pagination (Blocking All Stories)

**Purpose**: Zod schemas for GET query parameters and cursor-based pagination methods on existing repositories. MUST complete before any user story phase.

- [x] T004 [P] Create [src/data/stores/dto/store-query-dto.ts](../../src/data/stores/dto/store-query-dto.ts) — Zod schemas per contract [get-stores.md](./contracts/get-stores.md): `StoreSortKeySchema` (enum: `createdAt_desc`, `createdAt_asc`, `name_asc`, `name_desc`), `StoreListQuerySchema` (`q` max 100, `sort`, `cursor` optional, `limit` coerce int 1–100 default 25); and per contract [get-documents.md](./contracts/get-documents.md): `DocumentSortKeySchema` (enum: `createdAt_desc`, `createdAt_asc`, `name_asc`, `updatedAt_desc`), `DocumentKindSchema` (optional enum of all `DocumentKind` values), `DocumentListQuerySchema` (`q`, `sort`, `kind`, `cursor`, `limit`)
- [x] T005 Add `findByOrgPaginated()` method to [src/data/stores/repositories/store-repository.ts](../../src/data/stores/repositories/store-repository.ts) — accepts `{ q?: string; sort: StoreSortKey; cursor?: string; limit: number }`, calls `decodeCursor()` to extract `{ id, sortValue }`, builds Firestore query with `orderBy(field, dir).orderBy('__name__', dir)`, if cursor: `.startAfter(sortValue, id)`, applies prefix filter if `q` set, returns `Result<{ items: Store[]; nextCursor: string | null }, AppError>` where `nextCursor = items.length < limit ? null : encodeCursor(lastItem)`
- [x] T006 Add `findByStorePaginated()` method to [src/data/stores/repositories/store-document-repository.ts](../../src/data/stores/repositories/store-document-repository.ts) — accepts `{ q?: string; sort: DocumentSortKey; kind?: DocumentKind; cursor?: string; limit: number }`, same cursor mechanics as T005, adds `where('kind', '==', kind)` filter when `kind` is set, returns `Result<{ items: StoreDocument[]; nextCursor: string | null }, AppError>`
- [x] T007 [P] Export `PaginatedResult<T>` type from [src/data/stores/repositories/store-repository.ts](../../src/data/stores/repositories/store-repository.ts) — `{ items: T[]; nextCursor: string | null }` — reused by both repositories and query functions

---

## Phase 3: User Story 1 — Store List Query Migration [P1] 🎯

**Goal**: Store listing (search, sort, pagination) served via SSR `'use cache'` + GET route handler instead of `listStoresAction` Server Action.

**Independent Test**: Load `/stores` — SSR renders first page → change sort → TanStack Query fetches from GET `/api/stores?sort=name_asc` → type search prefix → debounced fetch → click Next page → cursor param appended → verify 25-item pages with correct cursor flow → create a store → verify cache invalidated and list reflects new store.

### Cached Query Functions

- [x] T008 [US1] Create [src/data/stores/queries/list-stores-query.ts](../../src/data/stores/queries/list-stores-query.ts) — async function `listStoresQuery(orgId: string, options: { q?: string; sort: StoreSortKey; cursor?: string; limit: number })` with `'use cache'` directive at top; calls `cacheTag(storeCacheTag(orgId))` and `cacheLife('minutes')`; instantiates `StoreRepository(orgId)` and calls `findByOrgPaginated(options)`; returns `Result<PaginatedResult<Store>, AppError>`
- [x] T009 [P] [US1] Create [src/data/stores/queries/get-store-query.ts](../../src/data/stores/queries/get-store-query.ts) — async function `getStoreQuery(orgId: string, storeId: string)` with `'use cache'`; calls `cacheTag(storeDetailCacheTag(orgId, storeId))` and `cacheLife('minutes')`; calls `StoreRepository(orgId).findById(storeId)`; returns `Result<Store, AppError>`

### GET Route Handlers

- [x] T010 [US1] Create [src/app/api/stores/route.ts](../../src/app/api/stores/route.ts) — `export async function GET(request: Request)` wrapped in `withAuthenticatedContext`: parse `searchParams` with `StoreListQuerySchema.safeParse()` (return 400 on failure), call `listStoresQuery(ctx.orgId, parsed.data)`, return `NextResponse.json({ stores: result.value.items, nextCursor: result.value.nextCursor })` on success or error JSON with status code on failure
- [x] T011 [P] [US1] Create [src/app/api/stores/[storeId]/route.ts](../../src/app/api/stores/[storeId]/route.ts) — `GET` handler: fetch single store via `getStoreQuery(ctx.orgId, storeId)`, verify `store.orgId === ctx.orgId`, return `{ store }` or 404

### Mutation Cache Invalidation

- [x] T012 [US1] Modify [src/actions/store-actions.ts](../../src/actions/store-actions.ts) — (a) remove `listStoresAction` function entirely (queries no longer live in `"use server"` files), (b) add `import { revalidateTag } from 'next/cache'` and `import { storeCacheTag, storeDetailCacheTag } from '@/lib/cache-tags'`, (c) add `revalidateTag(storeCacheTag(ctx.orgId), 'max')` after successful `createStoreAction`, (d) add `revalidateTag(storeDetailCacheTag(ctx.orgId, storeId), 'max')` + `revalidateTag(storeCacheTag(ctx.orgId), 'max')` after successful `updateStoreAction` and `deleteStoreAction`

### SSR Page Refactor

- [x] T013 [US1] Modify [src/app/(platform)/stores/page.tsx](<../../src/app/(platform)/stores/page.tsx>) — replace direct `StoreRepository.findByOrg()` call with `listStoresQuery(orgId, { sort, q, cursor, limit: 25 })` where `sort`, `q`, `cursor` are read from `searchParams`; pass `initialStores`, `initialNextCursor`, and `orgId` to `StoreListClient`

### Client Component Refactor

- [x] T014 [US1] Modify [src/components/stores/store-list-client.tsx](../../src/components/stores/store-list-client.tsx) — (a) remove import of `listStoresAction`, (b) change `queryFn` from calling `listStoresAction(...)` to `fetch('/api/stores?' + params).then(r => r.json())` where `params` includes `q`, `sort`, `cursor`, `limit`, (c) update `initialData` to `{ stores: initialStores, nextCursor: initialNextCursor }`, (d) add `initialNextCursor` to props interface, (e) replace offset-based pagination with cursor-based: store a `cursorStack: string[]` in state, Next button passes `cursor=nextCursor`, Prev button pops from stack, (f) update query response destructuring to `{ stores, nextCursor }`

**Checkpoint**: Store list is fully served via SSR cache + GET route. `listStoresAction` is gone. Pagination is cursor-based.

---

## Phase 4: User Story 2 — Document List Query Migration [P2]

**Goal**: Document listing (search, sort, kind filter, pagination) served via SSR `'use cache'` + GET route handler. Enrichment status polling uses per-document `refetchInterval` against a single-document GET route.

**Independent Test**: Open `/stores/{storeId}` — SSR renders first page of docs → filter by kind → sort → search → paginate → upload file → verify cache invalidated → observe `pending` status badge → wait for enrichment polling (4s interval) → see `completed` with keyword chips.

### Cached Query Functions

- [x] T015 [US2] Create [src/data/stores/queries/list-documents-query.ts](../../src/data/stores/queries/list-documents-query.ts) — async function `listDocumentsQuery(orgId: string, storeId: string, options: { q?: string; sort: DocumentSortKey; kind?: DocumentKind; cursor?: string; limit: number })` with `'use cache'`; calls `cacheTag(docsCacheTag(orgId, storeId))` and `cacheLife('minutes')`; calls `StoreDocumentRepository(orgId, storeId).findByStorePaginated(options)`; returns `Result<PaginatedResult<StoreDocument>, AppError>`

### GET Route Handlers

- [x] T016 [US2] Create [src/app/api/stores/[storeId]/documents/route.ts](../../src/app/api/stores/[storeId]/documents/route.ts) — `GET` handler wrapped in `withAuthenticatedContext`: validate `storeId` belongs to org (call `getStoreQuery`; 404 if not found, 403 if wrong org), parse query params with `DocumentListQuerySchema.safeParse()`, call `listDocumentsQuery(ctx.orgId, storeId, parsed.data)`, return `{ documents, nextCursor }` or error; strip `embedding` field from response (internal field)
- [ ] T017 [P] [US2] Create [src/app/api/stores/[storeId]/documents/[docId]/route.ts](../../src/app/api/stores/[storeId]/documents/[docId]/route.ts) — `GET` handler: fetch single document via `StoreDocumentRepository(ctx.orgId, storeId).findById(docId)`, verify org membership, return `{ document }` (strip `embedding`); used for enrichment-status polling

### Mutation Cache Invalidation

- [ ] T018 [US2] Modify [src/actions/document-actions.ts](../../src/actions/document-actions.ts) — (a) remove `listDocumentsAction` function entirely, (b) add `import { revalidateTag } from 'next/cache'` and `import { docsCacheTag, storeDetailCacheTag } from '@/lib/cache-tags'`, (c) add `revalidateTag(docsCacheTag(ctx.orgId, storeId), 'max')` + `revalidateTag(storeDetailCacheTag(ctx.orgId, storeId), 'max')` after successful `deleteDocumentAction`, (d) add same tags to `getSignedUploadUrlAction` (file doc creates a Firestore record), (e) add `revalidateTag(docsCacheTag(ctx.orgId, storeId), 'max')` after successful `createCustomDocumentAction`

### SSR Page Refactor

- [ ] T019 [US2] Modify [src/app/(platform)/stores/[storeId]/page.tsx](<../../src/app/(platform)/stores/[storeId]/page.tsx>) — replace direct `StoreDocumentRepository.findByStore()` with `listDocumentsQuery(orgId, storeId, { sort, q, kind, cursor, limit: 25 })` and `getStoreQuery(orgId, storeId)`; read `sort`, `q`, `kind`, `cursor` from `searchParams`; pass `initialDocuments`, `initialNextCursor` to `StoreDetailClient`

### Client Component Refactor

- [ ] T020 [US2] Modify [src/components/stores/document-list-client.tsx](../../src/components/stores/document-list-client.tsx) — (a) remove import of `listDocumentsAction`, (b) change `queryFn` to `fetch('/api/stores/${storeId}/documents?' + params)`, (c) add cursor-based pagination (same pattern as T014: `cursorStack` state, Next/Prev), (d) remove client-side `kind` and `dq` filtering (now server-side via query params), (e) update response destructuring to `{ documents, nextCursor }`

### Enrichment Status Polling

- [ ] T021 [P] [US2] Add enrichment-status polling to [src/components/stores/document-row.tsx](../../src/components/stores/document-row.tsx) — add a `useQuery` per document row where `context.status === 'pending' || context.status === 'processing'`: `queryKey: ['doc-status', orgId, storeId, doc.id]`, `queryFn: fetch('/api/stores/${storeId}/documents/${doc.id}', { cache: 'no-store' })`, `refetchInterval: (q) => { const s = q.state.data?.document?.context?.status; return s === 'completed' || s === 'failed' ? false : 4000 }`, `initialData: { document: doc }`; render enrichment badge from polling data instead of prop
- [ ] T022 [P] [US2] Modify [src/components/stores/store-detail-client.tsx](../../src/components/stores/store-detail-client.tsx) — update props to accept `initialNextCursor: string | null`; pass through to `DocumentListClient`

**Checkpoint**: Document list is served via SSR cache + GET route. `listDocumentsAction` is gone. Enrichment polling hits single-document GET route at 4s intervals until terminal status. Cursor pagination works.

---

## Phase 5: User Story 3 — Custom JSON Mutation Cache Invalidation [P3]

**Goal**: Custom JSON create/update mutations invalidate the document list cache so the list reflects changes.

- [x] T023 [US3] Verify `revalidateTag` calls in [src/actions/document-actions.ts](../../src/actions/document-actions.ts) cover `createCustomDocumentAction` — must call `revalidateTag(docsCacheTag(ctx.orgId, storeId), 'max')` and `revalidateTag(storeDetailCacheTag(ctx.orgId, storeId), 'max')` after success (may already be done in T018; verify and add if missing)
- [x] T024 [US3] Verify `revalidateTag` calls in [src/actions/document-actions.ts](../../src/actions/document-actions.ts) cover `updateCustomDocumentAction` — must call `revalidateTag(docsCacheTag(ctx.orgId, storeId), 'max')` after success (update resets `aiStatus` to `pending`, so enrichment re-triggers)

**Checkpoint**: All mutation Server Actions invalidate the right cache tags. `"use server"` files contain mutations only.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T025 [P] Add Prev/Next pagination controls to [src/components/stores/store-list-client.tsx](../../src/components/stores/store-list-client.tsx) and [src/components/stores/document-list-client.tsx](../../src/components/stores/document-list-client.tsx) — Prev button disabled when `cursorStack` is empty; Next button disabled when `nextCursor === null`; button styling uses HeroUI `Button` with `variant="bordered"`
- [ ] T026 [P] Validate URL parameter roundtrip: navigate to `/stores?q=Acme&sort=name_asc&cursor=...` → verify SSR renders matching results → refresh page → verify same results (bookmark test); same for `/stores/{storeId}?dq=report&dsort=name_asc&kind=pdf`
- [ ] T027 Remove stale `page` query param references from [src/components/stores/store-list-client.tsx](../../src/components/stores/store-list-client.tsx) and [src/components/stores/document-list-client.tsx](../../src/components/stores/document-list-client.tsx) — replace with `cursor` param; remove any offset-based pagination logic
- [ ] T028 Run `npm run lint && npm test` to verify all changes compile without errors, no `any` types, no unused imports

---

## Dependencies (Story Completion Order)

```
Phase 1 (Setup: cache config + tags + cursor util)
    ↓
Phase 2 (Foundational: query DTOs + paginated repos)
    ↓
    ├──► Phase 3 (US1: Store list queries) ─────── First to migrate
    │              │
    │              ▼
    ├──► Phase 4 (US2: Document list queries) ──── Depends on US1 GET patterns
    │
    └──► Phase 5 (US3: Custom JSON cache tags) ─── Independent, can parallel with US2
                   │
                   ▼
            Phase 6 (Polish: pagination UI, validation, cleanup)
```

---

## Parallel Execution Examples

### Wave 1: Setup + Foundational (Phases 1 & 2)

| Track A                          | Track B                          |
| -------------------------------- | -------------------------------- |
| T001 Enable `cacheComponents`    | T002 Create `cache-tags.ts`      |
| T004 Create `store-query-dto.ts` | T003 Create `cursor.ts`          |
| T005 Add `findByOrgPaginated`    | T006 Add `findByStorePaginated`  |
| —                                | T007 Export `PaginatedResult<T>` |

### Wave 2: US1 Store Queries (Phase 3)

| Track A                             | Track B                                |
| ----------------------------------- | -------------------------------------- |
| T008 `list-stores-query.ts`         | T009 `get-store-query.ts`              |
| T010 GET `/api/stores` route        | T011 GET `/api/stores/[storeId]` route |
| T012 Modify `store-actions.ts`      | —                                      |
| T013 Modify stores `page.tsx`       | —                                      |
| T014 Modify `store-list-client.tsx` | —                                      |

### Wave 3: US2 Document Queries + US3 Cache (Phases 4 & 5)

| Track A (US2)                          | Track B (US2)                             | Track C (US3)                  |
| -------------------------------------- | ----------------------------------------- | ------------------------------ |
| T015 `list-documents-query.ts`         | T017 GET `documents/[docId]/route.ts`     | T023 Verify custom create tags |
| T016 GET `documents/route.ts`          | T021 Enrichment polling in `document-row` | T024 Verify custom update tags |
| T018 Modify `document-actions.ts`      | T022 Update `store-detail-client.tsx`     | —                              |
| T019 Modify `[storeId]/page.tsx`       | —                                         | —                              |
| T020 Modify `document-list-client.tsx` | —                                         | —                              |

### Wave 4: Polish (Phase 6)

| Track A                  | Track B                       |
| ------------------------ | ----------------------------- |
| T025 Pagination controls | T026 URL roundtrip validation |
| T027 Remove stale params | T028 Lint + test              |

---

## Implementation Strategy

**This is a refactor of existing, working code** — all original tasks (T001–T069 from the initial tasks.md) are complete. The approach:

1. **Phase 1+2 first** — infrastructure must exist before any query migration
2. **US1 (Phase 3) next** — stores list is the most visible query; validates the pattern end-to-end
3. **US2 (Phase 4) in parallel with US3 (Phase 5)** — documents list + enrichment polling; custom doc cache tags
4. **Phase 6 last** — pagination UI polish, cleanup, verify

**Risk**: `'use cache'` requires `cacheComponents: true` which may affect other cached routes. Verify no regression in auth/onboarding pages after T001.

**Rollback**: If `'use cache'` causes issues, fall back to `unstable_cache` (deprecated but functional in Next.js 16) as a temporary measure while investigating.

---

## Notes

**Removed functions**: `listStoresAction` (from `store-actions.ts`), `listDocumentsAction` (from `document-actions.ts`) — all queries now go through GET routes  
**New directories**: `src/data/stores/queries/`, `src/app/api/stores/route.ts` and nested route files  
**Cursor format**: `base64url(JSON({ id, sortValue }))` — opaque to clients  
**Pagination**: Prev requires client-side `cursorStack` array; Next uses `nextCursor` from API response  
**Enrichment polling**: 4s interval per document row until `completed` or `failed`; uses `cache: 'no-store'` to bypass SSR cache  
**Cache lifetime**: `cacheLife('minutes')` — ~5 min default; stale-while-revalidate via `revalidateTag(tag, 'max')`

---

## Previous Implementation Tasks (Completed)

<details>
<summary>Original 69 tasks (all ✅ completed) — click to expand</summary>

**Phases**:

1. **Setup** (4 tasks) — Project configuration, Firestore indexes, security rules
2. **Foundational** (8 tasks) — Shared models, repositories, DTOs (blocking all stories)
3. **US1: Store Lifecycle** (12 tasks) — Create, list, edit, delete stores (P1 — MVP)
4. **US2: File Management** (12 tasks) — Upload, list, download, delete files (P2)
5. **US3: Custom JSON Data** (8 tasks) — Create, view, edit, delete JSON records (P3)
6. **AI Enrichment Pipeline** (14 tasks) — Cloud Functions + LangGraph workflow
7. **Polish & Cross-cutting** (8 tasks) — Navigation, error handling, accessibility

---

## Dependency Graph

```
Phase 1: Setup
    ↓
Phase 2: Foundational ──────────────────────┬─ Phase 6: AI Enrichment
    ↓                                        │
    ├─→ Phase 3: US1 (Store Lifecycle) ─────┘
    │
    ├─→ Phase 4: US2 (File Management)
    │
    └─→ Phase 5: US3 (Custom JSON)
         ↓
    Phase 7: Polish
```

---

## Phase 1: Setup — Project Configuration

- [ ] T001 Enable Firestore vector indexing and deploy initial indexes in [firestore.indexes.json](../../firestore.indexes.json) for document queries and semantic search
- [ ] T002 [P] Update Firestore security rules in [firestore.rules](../../firestore.rules) to enforce `orgId` multi-tenant isolation for `stores` and `documents` collections
- [ ] T003 [P] Create project structure: `src/data/stores/` with subdirectories `models/`, `repositories/`, `use-cases/`, `dto/` in [src/data/stores/](../../src/data/stores/)
- [ ] T004 [P] Create project structure: `src/components/stores/` directory for UI components in [src/components/stores/](../../src/components/stores/)

---

## Phase 2: Foundational — Shared Infrastructure (Blocking All Stories)

- [ ] T005 [P] Create `Store` model and Zod schema in [src/data/stores/models/store.model.ts](../../src/data/stores/models/store.model.ts) with all fields: id, orgId, name, description, documentCount, fileCount, customCount, createdBy, createdAt, updatedAt
- [ ] T006 [P] Create `StoreDocument` model with `DocumentKind` discriminator in [src/data/stores/models/store-document.model.ts](../../src/data/stores/models/store-document.model.ts) including file-specific and AI enrichment fields
- [ ] T007 [P] Create utility function `inferDocumentKind()` in [src/data/stores/lib/infer-document-kind.ts](../../src/data/stores/lib/infer-document-kind.ts) mapping MIME types to DocumentKind enum
- [x] T008 [P] Create Zod DTOs for store and document operations in [src/data/stores/dto/](../../src/data/stores/dto/) with validation schemas for all CRUD operations
- [x] T009 [P] Create `StoreRepository` in [src/data/stores/repositories/store-repository.ts](../../src/data/stores/repositories/store-repository.ts) extending `AbstractFirebaseRepository` with query methods
- [x] T010 [P] Create `StoreDocumentRepository` in [src/data/stores/repositories/store-document-repository.ts](../../src/data/stores/repositories/store-document-repository.ts) with CRUD and semantic search methods
- [x] T011 [P] Create helper functions in [src/data/stores/lib/](../../src/data/stores/lib/) for file operations: `humanReadableFileSize()`, `validateJsonSyntax()`, `cascadeDeleteDocumentsInStore()`
- [x] T012 Deploy Firestore composite indexes for store queries via `firebase deploy --only firestore:indexes`

---

## Phase 3: User Story 1 — Store Lifecycle Management [P1]

**Goal**: User can create, list, edit, and delete stores scoped to their organisation.  
**Independent Test**: Create store → verify in list → edit name → delete with confirmation → verify removal.

### Use Cases & Logic

- [x] T013 [US1] Create `CreateStoreUseCase` in [src/data/stores/use-cases/create-store.use-case.ts](../../src/data/stores/use-cases/create-store.use-case.ts) validating name uniqueness and persisting store
- [x] T014 [US1] Create `UpdateStoreUseCase` in [src/data/stores/use-cases/update-store.use-case.ts](../../src/data/stores/use-cases/update-store.use-case.ts) with name/description validation and uniqueness check
- [x] T015 [US1] Create `DeleteStoreUseCase` in [src/data/stores/use-cases/delete-store.use-case.ts](../../src/data/stores/use-cases/delete-store.use-case.ts) with cascade deletion of documents and Storage objects
- [x] T016 [US1] Create `ListStoresUseCase` in [src/data/stores/use-cases/list-stores.use-case.ts](../../src/data/stores/use-cases/list-stores.use-case.ts) supporting sort, search, and pagination

### Server Actions & API

- [ ] T017 [US1] Create `createStoreAction`, `updateStoreAction`, `deleteStoreAction` in [src/actions/store-actions.ts](../../src/actions/store-actions.ts) wrapped in `withContext()`
- [ ] T018 [US1] Create `listStoresAction` in [src/actions/store-actions.ts](../../src/actions/store-actions.ts) for paginated store listing
- [ ] T019 [US1] Create `src/app/(platform)/stores/page.tsx` server page fetching initial stores and passing to client component

### UI Components

- [ ] T020 [P] [US1] Create `StoreCard` component in [src/components/stores/store-card.tsx](../../src/components/stores/store-card.tsx) displaying store info with action buttons
- [ ] T021 [P] [US1] Create `StoreCreateForm` modal in [src/components/stores/store-create-form.tsx](../../src/components/stores/store-create-form.tsx) with name and description inputs
- [ ] T022 [P] [US1] Create `StoreEditForm` modal in [src/components/stores/store-edit-form.tsx](../../src/components/stores/store-edit-form.tsx) for updating store details
- [x] T023 [US1] Create `StoreListClient` in [src/components/stores/store-list-client.tsx](../../src/components/stores/store-list-client.tsx) with search, sort, and pagination UI
- [x] T024 [US1] Create loading skeleton at [src/app/(platform)/stores/loading.tsx](<../../src/app/(platform)/stores/loading.tsx>)

---

## Phase 4: User Story 2 — File Management Within a Store [P2]

**Goal**: User can upload files to a store via signed URLs, view file list, download, and delete individual files.  
**Independent Test**: Open store → upload PDF → verify in list → click to download → delete with confirmation → verify removal.

### Use Cases & Logic

- [ ] T025 [US2] Create `GetSignedUploadUrlUseCase` in [src/data/stores/use-cases/get-signed-upload-url.use-case.ts](../../src/data/stores/use-cases/get-signed-upload-url.use-case.ts) handling upsert and URL generation
- [ ] T026 [US2] Create `GetSignedDownloadUrlUseCase` in [src/data/stores/use-cases/get-signed-download-url.use-case.ts](../../src/data/stores/use-cases/get-signed-download-url.use-case.ts) for file downloads
- [ ] T027 [US2] Create `DeleteDocumentUseCase` in [src/data/stores/use-cases/delete-document.use-case.ts](../../src/data/stores/use-cases/delete-document.use-case.ts) with coordinated Firestore and Storage cleanup

### Server Actions & API Routes

- [ ] T028 [US2] Add `getSignedUploadUrlAction` to [src/actions/store-actions.ts](../../src/actions/store-actions.ts) for upload URL generation
- [ ] T029 [US2] Add `getSignedDownloadUrlAction` and `deleteDocumentAction` to [src/actions/document-actions.ts](../../src/actions/document-actions.ts)
- [ ] T030 [US2] Create API download route at [src/app/api/stores/[storeId]/documents/[docId]/download/route.ts](../../src/app/api/stores/[storeId]/documents/[docId]/download/route.ts)
- [ ] T031 [US2] Create store detail page at [src/app/(platform)/stores/[storeId]/page.tsx](<../../src/app/(platform)/stores/[storeId]/page.tsx>) with document list
- [ ] T032 [US2] Create loading skeleton at [src/app/(platform)/stores/[storeId]/loading.tsx](<../../src/app/(platform)/stores/[storeId]/loading.tsx>)

### UI Components

- [ ] T033 [P] [US2] Create `DocumentRow` component in [src/components/stores/document-row.tsx](../../src/components/stores/document-row.tsx) displaying file info with AI status badges
- [ ] T034 [P] [US2] Create `DocumentUploadButton` in [src/components/stores/document-upload-button.tsx](../../src/components/stores/document-upload-button.tsx) with drag-and-drop and progress
- [ ] T035 [US2] Create `DocumentListClient` in [src/components/stores/document-list-client.tsx](../../src/components/stores/document-list-client.tsx) with filtering, sorting, pagination
- [ ] T036 [US2] Create `StoreDetailClient` in [src/components/stores/store-detail-client.tsx](../../src/components/stores/store-detail-client.tsx) wrapper with tabs for document management

---

## Phase 5: User Story 3 — Custom JSON Data Records [P3]

**Goal**: User can create named JSON records, view, edit content, and delete within a store.  
**Independent Test**: Open store → Custom Records tab → create with valid JSON → verify in list → edit JSON → delete → verify removal.

### Use Cases & Logic

- [ ] T037 [US3] Create `CreateCustomDocumentUseCase` in [src/data/stores/use-cases/create-custom-document.use-case.ts](../../src/data/stores/use-cases/create-custom-document.use-case.ts) with JSON validation
- [ ] T038 [US3] Create `UpdateCustomDocumentUseCase` in [src/data/stores/use-cases/update-custom-document.use-case.ts](../../src/data/stores/use-cases/update-custom-document.use-case.ts) resetting enrichment status on update

### Server Actions

- [ ] T039 [US3] Add `createCustomDocumentAction` and `updateCustomDocumentAction` to [src/actions/document-actions.ts](../../src/actions/document-actions.ts)
- [ ] T040 [US3] Create document detail page at [src/app/(platform)/stores/[storeId]/documents/[docId]/page.tsx](<../../src/app/(platform)/stores/[storeId]/documents/[docId]/page.tsx>)

### UI Components

- [ ] T041 [P] [US3] Create `CustomDocumentForm` in [src/components/stores/custom-document-form.tsx](../../src/components/stores/custom-document-form.tsx) with JSON editor and validation
- [ ] T042 [P] [US3] Create `CustomDocumentViewer` in [src/components/stores/custom-document-viewer.tsx](../../src/components/stores/custom-document-viewer.tsx) with syntax highlight and edit capability
- [ ] T043 [US3] Add delete confirmation modal logic for JSON records in document components

---

## Phase 6: AI Enrichment Pipeline — Cloud Functions

**Goal**: Asynchronously enrich documents with AI-extracted metadata (summary, keywords, embeddings, File Search indexing).

### Graph Nodes (Reusable)

- [ ] T044 [P] Create `set-processing-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) updating document status to processing
- [ ] T045 [P] Create `handle-error-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) capturing enrichment errors gracefully
- [ ] T046 [P] Create `write-enrichment-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) persisting enrichment results to Firestore
- [ ] T047 [P] Create `generate-embedding-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) calling text-embedding-004 for 768-dim vectors
- [ ] T048 [P] Create `extract-keywords-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) extracting ≤20 keyword tags from Gemini Flash

### File Enrichment Graph & Function

- [ ] T049 Create `infer-kind-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) mapping MIME type to DocumentKind
- [ ] T050 Create `extract-text-summary-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) calling Gemini Flash multimodal for text extraction and summary
- [ ] T051 Create `index-in-gemini-file-search-node.ts` in [functions/src/nodes/](../../functions/src/nodes/) indexing files in Gemini File Search corpus
- [ ] T052 Create `file-enrichment-graph.ts` in [functions/src/workflows/](../../functions/src/workflows/) orchestrating file enrichment pipeline
- [ ] T053 Create Cloud Function `enrichFileDocument` in [functions/src/handles/enrich-file-document.ts](../../functions/src/handles/enrich-file-document.ts) triggered on Storage upload

### Custom Document Enrichment Graph & Function

- [ ] T054 Create `custom-enrichment-graph.ts` in [functions/src/workflows/](../../functions/src/workflows/) for JSON document enrichment without file steps
- [ ] T055 Create Cloud Function `enrichCustomDocument` in [functions/src/handles/enrich-custom-document.ts](../../functions/src/handles/enrich-custom-document.ts) triggered on Firestore create/update
- [ ] T056 Create `on-store-document-deleted.ts` in [functions/src/handles/](../../functions/src/handles/) for cleanup on document deletion
- [ ] T057 Create `functions/src/index.ts` exporting all Cloud Functions

### Functions Infrastructure

- [ ] T058 Create `functions/src/lib/genkit.ts` initializing Genkit with Vertex AI plugin and models

---

## Phase 7: Polish & Cross-Cutting Concerns

### Deployment & Infrastructure

- [ ] T059 Update `firebase.json` with functions configuration and pre-deploy build hook
- [ ] T060 Deploy Firestore indexes and verify vector index build status

### Navigation & Routing

- [ ] T061 [P] Add "Stores" navigation link in [src/components/layout/platform-nav.tsx](../../src/components/layout/platform-nav.tsx) with active state
- [ ] T062 [P] Create breadcrumb navigation for store detail pages linking back to `/stores`

### Error Handling & UX

- [ ] T063 [P] Add error boundary components for store list and detail pages
- [ ] T064 [P] Add loading state skeletons for document list rows and paginated sections
- [ ] T065 [P] Implement error retry buttons and failure state handling in mutations

### Accessibility & Polish

- [ ] T066 Add ARIA labels and keyboard navigation to modals and dropdowns
- [ ] T067 Update [src/lib/tokens.ts](../../src/lib/tokens.ts) with store-specific design tokens for AI badges and card styling
- [ ] T068 Create integration tests for critical paths: store CRUD, file upload/download, cascade deletion
- [ ] T069 Add OpenTelemetry tracing for store operations and enrichment pipeline state transitions

---

## Success Criteria

- [x] All setup and foundational tasks enable independent story implementation
- [x] US1 (Store Lifecycle) is independently deployable and testable (MVP)
- [x] US2 (File Management) builds on US1 without breaking changes
- [x] US3 (Custom JSON) is parallel-implementable with US2
- [x] AI Enrichment pipeline runs asynchronously with graceful failures
- [x] Firestore security rules enforce multi-tenant isolation
- [x] List views support pagination, search (prefix-only for stores), and sort
- [x] Delete operations cascade correctly and are idempotent
- [x] All components use Hero UI library consistently
- [x] No public data leaks between organisations

---

## Notes

**File Size Limit**: 50 MB per upload (validated client and server-side)  
**Signed URL Expiry**: 15 minutes for both upload and download  
**Search Implementation**: Prefix-only matching for store/document names (Firestore limitation)  
**Enrichment Retries**: Exponential backoff up to 3 attempts before marking as permanently failed  
**Gemini File Search Corpus**: Named `kb-{orgId}-{storeId}`, auto-created on first file upload, deleted with store  
**Vector Embedding**: 768-dim text-embedding-004, stored in Firestore for semantic search and RAG indexing  
**Cascade Deletion**: Store deletion deletes all documents + Storage objects in batches ≤500 per Firestore limits

---

## Phase 1: Infrastructure Setup

**Purpose**: Firebase Functions package init, Firestore index/rule updates, env vars, and shared utilities. Must complete before any user story implementation.

- [x] T001 Initialise Firebase Functions v2 package at `functions/` with TypeScript, Node.js 22, and install `@langchain/langgraph`, `@google-cloud/vertexai`, `firebase-admin`, `firebase-functions`
- [x] T002 [P] Add `FIREBASE_STORAGE_BUCKET` and `VERTEX_AI_LOCATION` to `.env.local` and document in `specs/002-store-module/quickstart.md` env vars section
- [x] T003 [P] Add Firestore composite indexes and 768-dim vector index from `data-model.md` to `firestore.indexes.json`
- [x] T004 [P] Add Firestore security rules for `stores` and `documents` subcollections to `firestore.rules` (org-member isolation on `orgId`)
- [x] T005 [P] Add Cloud Storage security rules (deny all public read/write; all access via Admin SDK) to `storage.rules`
- [x] T006 Add `functions/src/lib/admin-firestore.ts` — Firestore Admin singleton for Functions
- [x] T007 [P] Add `functions/src/lib/admin-storage.ts` — export `adminStorage` using `getStorage(adminApp)` from `firebase-admin/storage` and `adminApp` from `admin-firestore.ts`; export `getBucket()` helper returning `adminStorage.bucket(process.env.FIREBASE_STORAGE_BUCKET)`. _(T011 merged here — single Storage Admin singleton for Functions.)_
- [x] T008 [P] Add `functions/src/lib/vertex-ai.ts` — `VertexAI` client + `RagDataServiceClient` singletons initialized from `GOOGLE_CLOUD_PROJECT` and `VERTEX_AI_LOCATION`
- [x] T009 [P] Add `functions/src/lib/infer-document-kind.ts` — `inferDocumentKind(mimeType: string): DocumentKind` mapping function (MIME → `image|pdf|doc|sheet|video|audio|text|custom`)
- [x] T010 [P] Add `functions/src/lib/corpus-name.ts` — `deriveCorpusName(orgId: string, storeId: string): string` returning `kb-{orgId}-{storeId}` (alphanumeric + hyphens, ≤128 chars, truncated if needed)

---

## Phase 2: Domain Foundation (Blocking All User Stories)

**Purpose**: `Store` and `StoreDocument` models, repositories, and DTOs that every user story depends on.

- [x] T012 Add `src/data/stores/models/store.model.ts` — `Store` interface: `id`, `orgId`, `name`, `description: string | null`, `documentCount`, `fileCount`, `customCount`, `createdBy`, `createdAt: Date`, `updatedAt: Date`
- [x] T013 [P] Add `src/data/stores/models/store-document.model.ts` — `DocumentKind` union (`image|pdf|doc|sheet|video|audio|text|custom`), `AiStatus` union (`pending|processing|done|error`), and `StoreDocument` interface with all fields from `data-model.md` (AI enrichment fields, file-specific fields, custom-specific fields)
- [x] T014 Add `src/data/stores/dto/store-dto.ts` — Zod schemas: `CreateStoreSchema` (`name` 1–100 chars trimmed, `description` max 500 chars optional), `UpdateStoreSchema` (`storeId` required + partial name/description), `DeleteStoreSchema` (`storeId` required)
- [x] T015 [P] Add `src/data/stores/dto/document-dto.ts` — Zod schemas: `GetSignedUploadUrlSchema` (`storeId`, `filename` 1–500, `mimeType`, `sizeBytes` max 52_428_800), `GetSignedDownloadUrlSchema` (`storeId`, `docId`), `DeleteDocumentSchema` (`storeId`, `docId`)
- [x] T016 [P] Add `src/data/stores/dto/custom-document-dto.ts` — Zod schemas: `CreateCustomDocumentSchema` (`storeId`, `name` 1–100, `jsonBody` with `.refine(v => { try { JSON.parse(v); return true } catch { return false } })`), `UpdateCustomDocumentSchema` (partial name/body + storeId + docId)
- [x] T017 Add `src/data/stores/repositories/store-repository.ts` — `StoreRepository extends AbstractFirebaseRepository<Store>` with `collectionPath: organizations/${orgId}/stores`, `fromFirestore()` mapping Timestamps → Dates, `findByOrg(orgId, options)`, `nameExists(orgId, name, excludeId?)` for uniqueness check
- [x] T018 Add `src/data/stores/repositories/store-document-repository.ts` — `StoreDocumentRepository extends AbstractFirebaseRepository<StoreDocument>` with `collectionPath: organizations/${orgId}/stores/${storeId}/documents`, `fromFirestore()` mapping all nullable fields, `findByStore(orgId, storeId, options)` with `kind` filter and sort support
- [x] T019 Add `src/lib/firebase/storage.ts` — export `adminStorage` (Firebase Admin Storage instance) and `getBucket()` helper returning the default bucket; used by Next.js server-side actions for signed URL generation

---

## Phase 3: User Story 1 — Store Lifecycle Management

**Story Goal**: Authenticated user can create, list, view, edit, and delete stores scoped to their organisation.

**Independent Test Criteria**: Navigate to `/stores` → create a store → verify it appears in the list with name, description, and counts → edit name → verify update → delete with confirmation → verify store disappears.

### Use Cases

- [x] T020 [US1] Add `src/data/stores/use-cases/create-store-use-case.ts` — `CreateStoreUseCase extends BaseUseCase<CreateStoreInput, { store: Store }>`: validate schema, check `nameExists()` (throw `CONFLICT` if taken), write store document with counts `0`, return `ok({ store })`
- [x] T021 [US1] Add `src/data/stores/use-cases/update-store-use-case.ts` — `UpdateStoreUseCase extends BaseUseCase<UpdateStoreInput, { store: Store }>`: validate org membership + store exists, check name uniqueness excluding self, update `name`/`description`/`updatedAt`, return updated store
- [x] T022 [US1] Add `src/data/stores/use-cases/delete-store-use-case.ts` — `DeleteStoreUseCase extends BaseUseCase<DeleteStoreInput, { deleted: true }>`: validate org, batch-delete all `documents/{*}` (Firestore recursive + Storage objects loop), fire-and-forget Vertex AI corpus deletion, delete store document, return `ok({ deleted: true })`. **Idempotent**: if the store document does not exist (`NOT_FOUND`), return `ok({ deleted: true })` — supports double-delete from concurrent tabs without error.

### Server Actions

- [x] T023 [US1] Add `src/actions/store-actions.ts` with `createStoreAction`, `updateStoreAction`, `deleteStoreAction` — all wrapped in `withContext`, delegating to respective use cases, returning `Result<T, AppError>`

### API Data Layer

- [x] T024 [US1] Add `src/app/(platform)/stores/page.tsx` — SSR server component: fetch first page of stores via `StoreRepository.findByOrg()`, pass to `StoreListClient`; include `orgId` from `withContext` session

### UI Components

- [x] T025 [P] [US1] Add `src/components/stores/store-card.tsx` — HeroUI Card displaying store `name`, `description` (truncated at 120 chars), `fileCount`, `customCount`, creation date, Edit and Delete action buttons
- [x] T026 [P] [US1] Add `src/components/stores/store-create-form.tsx` — HeroUI Modal with name input (required, 100-char limit) and description textarea (optional, 500-char limit); calls `createStoreAction` via `useMutation`; closes on success and invalidates store list query
- [x] T027 [P] [US1] Add `src/components/stores/store-edit-form.tsx` — same fields as create form, pre-populated; calls `updateStoreAction`; inline validation errors per field
- [x] T028 [US1] Add `src/components/stores/store-list-client.tsx` — `"use client"` TanStack Query list: renders `StoreCard` grid, "New Store" button opening `StoreCreateForm` modal, text search input (debounced 300ms, URL param `q`), sort select (createdAt desc / asc / name A→Z / Z→A, URL param `sort`), date-range filter (URL params `from`/`to`), pagination (25/page, URL param `page`); empty state when no stores; search-empty state when query returns nothing with "Clear search" CTA. **Search implementation**: store list search is **prefix-only** via Firestore `where('name', '>=', q).where('name', '<=', q + '\uf8ff')` — aligns with FR-018 (see spec clarification). Do not attempt client-side substring filtering across pages; document this constraint in a UI tooltip.
- [x] T029 [US1] Add `src/app/(platform)/stores/loading.tsx` — skeleton: grid of 4 HeroUI Skeleton cards matching `StoreCard` dimensions (name line, description lines, count badges, action buttons)

### Deletion Guard

- [x] T030 [US1] Wire up `ReusableConfirmModal` with `danger` intent in `StoreCard` delete button: show file+record count in body text before calling `deleteStoreAction`; redirect to `/stores` on success

---

## Phase 4: User Story 2 — File Management Within a Store

**Story Goal**: User opens a store, uploads files (client-direct via signed URL), sees files in a filterable list, downloads via signed URL, and can delete individual files.

**Independent Test Criteria**: Open existing store → upload a PDF → verify it appears in list with filename, size, kind badge, `aiStatus: pending` shimmer → click filename → verify download redirect fires → delete file with confirmation → verify removal. (AI enrichment `aiStatus` → `done` is a bonus check, not blocking.)

### Use Cases

- [x] T031 [US2] Add `src/data/stores/use-cases/get-signed-upload-url-use-case.ts` — `GetSignedUploadUrlUseCase extends BaseUseCase<GetSignedUploadUrlInput, UploadUrlResult>`: validate org + store exists, check for existing doc with same filename (delete old Firestore + Storage if found — upsert), write new `documents/{docId}` with `kind`, `storagePath`, `mimeType`, `sizeBytes`, `aiStatus: 'pending'`, increment `Store.fileCount` + `documentCount` in transaction, generate 15-min signed upload URL via `adminStorage.bucket().file(path).generateSignedUrl({ action: 'write' })`, return `{ docId, uploadUrl, storagePath }`
- [x] T032 [US2] Add `src/data/stores/use-cases/get-signed-download-url-use-case.ts` — `GetSignedDownloadUrlUseCase extends BaseUseCase<GetSignedDownloadUrlInput, { downloadUrl: string }>`: validate org + doc exists + `kind !== 'custom'` (400 if custom), generate 15-min signed download URL via `adminStorage.bucket().file(doc.storagePath).generateSignedUrl({ action: 'read' })`, return URL
- [x] T033 [US2] Add `src/data/stores/use-cases/delete-document-use-case.ts` — `DeleteDocumentUseCase extends BaseUseCase<DeleteDocumentInput, { deleted: true }>`: validate org + doc exists, delete Cloud Storage object at `storagePath` (if file doc), fire-and-forget Vertex AI RAG file removal (if `geminiFileUri` set), delete Firestore doc, decrement `Store.documentCount` + kind counter in same transaction, return `ok({ deleted: true })`

### Server Actions & API Route

- [x] T034 [US2] Add `getSignedUploadUrlAction` and `getSignedDownloadUrlAction` and `deleteDocumentAction` to `src/actions/document-actions.ts` — all `withContext`-wrapped
- [x] T035 [US2] Add `src/app/api/stores/[storeId]/documents/[docId]/download/route.ts` — `GET` handler wrapped in `withContext`: calls `GetSignedDownloadUrlUseCase`, returns `302` redirect to signed URL; `404` / `403` / `400` on errors. **Preview note**: browsers natively inline-preview images and PDFs when served via the signed URL redirect — no additional preview UI is required for v1. Explicit preview components are out of scope.

### Store Detail Page

- [x] T036 [US2] Add `src/app/(platform)/stores/[storeId]/page.tsx` — SSR server component: fetch store by ID + first page of documents via repositories; verify `orgId` matches, 404 if not found; pass data to `StoreDetailClient`
- [x] T037 [US2] Add `src/app/(platform)/stores/[storeId]/loading.tsx` — skeleton: store header (name + description placeholder), tabs skeleton, document list rows (5 skeleton rows with kind-badge and action placeholder)

### UI Components

- [x] T038 [P] [US2] Add `src/components/stores/document-row.tsx` — HeroUI TableRow: filename, kind badge (colour-coded by DocumentKind), human-readable file size, upload date, `AiStatus` badge (`pending` shimmer / `processing` spinner / `done` keyword chips / `error` warning icon), Download and Delete action buttons
- [x] T039 [US2] Add `src/components/stores/document-upload-button.tsx` — `"use client"` component: hidden `<input type="file" accept="*/*">`, on file select: validates size ≤ 50 MB client-side (show error if exceeded), calls `getSignedUploadUrlAction`, PUT file bytes to returned `uploadUrl` using `fetch`, on complete: invalidates document list query; shows upload progress bar during PUT
- [x] T040 [US2] Add `src/components/stores/document-list-client.tsx` — `"use client"` TanStack Query list: renders `DocumentRow` table, `DocumentUploadButton`, kind-filter tabs (All / Images / PDFs / Docs / Sheets / Other), search input (debounced, URL param `dq`), sort select, pagination (25/page, URL param `dp`); empty state + search-empty state. **Sort options vary by active tab**: Files tab → sort by upload date desc/asc / name A→Z (URL param `dsort`); Custom Records tab → sort by name A→Z / creation date desc / **last-updated date desc** (URL param `dsort`). The `updatedAt` sort option MUST appear when the Custom Records filter is active (satisfies FR-021).
- [x] T041 [US2] Add `src/components/stores/store-detail-client.tsx` — `"use client"` component: store header (name, description, edit button opening `StoreEditForm`), delete store button (→ `ReusableConfirmModal` with danger intent + item counts), tabs: All Documents / Files / Custom Records (renders `DocumentListClient` with appropriate `kind` filter)

---

## Phase 5: User Story 3 — Custom JSON Data Records

**Story Goal**: User creates named JSON data records, views them, edits content, and deletes them — all within a store, without any file upload.

**Independent Test Criteria**: Open existing store → Custom Records tab → create record with name "config" and valid JSON body → verify record appears in list → open and edit JSON → verify update → enter invalid JSON → verify validation error is shown and record not saved → delete record → verify removal.

### Use Cases

- [x] T042 [US3] Add `src/data/stores/use-cases/create-custom-document-use-case.ts` — `CreateCustomDocumentUseCase extends BaseUseCase<CreateCustomDocumentInput, { document: StoreDocument }>`: validate schema (including JSON.parse refine), write `documents/{docId}` with `kind: 'custom'`, `aiStatus: 'pending'`, `keywords: []`, `embedding: null`, increment `Store.customCount` + `documentCount` in transaction, return `ok({ document })`
- [x] T043 [US3] Add `src/data/stores/use-cases/update-custom-document-use-case.ts` — `UpdateCustomDocumentUseCase extends BaseUseCase<UpdateCustomDocumentInput, { document: StoreDocument }>`: validate doc exists + `kind === 'custom'` (400 if not), update `name`/`jsonBody`/`updatedAt`, reset `aiStatus: 'pending'`, clear `embedding`, `keywords`, `summary` to trigger re-enrichment, return `ok({ document })`

### Server Actions

- [x] T044 [US3] Add `createCustomDocumentAction` and `updateCustomDocumentAction` to `src/actions/document-actions.ts`

### Document Viewer/Editor Page

- [x] T045 [US3] Add `src/app/(platform)/stores/[storeId]/documents/[docId]/page.tsx` — SSR server component: fetch document by ID, verify org, render `CustomDocumentViewer` (if read mode) or `CustomDocumentForm` (if edit mode via URL param `?edit=1`)
- [x] T046 [P] [US3] Add `src/app/(platform)/stores/[storeId]/documents/[docId]/loading.tsx` — skeleton: document name placeholder, JSON editor placeholder block

### UI Components

- [x] T047 [US3] Add `src/components/stores/custom-document-form.tsx` — `"use client"` HeroUI Modal (or inline form): name input (1–100 chars), `<textarea>` JSON editor with monospace font; client-side JSON syntax validation on blur and on submit; calls `createCustomDocumentAction` or `updateCustomDocumentAction`; inline error "Invalid JSON syntax" if `JSON.parse` throws; on success: close and invalidate document list query
- [x] T048 [P] [US3] Add `src/components/stores/custom-document-viewer.tsx` — read-only `<pre>` block with syntax-highlighted JSON (use `JSON.stringify(JSON.parse(body), null, 2)` for formatting), Edit button switching to `CustomDocumentForm`, `AiStatus` badge, keyword chips (if `aiStatus === 'done'`)

### Deletion Guard

- [x] T049 [US3] Wire up `ReusableConfirmModal` with `danger` intent for JSON record deletion in `DocumentRow` and `CustomDocumentViewer`; calls `deleteDocumentAction`; on success: navigate back to store detail or invalidate list

---

## Phase 6: Firebase Functions — AI Enrichment

**Purpose**: Cloud Functions v2 that run the LangGraph enrichment workflow. Triggered independently of UI — parallel to US1/US2/US3 delivery. AI enrichment adds `aiStatus: done`, keywords, summary, and embedding to existing documents. The UI degrades gracefully when `aiStatus` is `pending` or `error`.

### Function Shared Infrastructure (Functions package)

- [x] T050 Add `functions/src/nodes/set-processing-node.ts` — sets `aiStatus: 'processing'` on the Firestore document via Admin SDK
- [x] T051 [P] Add `functions/src/nodes/handle-error-node.ts` — catches graph error, sets `aiStatus: 'error'`, writes `aiError: error.message`, returns without throwing (Functions must not crash on enrichment failure)
- [x] T052 [P] Add `functions/src/nodes/write-enrichment-node.ts` — writes `{ aiStatus: 'done', keywords, summary, extractedText, embedding, geminiFileUri, updatedAt }` to `documents/{docId}` via Admin Firestore
- [x] T053 [P] Add `functions/src/nodes/generate-embedding-node.ts` — calls `text-embedding-004` via `@google-cloud/vertexai` `TextEmbeddingModel`; input: `name + '\n' + summary + '\n' + extractedText` (truncated to 8k chars); output: `number[]` (768-dim); no-op zero vector when `FUNCTIONS_EMULATOR=true`
- [x] T054 [P] Add `functions/src/nodes/extract-keywords-node.ts` — Gemini Flash structured JSON output; system prompt from `contracts/firebase-functions.md`; input: `{ name, summary, extractedText }`; output: `{ keywords: string[] }` (max 20 tags, lowercase)

### File Enrichment Graph

- [x] T055 Add `functions/src/nodes/infer-kind-node.ts` — calls `inferDocumentKind(mimeType)`, writes `kind` to graph state
- [x] T056 [P] Add `functions/src/nodes/extract-text-summary-node.ts` — Gemini Flash multimodal: loads file bytes from Cloud Storage via GCS URI, sends as file part; system prompt from `contracts/firebase-functions.md`; structured JSON output `{ text: string, summary: string }`; `text` truncated to 10k chars; no-op when `FUNCTIONS_EMULATOR=true`
- [x] T057 [P] Add `functions/src/nodes/index-in-vertex-rag-node.ts` — Vertex AI RAG Engine: derive corpus name via `deriveCorpusName(orgId, storeId)`, create corpus if not exists (`listRagCorpora` → `createRagCorpus`), call `importRagFiles` with GCS URI, store returned `fileUri` in graph state; no-op when `FUNCTIONS_EMULATOR=true`
- [x] T058 Add `functions/src/workflows/file-enrichment-graph.ts` — LangGraph `StateGraph<FileEnrichmentState>` connecting nodes in order: `setProcessing → inferKind → extractTextAndSummary → extractKeywords → generateEmbedding → indexInVertexRag → writeEnrichment`; error edges from all nodes → `handleError`
- [x] T059 Add `functions/src/enrich-file-document.ts` — `onObjectFinalized` Cloud Functions v2 trigger on `orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename}`; extracts path segments; bails if path does not match or `aiStatus !== 'pending'`; invokes `fileEnrichmentGraph`

### Custom Document Enrichment Graph

- [x] T060 Add `functions/src/workflows/custom-enrichment-graph.ts` — LangGraph `StateGraph<CustomEnrichmentState>` nodes: `setProcessing → prepareText → extractKeywordsFromJson → generateEmbedding → writeEnrichment`; error edges → `handleError`; note: no `indexInVertexRag` node (custom docs use Firestore Vector only)
- [x] T061 Add `functions/src/enrich-custom-document.ts` — `onDocumentCreated` + `onDocumentUpdated` Firestore triggers on `organizations/{orgId}/stores/{storeId}/documents/{docId}`; bails if `kind !== 'custom'` or `aiStatus !== 'pending'`; invokes `customEnrichmentGraph`
- [x] T062 Add `functions/src/on-store-document-deleted.ts` — `onDocumentDeleted` Firestore trigger; if `geminiFileUri` set → fire-and-forget `deleteRagFile`; belt-and-suspenders counter decrement on `Store` document
- [x] T063 Add `functions/src/index.ts` — export `enrichFileDocument`, `enrichCustomDocument`, `onStoreDocumentDeleted`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T064 Update `firebase.json` to include `functions` key pointing to `functions/` directory, with `runtime: nodejs22` and pre-deploy build hook (`npm run build`)
- [x] T065 [P] Deploy Firestore indexes: `firebase deploy --only firestore:indexes` and verify vector index build starts (async — can take 5–10 min; document in quickstart.md)
- [x] T066 [P] Add `src/app/(platform)/stores/[storeId]/documents/[docId]/page.tsx` back-link breadcrumb: Store name → `/stores/{storeId}` → Document name; consistent with existing platform nav
- [x] T067 [P] Verify HeroUI `Badge` or `Chip` components are available for `AiStatus` display and `DocumentKind` labels; add any missing HeroUI imports to component files
- [x] T068 [P] ~~Resolved by T019~~ — `adminStorage` for Next.js server actions is provided by `src/lib/firebase/storage.ts` (T019). In use cases that generate signed URLs, import `getBucket()` from `@/lib/firebase/storage` directly. Do **not** add `adminStorage` to `src/lib/firebase/admin.ts` (would duplicate T019 and cause a conflicting export).
- [x] T069 Add `npm run lint && npm test` CI check verification: ensure all new files pass ESLint (no `any`, no unused imports) and TypeScript strict mode compiles without errors
- [x] T069a [P] Add "Stores" navigation entry to `src/components/layout/platform-nav.tsx` — link to `/stores`, active state highlights on all `/stores/*` routes (use `usePathname().startsWith('/stores')`); position after existing nav items. Depends on T024 (stores page exists).

---

## Dependencies (Story Completion Order)

```
Phase 1 (Infrastructure) ──────────────────────────────┐
         │                                              │
         ▼                                              ▼
Phase 2 (Domain Foundation) ──────── (parallel) ──── Phase 6 (Functions, starts after Phase 1)
         │
         ├──► Phase 3 (US1: Store Lifecycle) ──────────────────────────── MVP ✅
         │              │
         │              ▼
         ├──► Phase 4 (US2: File Management) ─ depends on US1 (stores must exist)
         │              │
         │              ▼
         └──► Phase 5 (US3: Custom JSON) ─────── depends on US1; independent from US2
                        │
                        ▼
                 Phase 7 (Polish) ── after all stories
```

**US2 and US3 are independent of each other** — they can be implemented in parallel once US1 is done and the domain foundation (Phase 2) is complete.

---

## Parallel Execution Examples

### Sprint 1: Setup + Foundation (Phases 1 & 2)

| Track A                  | Track B                      | Track C                          |
| ------------------------ | ---------------------------- | -------------------------------- |
| T001 Init functions pkg  | T003 Firestore indexes       | T005 Storage rules               |
| T006 Admin Firestore lib | T007 Admin Storage lib       | T008 Vertex AI lib               |
| T009 inferDocumentKind   | T010 corpus-name             | T019 src/lib/firebase/storage.ts |
| T012 Store model         | T013 StoreDocument model     | T019 src/lib/firebase/storage.ts |
| T017 StoreRepository     | T018 StoreDocumentRepository | T014+T015+T016 DTOs              |

### Sprint 2: US1 (Phase 3) + Functions Foundation (Phase 6 start)

| Track A (US1)                  | Track B (Functions)        |
| ------------------------------ | -------------------------- |
| T020 CreateStoreUseCase        | T050 setProcessingNode     |
| T021 UpdateStoreUseCase        | T051 handleErrorNode       |
| T022 DeleteStoreUseCase        | T052 writeEnrichmentNode   |
| T023 store-actions.ts          | T053 generateEmbeddingNode |
| T025+T026+T027 Store UI        | T054 extractKeywordsNode   |
| T028 StoreListClient           | —                          |
| T024+T029 Store page + loading | —                          |
| T030 Delete confirmation       | —                          |

### Sprint 3: US2 + US3 (Phases 4 & 5) + Functions completion (Phase 6)

| Track A (US2)                    | Track B (US3)               | Track C (Functions)         |
| -------------------------------- | --------------------------- | --------------------------- |
| T031 GetSignedUploadUrlUseCase   | T042 CreateCustomDocUseCase | T055 inferKindNode          |
| T032 GetSignedDownloadUrlUseCase | T043 UpdateCustomDocUseCase | T056 extractTextSummaryNode |
| T033 DeleteDocumentUseCase       | T044 document-actions.ts    | T057 indexInVertexRagNode   |
| T034 document-actions.ts         | T047 CustomDocumentForm     | T058 fileEnrichmentGraph    |
| T035 Download API route          | T048 CustomDocumentViewer   | T059 enrichFileDocument     |
| T036+T037 Store detail page      | T045+T046 Document page     | T060 customEnrichmentGraph  |
| T038 DocumentRow                 | T049 Delete confirmation    | T061 enrichCustomDocument   |
| T039 DocumentUploadButton        | —                           | T062+T063 onDeleted + index |
| T040+T041 DocList + StoreDetail  | —                           | —                           |

---

## Implementation Strategy

**MVP Scope** (minimum to demonstrate end-to-end value): **Phase 1 + Phase 2 + Phase 3 (US1)** — stores are created, listed, edited, and deleted. No file upload, no AI required. Delivers SC-001 (store ready in < 30s) and SC-006 (org isolation).

**Increment 2**: Add Phase 4 (US2) — file uploads with signed URLs and downloads. Delivers SC-002 (upload < 5s).

**Increment 3**: Add Phase 5 (US3) — custom JSON records. Delivers SC-003 (create/view/edit/delete without leaving page).

**Increment 4**: Add Phase 6 (Cloud Functions + LangGraph enrichment). Delivers `aiStatus: done` keyword chips and semantic search readiness. Async — does not block UI delivery.

**Total Tasks**: 69 (T011 merged into T007; T069a added) | **Parallelisable**: 28 with `[P]` marker | **US1**: 12 tasks (incl. T069a) | **US2**: 11 tasks | **US3**: 8 tasks | **Functions**: 14 tasks | **Infra/Polish**: 24 tasks

</details>
