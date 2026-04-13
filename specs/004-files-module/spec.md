# Feature Specification: Files Module

**Feature Branch**: `004-files-module`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Build a files module, org-scoped, cascade delete on org deletion. API endpoints for upload, thumbnail, download, delete. UI views for files with continuous scroll pagination, sorting, and filtering by kind/id."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - File Lifecycle Management (Priority: P1)

An authenticated user uploads a file to their organisation, views it in a files list with metadata (name, size, kind), and can delete it when no longer needed. The file is securely stored per organisation and isolated from other orgs.

**Why this priority**: File upload is the core feature enabling document storage. Without it, other features are blocked.

**Independent Test**: Can be fully tested by uploading a file, verifying it appears in the file list with name/size/kind visible, then deleting it and confirming removal — no UI integration with other modules required yet.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Files page, **When** they upload a file, **Then** the file endpoint returns a document record with id, name (UUID), size, mime type, and kind; the file is stored at `/organizations/{orgId}/files/{fileId}`.
2. **Given** a file has been uploaded, **When** the user views the Files page, **Then** the file appears in the list with its original name, size in human-readable format (KB, MB), kind badge, and upload timestamp.
3. **Given** a file exists, **When** the user clicks delete and confirms, **Then** a DELETE request is sent and the file and its document record are permanently removed.
4. **Given** a file exists, **When** the user clicks to download it, **Then** a signed Firebase Storage URL is generated server-side and returned, allowing the user to download the file with a 15-minute link expiry.
5. **Given** a file exists and is an image, **When** the user requests a thumbnail, **Then** the API returns a thumbnail image if available, or falls back to a generic kind-based icon.

---

### User Story 2 - File Discovery & Management (Priority: P2)

An authenticated user wants to easily discover and manage their organisation's files. They can search files by name, sort by name/date/size, filter by file kind (image, pdf, doc, etc.), and paginate through a large list using continuous scroll.

**Why this priority**: Large organisations accumulate many files; discovery and filtering are essential for usability.

