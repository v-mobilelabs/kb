# Implementation Tasks: Store Module — Complete Feature Implementation [ARCHIVED]

> **Status**: ARCHIVED (Reference Only)  
> **Date**: 2026-04-06  
> **Note**: This file documents the original 69-task plan for the complete Store Module feature. Most tasks are complete ([x]). This serves as a reference for future enrichment pipeline work and API contract implementation.  
> **Current Work**: See [tasks-refactor.md](./tasks-refactor.md) for the current 28-task data-fetching refactor (Phase 1-6).

---

## Overview

**Total tasks**: 69  
**Completed**: 49 (marked [x])  
**In Progress/Blocked**: 20 (marked [ ])

**Phases**:

1. **Infrastructure Setup** (10 tasks) — Firebase Functions package, Firestore indexes, env vars, shared utilities
2. **Domain Foundation** (10 tasks) — Models, repositories, DTOs (blocking all user stories)
3. **US1: Store Lifecycle** (16 tasks) — Create, list, edit, delete stores (P1 — MVP)
4. **US2: File Management** (12 tasks) — Upload, list, download, delete files (P2)
5. **US3: Custom JSON Data** (9 tasks) — Create, view, edit, delete JSON records (P3)
6. **AI Enrichment Pipeline** (14 tasks) — Cloud Functions + LangGraph workflow
7. **Polish & Cross-cutting** (8 tasks) — Navigation, error handling, accessibility

**Dependency Order**:

- Phase 1 → Phase 2 (blocking) → Phases 3,4,5 (parallel once Phase 2 done) + Phase 6 (can parallel with Phase 2) → Phase 7

---

## Phase 1: Infrastructure Setup (Completed)

- [x] T001 Initialise Firebase Functions v2 package with TypeScript, Node.js 22
- [x] T002 Add FIREBASE_STORAGE_BUCKET and VERTEX_AI_LOCATION env vars
- [x] T003 Add Firestore composite indexes and 768-dim vector index
- [x] T004 Add Firestore security rules for org-member isolation
- [x] T005 Add Cloud Storage security rules (deny public access)
- [x] T006 Add functions/src/lib/admin-firestore.ts
- [x] T007 Add functions/src/lib/admin-storage.ts and getBucket() helper
- [x] T008 Add functions/src/lib/vertex-ai.ts
- [x] T009 Add functions/src/lib/infer-document-kind.ts
- [x] T010 Add functions/src/lib/corpus-name.ts

---

## Phase 2: Domain Foundation (Partially Complete)

- [x] T012 Add src/data/stores/models/store.model.ts
- [x] T013 Add src/data/stores/models/store-document.model.ts
- [x] T014 Add src/data/stores/dto/store-dto.ts
- [x] T015 Add src/data/stores/dto/document-dto.ts
- [x] T016 Add src/data/stores/dto/custom-document-dto.ts
- [x] T017 Add src/data/stores/repositories/store-repository.ts
- [x] T018 Add src/data/stores/repositories/store-document-repository.ts
- [x] T019 Add src/lib/firebase/storage.ts
- [ ] T011 (moved to Phase 1 as T007 merged)

---

## Phase 3: User Story 1 — Store Lifecycle Management (Mostly Complete)

**Goal**: CRUD operations on stores, org-scoped.

### Use Cases (Complete)

- [x] T020 CreateStoreUseCase
- [x] T021 UpdateStoreUseCase
- [x] T022 DeleteStoreUseCase
- [x] T023 store-actions.ts (createStoreAction, updateStoreAction, deleteStoreAction)

### API & Pages (Partial)

- [x] T024 src/app/(platform)/stores/page.tsx (SSR page)

### UI Components (Complete)

- [x] T025 StoreCard component
- [x] T026 StoreCreateForm modal
- [x] T027 StoreEditForm modal
- [x] T028 StoreListClient with search, sort, pagination
- [x] T029 loading.tsx skeleton
- [x] T030 Delete confirmation modal wiring

---

## Phase 4: User Story 2 — File Management (Blocked by Data Fetching Refactor)

**Goal**: Upload, list, download, and delete files from stores.

### Use Cases (Blocked)

- [ ] T031 GetSignedUploadUrlUseCase
- [ ] T032 GetSignedDownloadUrlUseCase
- [ ] T033 DeleteDocumentUseCase

### API Routes & Pages (Blocked)

- [ ] T034 document-actions.ts (getSignedUploadUrlAction, etc.)
- [ ] T035 Download API route (src/app/api/stores/[storeId]/documents/[docId]/download/route.ts)
- [ ] T036 Store detail page (src/app/(platform)/stores/[storeId]/page.tsx)
- [ ] T037 Store detail loading skeleton

