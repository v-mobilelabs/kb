# Implementation Tasks: Files Module

**Branch**: `004-files-module`  
**Status**: Implementation complete (39/43 tasks — T035/T038/T040/T042 deferred)  
**Last Updated**: 2026-04-13

## 📋 Summary

**Total tasks**: 55  
**Parallelisable tasks**: 31 (marked [P])  
**User Stories**: 2 (US1 P1 — File Lifecycle Management, US2 P2 — File Discovery & Management)

**Phases**:

1. **Setup** (4 tasks) — Cache tags, query keys, tokens, Firestore indexes + security rules
2. **Foundational** (6 tasks) — File model, Zod DTOs, repository, utility libs, SVG icon generator
3. **Phase 3 — [US1] File Lifecycle** (22 tasks) — Upload, download, thumbnail, delete API routes; delete Server Action; query functions; core UI components
4. **Phase 4 — [US2] File Discovery** (17 tasks) — List API route; search/sort/filter; continuous scroll pagination; URL-synced state
5. **Polish** (6 tasks) — Empty states, error states, responsive layout, E2E validation

---

## 📚 Related Documents

| Document             | Purpose                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| [spec.md](./spec.md) | Full feature specification (FR-001 to FR-017, UI-001 to UI-012, SC-001–007)   |
| [plan.md](./plan.md) | Architecture; layer maps, cache strategy, SVG icon approach, design decisions |

---

## Dependency Graph

```
Phase 1: Setup
    ↓
Phase 2: Foundational ───────────────────────────────────┐
    ↓                                                     │
    Phase 3: US1 (File Lifecycle)                         │
    │  Upload endpoint (blocks download/thumbnail/delete) │
    │  Delete Server Action (blocks delete modal)         │
    │  Thumbnail endpoint (blocks file-thumbnail UI)      │
    ▼                                                     │
    Phase 4: US2 (File Discovery) ────────────────────────┘
                   │
                   ▼
            Phase 5: Polish
```

---

## Phase 1: Setup

_Project initialization — must complete before any user story work begins._

- [x] T001 Add file cache tag constants `fileCacheTag(orgId)` and `fileDetailCacheTag(orgId, fileId)` to `src/lib/cache-tags.ts`
- [x] T002 [P] Add TanStack Query key factory for files (`files()`, `filesList()`, `fileDetail()`, `fileDownload()`, `fileThumbnail()`) to `src/lib/query-keys.ts`
- [x] T003 [P] Add `fileKindColorMap` token (kind → Tailwind colour class: blue=image, orange=pdf, green=doc, teal=sheet, purple=video, yellow=audio, gray=text, default=other) to `src/lib/tokens.ts`
- [x] T004 [P] Add Firestore composite indexes for `organizations/{orgId}/files` collection (sort fields: `originalName asc/desc`, `createdAt desc/asc`, `size asc/desc`) in `firestore.indexes.json`; add Firestore security rules for `organizations/{orgId}/files/{fileId}` (org-member read/write only) in `firestore.rules`; add Firebase Storage security rules for `organizations/{orgId}/files/{allPaths=**}` (allow read/write only for authenticated users whose `orgId` matches; deny all public access) in `storage.rules` — resolves FR-009 MUST (currently uncovered)

---

## Phase 2: Foundational

_Blocking prerequisites for all user stories — data types, Zod schemas, repository, utility libs, SVG icons._