**Independent Test**: Can be fully tested by uploading 3+ files of different kinds, applying search/sort/filter, and verifying results and pagination work correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Files page with multiple files, **When** they type in a search box, **Then** the list filters to show only files whose original name contains the search term (case-insensitive, prefix match), live-updating as they type (debounced).
2. **Given** multiple files in the list, **When** the user selects a sort option (name A→Z, name Z→A, date newest, date oldest, size smallest, size largest), **Then** the list re-sorts immediately and preserves the sort selection in the URL query params.
3. **Given** multiple files in the list, **When** the user selects a kind filter (e.g., "image", "pdf", "doc"), **Then** the list shows only files matching that kind; multiple kind filters can be applied simultaneously (OR logic — shows files matching ANY of the selected kinds).
4. **Given** a list of 50+ files, **When** the user scrolls to the bottom of the visible list, **Then** the next page of 25 items automatically loads (continuous scroll; no manual "Load More" button), cursor-based pagination using the last file's id.
5. **Given** active search, sort, and filter selections, **When** the user refreshes the page or shares the URL with another org member, **Then** all filters are preserved and the exact same view is restored.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to upload a single file (up to 50 MB) via `POST /api/files` using a multipart form request. The endpoint MUST accept file bytes in the request body, handle all Storage upload logic server-side, store the file in Firebase Cloud Storage at `/organizations/{orgId}/files/{uuid}.{extension}`, create a File document record with: `id` (UUID), `orgId`, `originalName`, `fileName` (UUID.ext), `size` (bytes), `mimeType`, `kind` (inferred), `uploadedBy` (uid), `createdAt`. Response MUST include the full File document.
- **FR-002**: Users MUST be able to retrieve a list of files for their organisation via the `/api/files` endpoint with pagination (cursor-based, 25 items per page by default), search (by `originalName` prefix), sorting (by name, createdAt, size), and filtering (by `kind` — single or multiple). Query params: `search`, `sort`, `order` (asc/desc), `kinds` (comma-separated), `cursor`. Response MUST include file items and `nextCursor` for pagination.
- **FR-003**: Users MUST be able to download a file via `GET /api/files/:id/download`. The endpoint MUST verify org ownership, generate a server-side signed Firebase Storage URL with 15-minute expiry, and return the URL for client-side download. The file MUST NOT be publicly accessible; only authenticated org members MUST be able to download their org's files.
- **FR-004**: Users MUST be able to retrieve a thumbnail for image files via `GET /api/files/:id/thumbnail`. For image files, the endpoint MUST return a preview image (generated or cached). For non-image kinds, the endpoint MUST return a fallback generic icon representing the file kind (PDF badge, document icon, etc.) as an SVG data URL embedded in the JSON response (e.g., `data:image/svg+xml;base64,...`). Response MUST be a JSON object with shape `{ isImage: true, url: string, contentType: string }` for images or `{ isImage: false, data: string, contentType: 'image/svg+xml' }` for non-image fallbacks.
- **FR-005**: Users MUST be able to delete a file via `DELETE /api/files/:id`. The endpoint MUST verify org ownership, delete the file from Firebase Cloud Storage, delete the File document record from Firestore, and return a success response. Deletion MUST be permanent and irreversible.
- **FR-006**: All file operations (upload, list, download, thumbnail, delete) MUST be scoped to the authenticated user's organisation — users MUST NOT be able to access another organisation's files. Organisation membership MUST be verified via the session context (`withContext`).
- **FR-007**: File upload MUST store metadata including size in bytes, MIME type (detected from the uploaded file), and a `kind` (inferred from MIME: image, pdf, doc, sheet, video, audio, text, other). The kind MUST be used for UI filtering and display.
- **FR-008**: File names MUST be stored as UUID.extension on the backend (`fileName`), while the original name is preserved in the document as `originalName` for display.
- **FR-009**: Uploaded files MUST be stored in Firebase Cloud Storage at private paths: `organizations/{orgId}/files/{uuid}.{extension}`. Firebase Security Rules MUST enforce that only authenticated users from the owning organisation can read/write/delete files in their org's folder.
- **FR-010**: The `GET /api/files` endpoint MUST support prefix-based search on `originalName` (case-insensitive, e.g., "report" matches "Report-2026.pdf"). Prefix matching (not substring) is intentional for Firestore query efficiency.
- **FR-011**: Sorting options for the list MUST be: `name` (originalName A→Z / Z→A), `createdAt` (newest / oldest), `size` (smallest / largest). Default sort MUST be `createdAt` descending (newest first).
- **FR-012**: Filtering by `kind` MUST support single or multiple selections. When multiple kinds are selected, the query MUST return files matching ANY of the selected kinds (OR logic — union of all selected kinds). Example: selecting "pdf" and "doc" returns files that are EITHER PDF OR DOC, not both.
- **FR-013**: Pagination MUST use cursor-based pagination (not offset-based) to handle real-time list mutations gracefully. The cursor MUST be an opaque value (e.g., base64-encoded docId+sortValue). Each page MUST return up to 25 items by default; the `nextCursor` in the response indicates if more items exist.
- **FR-014**: When a file is deleted, its corresponding File document MUST be deleted from Firestore and the physical file MUST be deleted from Firebase Cloud Storage atomically. If storage deletion fails, the operation MUST fail and the document MUST NOT be deleted (transactional consistency).
- **FR-015**: File size MUST be limited to 50 MB (52,428,800 bytes). Uploads exceeding this MUST be rejected with a `413 Payload Too Large` error before storage.
- **FR-016**: File uploads MUST be performed server-proxied (multipart form upload to `POST /api/files`). The server handles all Storage upload logic and returns metadata. File size limits (50 MB max) MUST be enforced server-side before upload. For v2, consider client-direct uploads with signed URLs if performance optimisation is needed.
- **FR-017**: When deleting an organisation, all files belonging to that organisation MUST be cascade-deleted (both Firestore documents and Cloud Storage objects). The deletion MUST be transactional if possible, or event-triggered via a Firebase Function.

### UI Requirements

- **UI-001**: The Files view MUST display a list of files with columns/cards: thumbnail/icon, original filename, size (human-readable: B, KB, MB, GB), kind badge, upload date, and action buttons (download, delete).
- **UI-002**: The Files view MUST include a search box that filters files by original name in real-time (debounced, 300ms). Search term MUST be preserved in URL query params.
- **UI-003**: The Files view MUST include sortable column headers or a sort dropdown with options: Name (A→Z / Z→A), Date (Newest / Oldest), Size (Smallest / Largest). Active sort MUST be persisted in URL query params.
- **UI-004**: The Files view MUST include a filter panel or dropdown showing available kinds (image, pdf, doc, sheet, video, audio, text, other) with checkboxes or toggle buttons. Multi-select MUST be supported. Active filters MUST be persisted in URL query params.
- **UI-005**: The Files view MUST implement continuous scroll pagination — when the user scrolls to the bottom of the list, the next page of 25 items MUST automatically load without showing a "Load More" button. A loading indicator (shimmer or spinner) MUST appear while fetching the next page.
- **UI-006**: When search, sort, or filter is applied, the URL MUST update with query parameters so the user can bookmark/share the exact view with org members. Example: `/files?search=annual&sort=name&order=asc&kinds=pdf,doc&cursor=abc123`. Note: API endpoints use `/api/files`, not routed URLs.
- **UI-007**: File kind MUST be displayed visually as a badge (colour-coded: blue for image, orange for pdf, green for doc, etc.) and/or a small icon matching the kind.
- **UI-008**: Upload MUST NOT be integrated in the UI yet — API is available but no upload button/form is added to the UI. Files are added only via API for now.
- **UI-009**: The Files view MUST follow the existing design system (HeroUI v3+, Tailwind CSS v4). Layout MUST be responsive (mobile, tablet, desktop). On mobile, columns MAY be condensed or switched to card view.
- **UI-010**: Empty state: When no files exist, a message like "No files yet. Upload your first file via the API." MUST be shown.
- **UI-011**: Error state: When list loading fails, an error message MUST be shown with a "Retry" button.
- **UI-012**: Delete action MUST show a danger-intent confirmation dialog listing the file name and size before permanent deletion.

