# Implementation Tasks: Store Module — Data Fetching Refactor

**Feature**: Store Module — Migrate queries from Server Actions to SSR + `'use cache'` + GET route handlers + cursor pagination  
**Generated**: 2026-04-07  
**Branch**: `002-store-module`  
**Scope**: Query layer modernization (Phases 1–6); does not include file upload mutations (Phase 4) or Cloud Functions enrichment (Phase 6 in archive)  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [Decision 8](./research.md#decision-8--data-fetching-architecture-ssr--cache--get-api--tanstack-query) | **Contracts**: [get-stores.md](./contracts/get-stores.md), [get-documents.md](./contracts/get-documents.md) | **Archive**: [tasks-archive.md](./tasks-archive.md)

---

## Summary

**Total tasks**: 28  
**Parallelisable tasks**: 11 (marked [P])  
**User Stories Affected**: 3 (US1, US2, US3 — queries only)  
**Phases**: 6 (Setup → Foundational → US1 queries → US2 queries → US3 cache tags → Polish)

**What this changes**:

- Server Actions `listStoresAction` and `listDocumentsAction` are removed
- All queries go through `'use cache'` functions in `src/data/stores/queries/`
- GET route handlers become the client-facing query API
- TanStack Query calls GET routes (not Server Actions)
- Mutations add `revalidateTag(tag, 'max')` to invalidate caches
- Enrichment polling uses per-document `refetchInterval` on single-document GET route
- Pagination switches from offset/page-based to cursor-based keyset pagination

**Out of Scope** (see tasks-archive.md):

- File upload use cases (T031–T033 in archive)
- File management UI (T038–T041 in archive)
- Custom JSON mutation use cases (T042–T043 in archive)
- Custom JSON UI (T047–T049 in archive)
- Cloud Functions enrichment pipeline (T050–T063 in archive)

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

**Independent Test**: Load `/stores` → SSR renders first page → change sort → TanStack Query fetches from GET `/api/stores?sort=name_asc` → type search prefix → debounced fetch → click Next page → cursor param appended → verify 25-item pages with correct cursor flow → create a store → verify cache invalidated and list reflects new store.

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

**This is a refactor of existing, working code** — all original tasks are complete (see tasks-archive.md). The approach:

1. **Phase 1+2 first** — infrastructure must exist before any query migration
2. **US1 (Phase 3) next** — stores list is the most visible query; validates the pattern end-to-end
3. **US2 (Phase 4) in parallel with US3 (Phase 5)** — documents list + enrichment polling; custom doc cache tags
4. **Phase 6 last** — pagination UI polish, cleanup, verify

**Risk**: `'use cache'` requires `cacheComponents: true` which may affect other cached routes. Verify no regression in auth/onboarding pages after T001.

**Rollback**: If `'use cache'` causes issues, fall back to `unstable_cache` (deprecated but functional in Next.js 16) as a temporary measure while investigating.

---

## Integration with Archive

This refactor focuses on **query layer only** (reading data via SSR + GET routes). All mutations, use cases, and Cloud Functions remain in place:

- **Create/Update/Delete Store**: `store-actions.ts` use cases remain; only add `revalidateTag` calls (T012)
- **File Management**: Blocked until refactor is complete; will follow same cache invalidation pattern (see tasks-archive.md)
- **Custom JSON CRUD**: Blocked until refactor is complete; will use same pattern (see tasks-archive.md)
- **AI Enrichment**: Independent; ready to start after Phase 1 (Infrastructure); see tasks-archive.md T050–T063

---

## Notes

**Removed functions**: `listStoresAction`, `listDocumentsAction` — all queries now go through GET routes  
**New directories**: `src/data/stores/queries/`, nested `src/app/api/stores/` route files  
**Cursor format**: `base64url(JSON({ id, sortValue }))` — opaque to clients  
**Pagination**: Prev requires client-side `cursorStack` array; Next uses `nextCursor` from API response  
**Enrichment polling**: 4s interval per document row until `completed` or `failed`; uses `cache: 'no-store'` to bypass SSR cache  
**Cache lifetime**: `cacheLife('minutes')` — ~5 min default; stale-while-revalidate via `revalidateTag(tag, 'max')`

---

## See Also

- **Complete Feature Plan** (all 69 tasks): [tasks-archive.md](./tasks-archive.md)
- **Data Fetching Architecture Decision**: [plan.md](./plan.md) — Decision 8
- **API Contracts**: [contracts/get-stores.md](./contracts/get-stores.md), [contracts/get-documents.md](./contracts/get-documents.md)