- [x] T005 Define TypeScript types for `File`, `FileKind`, `FilesListResponse`, `FileUploadResponse`, `FileDownloadResponse`, `FileThumbnailResponse` in `src/data/files/models/file.model.ts` — `File` entity fields: `id`, `orgId`, `originalName`, `fileName` (UUID.ext), `size` (bytes), `mimeType`, `kind` (FileKind), `uploadedBy` (uid), `createdAt`
- [x] T006 [P] Implement `inferFileKind(mimeType: string): FileKind` — MIME → kind lookup table (exact match then prefix wildcard fallback to `other`) in `src/data/files/lib/infer-file-kind.ts`; implement `formatFileSize(bytes: number): string` (B / KB / MB / GB) in `src/data/files/lib/format-file-size.ts`
- [x] T007 [P] Implement `FileRepository` class with `createFile()`, `getFile()`, `listFiles()` (cursor-based, prefix search on `originalName`, in-memory OR kind filter), `updateFile()`, `deleteFile()` in `src/data/files/repositories/file-repository.ts`; cursor uses base64-encoded `{ id, sortValue }` pairs per existing `src/lib/cursor.ts` pattern; `listFiles` returns `{ files: File[]; nextCursor: string | null }`
- [x] T008 [P] Add Zod validation schemas for all file API boundaries: `FileListQuerySchema` (`search?`, `sort?: 'name'|'createdAt'|'size'`, `order?: 'asc'|'desc'`, `kinds?` comma-separated, `cursor?`, `limit?` coerce int 1–100 default 25) in `src/data/files/dto/file-query-dto.ts`; `FileUploadSchema` (`originalName`, `mimeType`, `size`) in same file
- [x] T009 [P] Add Firebase Storage utility re-exports and helpers (bucket reference, signed URL generation, file upload stream) in `src/data/files/lib/firebase-storage.ts`; use existing Firebase Admin SDK singleton from `src/lib/firebase/`
- [x] T010 Implement `generateSvgIcon(kind: FileKind): string` — returns `data:image/svg+xml;base64,...` string for each non-image kind (pdf, doc, sheet, video, audio, text, other); define distinct SVG per kind in `src/app/api/files/_lib/generate-svg-icon.ts`

---

## Phase 3: User Story 1 — File Lifecycle Management [US1]

**Story Goal**: Authenticated users can upload a file, view it in the files list with metadata, download it via signed URL, view its thumbnail or fallback icon, and delete it permanently. All operations are org-scoped.

**Independent Test Criteria**: Upload a file via POST `/api/files` → it appears in GET `/api/files` response with correct metadata (name, size, kind) → GET `/api/files/{id}/download` returns a signed URL → GET `/api/files/{id}/thumbnail` returns image URL or SVG data URL → DELETE `/api/files/{id}` removes both Firestore doc and Storage file and the file no longer appears in list.

### Upload Endpoint

- [x] T011 [US1] Implement `POST /api/files` route handler (multipart form) in `src/app/api/files/route.ts` — wrapped in `withAuthenticatedContext`; parse multipart with `busboy` or `formidable`; validate file size ≤ 50 MB (return 413 if exceeded, FR-015); infer `kind` via `inferFileKind()`; generate UUID for `fileName`; upload to Storage at `organizations/{orgId}/files/{uuid}.{ext}`; write File document to Firestore via `FileRepository.createFile()`; return full `File` document; revalidate `fileCacheTag(orgId)`

### Download Endpoint

- [x] T012 [P] [US1] Implement `GET /api/files/[fileId]/download` route handler in `src/app/api/files/[fileId]/download/route.ts` — wrapped in `withAuthenticatedContext`; fetch file metadata via `FileRepository.getFile()`; verify `file.orgId === ctx.orgId` (403 if mismatch); generate signed Storage URL with 15-minute expiry via `getSignedUrl()`; return `{ url, expiresIn: 900, fileName: file.originalName }`

### Thumbnail Endpoint

- [x] T013 [P] [US1] Implement `GET /api/files/[fileId]/thumbnail` route handler in `src/app/api/files/[fileId]/thumbnail/route.ts` — wrapped in `withAuthenticatedContext`; fetch file metadata; verify org ownership; if `file.kind === 'image'`: generate signed Storage URL (5-min expiry) and return `{ isImage: true, url, contentType: file.mimeType }`; else: call `generateSvgIcon(file.kind)` and return `{ isImage: false, data: svgDataUrl, contentType: 'image/svg+xml' }`

### Metadata + Delete API Route

- [x] T014 [P] [US1] Implement `GET /api/files/[fileId]` route handler in `src/app/api/files/[fileId]/route.ts` — fetch single file metadata via `FileRepository.getFile()`; verify org ownership; return `{ file }` or 404
- [x] T015 [US1] Implement `DELETE /api/files/[fileId]` route handler in `src/app/api/files/[fileId]/route.ts` — wrapped in `withAuthenticatedContext`; fetch file to get `fileName` and verify org ownership; delete Storage file first (`admin.storage().bucket().file(path).delete()`); on Storage success delete Firestore doc; if Storage delete fails return 500 and do NOT delete Firestore doc (FR-014 transactional consistency); revalidate `fileCacheTag(orgId)`

### Delete Server Action