### Key Entities

- **File**: An organisation-scoped binary object stored in Firebase Cloud Storage. Has: `id` (UUID), `orgId`, `originalName` (user-provided name), `fileName` (UUID.extension stored on disk), `size` (bytes), `mimeType`, `kind` (inferred from MIME), `uploadedBy` (uid), `createdAt`. Accessed via signed URLs with time-limited access (15-minute download expiry, immediate 403 upon org scope violation).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: File upload completes and appears in the list within 5 seconds for files up to 10 MB on a standard broadband connection.
- **SC-002**: Users can download a file via a signed URL within 2 seconds of requesting download.
- **SC-003**: The file list loads its first page (25 items) within 2 seconds; subsequent pages load within 1.5 seconds via continuous scroll.
- **SC-004**: Search results appear within 1 second of the user stopping typing (300ms debounce).
- **SC-005**: File deletion (remove from Firestore, delete from Storage) completes within 5 seconds.
- **SC-006**: 100% of cross-organisation access attempts are rejected — no data leakage between organisations.
- **SC-007**: Thumbnails for images load within 1 second; fallback icons for non-images are instant.

## Clarifications

### Session 2026-04-13 (Initial)

- ~~Q: Should file uploads be performed client-to-storage (direct to Firebase Cloud Storage) or proxied through the Next.js API? → A: Prefer client-direct using a signed upload URL.~~ _(Superseded — see Refinement session: server-proxied is the confirmed final decision.)_
- Q: What file kinds should be supported? → A: Minimum set: image, pdf, doc, sheet, video, audio, text, other. Missing MIME types map to 'other'. Inferred from MIME type at upload time.
- Q: Should file name collision handling rename or overwrite? → A: Overwrite (upsert) — if a new file is uploaded with an identical `originalName`, it replaces the old file. This keeps the file list clean and unambiguous.
- Q: Is there a hard cap on the number of files per organisation? → A: No hard cap in v1; practical Firestore + Cloud Storage limits apply (note: Firestore has 10k writes/sec per collection; distribution across orgs may be needed at enterprise scale).
- Q: How are thumbnails for images generated and stored? → A: Thumbnails are generated on-the-fly by Cloud Storage using image transformation URLs (e.g., `/=w200-h200`) or can be cached in CDN. Fallback generic icons are served locally (no generation cost). v1 may use simple transformation URLs; caching is a v2 optimization.

### Session 2026-04-13 (Refinement)

- Q: Should kind filtering use AND logic (show files matching ALL selected kinds) or OR logic (show files matching ANY selected kind)? → A: **OR logic** — more intuitive for users. Example: "Show me files that are PDF or DOC" rather than the impossible "Show me files that are both PDF and DOC". Updated FR-012 and User Story 2, Scenario 3 to reflect OR logic.
- Q: Should fallback icons for non-image files use SVG data URLs or static binary images from a file directory? → A: **SVG data URLs** — embedded as `data:image/svg+xml;base64,...` in JSON response. Single request, self-contained, efficient for modern frontends. Updated FR-004.
- Q: Should API endpoints use explicit versioning (`/api/v1/files`) or no version prefix (`/api/files`)? → A: **No version prefix** — simpler URLs, versioning via HTTP headers or timestamps. Updated FR-001 through FR-005, UI-006.
- Q: Should signed upload URL generation be hybrid (return signed URL for client-direct upload) or server-proxied (accept file bytes, handle upload server-side)? → A: **Server-proxied** — POST `/api/file/upload` accepts file bytes in request body; server handles all Storage upload logic and returns metadata. Simpler for clients, easier to enforce file size limits. Updated FR-001 and FR-016.

## Assumptions

- Users are authenticated and belong to an organisation (an `orgId` exists) before accessing the Files module.
- Organisation membership and session context are verified via the existing `withContext` pattern (auth module).
- One organisation can have unlimited files (subject to Firestore/Storage quotas). File count quotas may be enforced at the org level in future versions but are not part of v1.
- Files are stored in a private Firebase Cloud Storage bucket scoped per organisation. Public URLs are never generated; all downloads are via server-generated short-lived signed URLs (15-minute expiry).
- File type restrictions are not enforced in v1 — any MIME type is accepted up to the 50 MB limit.
- Bulk file upload (multiple files at once) is out of scope for v1.
- File versioning is not supported; new uploads with the same original name replace the old file (upsert, not history).
- Mobile-first responsive layout; no native mobile app required.
- File search (prefix matching on `originalName`) uses Firestore full-text search capabilities or prefix-query optimisations; exact full-text search is deferred to v2 if Firestore constraints prevent it.