### UI Components (Blocked)

- [ ] T038 DocumentRow component
- [ ] T039 DocumentUploadButton
- [ ] T040 DocumentListClient
- [ ] T041 StoreDetailClient wrapper

---

## Phase 5: User Story 3 — Custom JSON Data (Blocked by Data Fetching Refactor)

**Goal**: Create, view, edit, and delete JSON records in stores.

### Use Cases (Blocked)

- [ ] T042 CreateCustomDocumentUseCase
- [ ] T043 UpdateCustomDocumentUseCase

### API & Pages (Blocked)

- [ ] T044 createCustomDocumentAction / updateCustomDocumentAction
- [ ] T045 Document viewer/editor page
- [ ] T046 Document page loading skeleton

### UI Components (Blocked)

- [ ] T047 CustomDocumentForm
- [ ] T048 CustomDocumentViewer
- [ ] T049 Delete confirmation modal wiring

---

## Phase 6: AI Enrichment Pipeline — Cloud Functions (Not Started)

**Goal**: Asynchronously enrich documents with AI metadata via Cloud Functions + LangGraph.

### Shared Graph Nodes (Ready to Start)

- [x] T050 set-processing-node.ts
- [x] T051 handle-error-node.ts
- [x] T052 write-enrichment-node.ts
- [x] T053 generate-embedding-node.ts
- [x] T054 extract-keywords-node.ts

### File Enrichment (Ready to Start)

- [x] T055 infer-kind-node.ts
- [x] T056 extract-text-summary-node.ts
- [x] T057 index-in-vertex-rag-node.ts
- [x] T058 file-enrichment-graph.ts
- [x] T059 enrichFileDocument Cloud Function

### Custom Document Enrichment (Ready to Start)

- [x] T060 custom-enrichment-graph.ts
- [x] T061 enrichCustomDocument Cloud Function
- [x] T062 onStoreDocumentDeleted Cloud Function
- [x] T063 functions/src/index.ts (export all functions)

---

## Phase 7: Polish & Cross-Cutting (Mostly Complete)

- [x] T064 firebase.json configuration
- [x] T065 Deploy Firestore indexes
- [x] T066 Breadcrumb navigation
- [x] T067 HeroUI component verification
- [x] T068 Note on adminStorage (resolved in T019)
- [x] T069 Lint and test verification
- [x] T069a Platform nav "Stores" link

---

## Why This Plan Exists Alongside the Refactor

The original 69-task plan specified the complete Store Module feature delivery with all CRUD operations, file management, AI enrichment, and polish. As development progressed, a need emerged to refactor data fetching from Server Actions to Next.js 16's native `'use cache'` directive with cursor-based pagination.

**The 28-task refactor** (in `tasks-refactor.md`) focuses exclusively on modernizing the data-fetching layer while the CRUD use cases and Cloud Functions remain valid. Many tasks from this 69-task plan are complete and working; only the data layer needs refactoring to adopt new Next.js patterns.

**Future work**: After the refactor is complete, return to Phase 6 (Cloud Functions) tasks T050–T063 to implement AI enrichment.

---

## Blocked Tasks Requiring Refactor Completion

The following tasks from Phases 4 and 5 are blocked pending the data-fetching refactor (Phase 1-6 in tasks-refactor.md) to establish the GET route patterns:

- T031–T034 (file upload/download mutations and cache invalidation)
- T035–T041 (file management UI and store detail page refactoring)
- T042–T044 (custom JSON mutations and cache invalidation)
- T045–T049 (custom JSON UI and pages)

These will resume once the refactor is merged.

---

## Integration Notes

- **Models & Repositories**: All in place (Phases 1–2); no changes needed.
- **Use Cases**: StoreRepository.findByOrg() and StoreDocumentRepository.findByStore() exist but will be superseded by new cursor-based paginated queries in the refactor.
- **Server Actions**: Existing createStoreAction, updateStoreAction, deleteStoreAction work; refactor adds revalidateTag() calls.
- **DTOs**: Existing DTOs support both old (page-based) and new (cursor-based) pagination; refactor adds StoreSortKeySchema, DocumentSortKeySchema.
- **Database**: Firestore indexes deployed (T003, T065); vector index for embeddings is building asynchronously.

---

## References

- Original spec: [spec.md](./spec.md)
- Original plan: [plan.md](./plan.md) (now references data-fetching decisions from Research Decision 8)
- Refactor tasks: [tasks-refactor.md](./tasks-refactor.md)
- Data model: [data-model.md](./data-model.md)
- Contracts: [contracts/](./contracts/)