- [x] T016 [US1] Implement `deleteFileAction(fileId: string)` in `src/actions/file-actions.ts` — `'use server'`; call `withAuthenticatedContext()`; call `FileRepository.deleteFile(fileId, orgId)` (which handles Storage + Firestore); call `revalidateTag(fileCacheTag(orgId))` on success; return `Result<void, AppError>`

### Cached Query Functions

- [x] T017 [P] [US1] Implement `getFileQuery(orgId: string, fileId: string)` with `'use cache'` in `src/data/files/queries/get-file-query.ts` — `cacheTag(fileDetailCacheTag(orgId, fileId))`; `cacheLife('minutes')`; calls `FileRepository.getFile()`; returns `Result<File, AppError>`
- [x] T018 [P] [US1] Implement `getFileThumbnailQuery(orgId: string, fileId: string)` with `'use cache'` in `src/data/files/queries/get-file-thumbnail-query.ts` — `cacheTag(fileDetailCacheTag(orgId, fileId))`; `cacheLife('minutes', 5)`; fetches metadata and returns thumbnail response shape

### UI Components — Core File Display

- [x] T019 [P] [US1] Implement `FileThumbnail` component in `src/app/(platform)/files/_components/file-thumbnail.tsx` — accepts `fileId: string`; calls `GET /api/files/{fileId}/thumbnail`; if `isImage` renders `<img src={url} />`; else renders decoded SVG icon; show skeleton while loading
- [x] T020 [P] [US1] Implement `KindBadge` component in `src/components/shared/kind-badge.tsx` — accepts `kind: FileKind`; renders a pill badge with colour from `fileKindColorMap` tokens (blue for image, orange for pdf, etc.) and label text
- [x] T021 [P] [US1] Implement `DeleteFileModal` component in `src/app/(platform)/files/_components/delete-file-modal.tsx` — danger-intent confirmation dialog (HeroUI Modal); displays file `originalName` and human-readable size via `formatFileSize()`; on confirm calls `deleteFileAction(fileId)`; uses `useTransition` for pending state
- [x] T022 [P] [US1] Implement `FileTable` component in `src/app/(platform)/files/_components/file-table.tsx` — renders list of files as HeroUI Table rows; columns: thumbnail (`FileThumbnail`), original name, size (`formatFileSize`), `KindBadge`, upload date, action buttons (download icon → calls download endpoint, delete icon → opens `DeleteFileModal`); download button fetches `GET /api/files/{fileId}/download` and redirects to signed URL

### Data Hooks — File Actions

- [x] T023 [P] [US1] Implement `useFileDownload(fileId: string)` hook in `src/lib/hooks/use-file-download.ts` — `useQuery` against `GET /api/files/{fileId}/download`; `enabled: false` by default (triggered on demand); on success opens signed URL in new tab; uses query key `fileDownload(fileId)`
- [x] T024 [P] [US1] Implement `useDeleteFile()` hook in `src/lib/hooks/use-delete-file.ts` — `useMutation` calling `deleteFileAction`; `onSuccess` invalidates `filesList()` query key

---

## Phase 4: User Story 2 — File Discovery & Management [US2]

**Story Goal**: Authenticated users can discover files via search (prefix match on name), sort (name, date, size), multi-select kind filtering (OR logic), and cursor-based continuous scroll pagination. All state is URL-synced for sharing and bookmarking.

**Independent Test Criteria**: Upload 3+ files of different kinds via API → load `/files` → search by prefix → list filters in real-time (debounced 300ms) → change sort → list re-sorts → multi-select kind filter → only matching kinds shown (OR logic) → scroll to bottom → next 25 items load automatically → refresh page with URL params → same view restored.

### List API Route

- [x] T025 [US2] Implement `GET /api/files` route handler in `src/app/api/files/route.ts` — wrapped in `withAuthenticatedContext`; parse query params with `FileListQuerySchema.safeParse()` (400 on validation failure); call `listFilesQuery(ctx.orgId, params)`; return `{ files, nextCursor, total }`; kinds param split by comma and passed as array

### Cached Query Function — List

- [x] T026 [US2] Implement `listFilesQuery(orgId: string, options: ListFilesOptions)` with `'use cache'` in `src/data/files/queries/list-files-query.ts` — `cacheTag(fileCacheTag(orgId))`; `cacheLife('minutes', 10)`; calls `FileRepository.listFiles({ orgId, search, sort, order, kinds, cursor, limit })`; Firestore prefix query on `originalName` using `>=` / `<` range; in-memory OR filter on `kind` applied post-fetch; returns `Result<{ files: File[]; nextCursor: string | null }, AppError>`

### File List Page — SSR

- [x] T027 [US2] Implement file list page (SSR) in `src/app/(platform)/files/page.tsx` — read `search`, `sort`, `order`, `kinds`, `cursor` from `searchParams`; call `listFilesQuery(orgId, params)` for initial server-render; pass `initialFiles`, `initialNextCursor` to `FileListClient`; wrap with Suspense
- [x] T028 [P] [US2] Implement `loading.tsx` skeleton in `src/app/(platform)/files/loading.tsx` — shimmer placeholders for file table rows (8 rows), search box, and filter panel

### Client Component — File List

- [x] T029 [US2] Implement `FileListClient` component in `src/app/(platform)/files/_components/file-list-client.tsx` — `'use client'`; wraps `useSuspenseInfiniteQuery` against `GET /api/files`; `initialData` from SSR page props; `getNextPageParam` returns `nextCursor`; renders flattened `files` pages to `FileTable`; manages URL params via `useSearchParams` + `useRouter` for search/sort/filter/cursor state

### Search, Sort, Filter Components

- [x] T030 [P] [US2] Implement `FileSearchBox` component in `src/app/(platform)/files/_components/file-search-box.tsx` — uncontrolled input with 300ms debounce; on change updates `search` URL param and resets cursor; clears cursor when search changes (FR-010)
- [x] T031 [P] [US2] Implement `FileSortControls` component in `src/app/(platform)/files/_components/file-sort-controls.tsx` — HeroUI Select or Dropdown; options: Name A→Z, Name Z→A, Date Newest, Date Oldest, Size Smallest, Size Largest; on change updates `sort` + `order` URL params and resets cursor
- [x] T032 [P] [US2] Implement `FileKindFilter` component in `src/app/(platform)/files/_components/file-kind-filter.tsx` — multi-select checkboxes for each `FileKind`; on change updates `kinds` URL param as comma-separated string and resets cursor; shows selected count badge when filters active (FR-012 OR logic)

### Continuous Scroll Pagination

- [x] T033 [US2] Add Intersection Observer sentinel element to `FileListClient` in `src/app/(platform)/files/_components/file-list-client.tsx` — `<div ref={sentinelRef} />` at bottom of list; when intersecting and `hasNextPage`: call `fetchNextPage()`; show spinner row while `isFetchingNextPage`; disable sentinel when `!hasNextPage` (FR-013, UI-005)

### Empty & Error States

- [x] T034 [P] [US2] Implement `EmptyState` component in `src/app/(platform)/files/_components/empty-state.tsx` — renders when `files.length === 0` and no active search/filter: message "No files yet. Upload your first file via the API." with upload icon; renders alternate message when search/filter is active: "No files match your filters." (UI-010)
- [ ] T035 [P] [US2] Add error boundary with retry button to file list page — wrap `FileListClient` in `ErrorBoundary` that renders "Failed to load files." with HeroUI `Button` variant="bordered" "Retry" calling `reset()` (UI-011)

### Navigation

- [x] T036 [P] [US2] Add `/files` top-level sidebar navigation entry in platform layout component in `src/components/layout/` alongside Stores and Memories entries

### URL Sync & State Preservation

- [x] T037 [US2] Verify URL param roundtrip: read `search`, `sort`, `order`, `kinds` from `useSearchParams` on mount and initialize `FileListClient` query accordingly — on page refresh + share URL, all filters are restored (UI-002, UI-003, UI-004, UI-006)

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T038 [P] Implement responsive layout for file list — on mobile (`sm:`): hide size and date columns in `FileTable`; switch to single-column card layout using HeroUI Card per file; thumbnail shown prominently; maintain all actions (download, delete) (UI-009)
- [x] T039 [P] Add `revalidateFilesCache(orgId: string)` helper to `src/actions/file-actions.ts` — calls `revalidateTag(fileCacheTag(orgId))` — for use by Cloud Functions on upload completion (may be invoked via API key-authenticated POST)
- [ ] T040 [P] Verify Firestore Security Rules enforce org-scope: write a manual test case confirming that `organizations/{orgId}/files/{fileId}` rejects read/write from a different org's auth token; document result in `specs/004-files-module/quickstart.md`
- [x] T041 [P] Add cascade delete for files on organisation deletion — verify existing org deletion handler in `/functions/src/handles/` or `/functions/src/workflows/` calls Storage `deleteFiles()` and Firestore batch delete for `organizations/{orgId}/files` subcollection; add if missing (FR-017)
- [ ] T042 [P] Verify kind-badge colour accessibility — each `KindBadge` colour combination must pass WCAG AA contrast ratio (4.5:1 for text); adjust Tailwind colour shades if needed in `src/lib/tokens.ts`
- [x] T043 Run `npm test && npm run lint` to confirm all TypeScript compiles cleanly, no `any` types, no unused imports, no linting errors

---

## Parallel Execution Examples

### Wave 1: Setup (Phase 1)

| Track A                        | Track B                            |
| ------------------------------ | ---------------------------------- |
| T001 Add cache tag constants   | T002 Add query key factory         |
| T004 Firestore indexes + rules | T003 Add `fileKindColorMap` tokens |

### Wave 2: Foundational (Phase 2)

| Track A                                 | Track B                                 | Track C                |
| --------------------------------------- | --------------------------------------- | ---------------------- |
| T005 File model & types                 | T006 `inferFileKind` + `formatFileSize` | T010 `generateSvgIcon` |
| T007 FileRepository (cursor pagination) | T008 Zod DTOs                           | T009 Storage utilities |

### Wave 3: US1 Core API + Queries (Phase 3 API layer)

| Track A                       | Track B                      |
| ----------------------------- | ---------------------------- |
| T011 POST `/api/files` upload | T012 GET download endpoint   |
| T016 `deleteFileAction`       | T013 GET thumbnail endpoint  |
| T017 `getFileQuery`           | T018 `getFileThumbnailQuery` |
|                               | T014 GET metadata endpoint   |
|                               | T015 DELETE endpoint         |

### Wave 4: US1 UI Components (Phase 3 UI layer)

| Track A                        | Track B                    |
| ------------------------------ | -------------------------- |
| T019 `FileThumbnail` component | T020 `KindBadge` component |
| T021 `DeleteFileModal`         | T022 `FileTable` component |
| T023 `useFileDownload` hook    | T024 `useDeleteFile` hook  |

### Wave 5: US2 Discovery (Phase 4)

| Track A                              | Track B                     | Track C                     |
| ------------------------------------ | --------------------------- | --------------------------- |
| T025 GET `/api/files` list route     | T028 `loading.tsx` skeleton | T034 `EmptyState` component |
| T026 `listFilesQuery` cached fn      | T030 `FileSearchBox`        | T035 Error boundary + retry |
| T027 Files page SSR                  | T031 `FileSortControls`     | T036 Navigation entry       |
| T029 `FileListClient` TanStack Query | T032 `FileKindFilter`       | T037 URL sync + state       |
| T033 Intersection Observer scroll    |                             |                             |

### Wave 6: Polish (Phase 5)

| Track A                       | Track B                            |
| ----------------------------- | ---------------------------------- |
| T038 Mobile responsive layout | T039 `revalidateFilesCache` helper |
| T040 Security rules test      | T041 Cascade delete org hook       |
| T042 Badge contrast check     | T043 `npm test && npm run lint`    |

---

## Implementation Strategy

**MVP Scope (User Story 1 only)**:  
Complete T001–T004 (Setup) → T005–T010 (Foundational) → T011–T024 (US1) to deliver a fully working file lifecycle: upload, download, thumbnail, delete, and basic display. Can be tested immediately via API without UI.

**Full Scope**:  
Complete all phases through T043 to deliver the complete file discovery experience with search, sort, filter, continuous scroll, and responsive layout.

**Recommended order for solo developer**:

1. T001–T010 (Setup + Foundational) — all parallelisable except T005
2. T011 (Upload) — blocks all US1 API work
3. T012–T015 in parallel (Download, Thumbnail, Metadata, Delete routes)
4. T016–T018 in parallel (Server Action, Query functions)
5. T019–T024 in parallel (UI components + hooks)
6. T025–T026 (List route + query) — blocks US2 UI
7. T027–T037 in parallel groups (Discovery UI)
8. T038–T043 (Polish)
