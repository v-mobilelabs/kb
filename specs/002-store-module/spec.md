# Feature Specification: Store Module

**Feature Branch**: `002-store-module`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "User can create and delete stores. Under each store, users can add files and create custom JSON data."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Store Lifecycle Management (Priority: P1)

An authenticated user wants to organise their data into named stores. They navigate to the Stores section, create a new store by providing a name, see it appear in their list, and can later delete it (with a confirmation step to prevent accidental loss).

**Why this priority**: Stores are the foundational container for all other data. Nothing else can be built until stores exist.

**Independent Test**: Can be fully tested by creating one store and verifying it appears in the list, then deleting it and verifying it disappears — delivers a complete CRUD lifecycle without any file or JSON functionality.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Stores page, **When** they submit a valid store name, **Then** the store appears in their store list immediately and is persisted.
2. **Given** a store exists, **When** the user triggers deletion and confirms, **Then** the store and all its contents are permanently removed.
3. **Given** a store exists, **When** the user cancels the delete confirmation, **Then** the store is not deleted.
4. **Given** the user has no stores, **When** they view the Stores page, **Then** an empty state is shown with a prompt to create their first store.

---

### User Story 2 - File Management Within a Store (Priority: P2)

A user opens a store and uploads one or more files (e.g. images, PDFs, text files). They can see a list of all files in the store, and delete individual files when no longer needed.

**Why this priority**: File storage is a primary use-case for a store. It delivers concrete value independently of the JSON data feature.

**Independent Test**: Can be fully tested by uploading a file to an existing store, verifying it appears in the file list with name and size, then deleting it and verifying removal — no JSON data feature required.

**Acceptance Scenarios**:

1. **Given** a store is open, **When** the user selects and uploads a file, **Then** the file appears in the file list with name, size, and upload timestamp.
2. **Given** a file exists in a store, **When** the user clicks the file name, **Then** a download or preview of the file is initiated.
3. **Given** a file exists in a store, **When** the user deletes the file and confirms, **Then** the file is permanently removed from the store.
4. **Given** a store is open, **When** the user uploads a file whose name already exists in that store, **Then** the existing file is replaced and the list reflects the latest version.

---

### User Story 3 - Custom JSON Data Records Within a Store (Priority: P3)

A user opens a store and creates named JSON data records — arbitrary key-value structured data they define. They can view, edit, and delete individual JSON records within a store.

**Why this priority**: Structured data records complement file storage, but stores and file management must exist first. JSON records are an additive capability.

**Independent Test**: Can be fully tested by creating a JSON record with a custom name and a valid JSON body in an existing store, verifying it appears in the records list, editing it, and deleting it — no file upload feature required.

**Acceptance Scenarios**:

1. **Given** a store is open, **When** the user creates a JSON record with a name and valid JSON body, **Then** the record appears in the data records list with its name and creation timestamp.
2. **Given** a JSON record exists, **When** the user opens it to edit and submits updated JSON, **Then** the record content reflects the change and the updated timestamp is refreshed.
3. **Given** a JSON record is submitted with invalid JSON syntax, **When** the form is submitted, **Then** a validation error is shown and the record is not saved.
4. **Given** a JSON record exists, **When** the user deletes it and confirms, **Then** the record is permanently removed.

---

### Edge Cases

- What happens when a store name is empty or exceeds 100 characters? → Validation error; store not created.
- What happens when a file upload fails mid-transfer? → Error message shown; no partial record created.
- What happens when the user attempts to upload a file larger than the enforced size limit? → Validation error before upload begins.
- What happens when a JSON record body is an empty string? → Treated as invalid JSON; validation error shown.
- What happens when the user deletes a store that contains files and JSON records? → All contents are cascade-deleted; user sees a warning in the confirmation dialog listing the count of items that will be lost.
- What happens when two browser tabs simultaneously delete the same store? → The second request responds gracefully (idempotent delete).
- What happens when a search query returns no results? → An empty state is shown with the active search term displayed and a "Clear search" affordance.
- What happens when the user navigates to a paginated page that no longer exists (e.g. after deletion reduces total)? → Redirect to the last valid page.
- What happens when sorting and search are applied simultaneously? → Both constraints apply together (sort is applied to the filtered/searched result set).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to create a store by providing a unique (within their organisation) name of 1–100 characters and an optional description of up to 500 characters.
- **FR-002**: Users MUST be able to view a paginated list of all stores belonging to their organisation, ordered by creation date descending. Each store card MUST show its name, description (if set), and item counts.
- **FR-002a**: Users MUST be able to edit a store's name and description after creation.
- **FR-003**: Users MUST be able to delete a store, after confirming via a danger-intent modal that lists the count of files and JSON records that will be permanently deleted.
- **FR-004**: Deleting a store MUST cascade-delete all files and JSON data records contained within it.
- **FR-005**: Users MUST be able to upload one file at a time to a store; each file is identified by its original filename within the store. The upload MUST be performed client-direct to Firebase Cloud Storage using a server-generated short-lived signed upload URL (avoiding routing file bytes through the Next.js server).
- **FR-006**: Users MUST be able to view the file list within a store (filename, file size in human-readable form, uploaded timestamp).
- **FR-007**: Users MUST be able to download an uploaded file by clicking its name; the system MUST generate a short-lived (15-minute) signed URL server-side per request — the file MUST NOT be publicly accessible without a valid session.
- **FR-008**: Users MUST be able to delete an individual file from a store after confirmation.
- **FR-009**: Uploading a file with a name that already exists in the store MUST replace the existing file (upsert semantics).
- **FR-010**: Users MUST be able to create a named JSON data record within a store by providing a record name (1–100 chars) and a valid JSON body.
- **FR-011**: Users MUST be able to view the list of JSON records in a store (record name, creation timestamp).
- **FR-012**: Users MUST be able to open a JSON record, view its full content, and edit and save changes.
- **FR-013**: Submitting a JSON record with invalid JSON syntax MUST be rejected with an inline validation error; the record MUST NOT be persisted.
- **FR-014**: Users MUST be able to delete a JSON record after confirmation.
- **FR-015**: All store and content operations MUST be scoped to the authenticated user's organisation — users MUST NOT be able to access another organisation's stores.
- **FR-016**: File size MUST be limited to 50 MB per upload.
- **FR-017**: Each store MUST display a summary count of files and JSON records it contains.
- **FR-018**: The store list MUST support text search by store name (case-insensitive, **prefix match** — e.g., typing "acm" matches "Acme Store") and be filterable by creation date range. Substring matching (e.g., "cme" matching "Acme") is out of scope for v1 due to Firestore query limitations; a UI tooltip SHOULD communicate this constraint to users.
- **FR-019**: The store list MUST be sortable by: name (A→Z / Z→A) and creation date (newest / oldest). Default sort is creation date descending.
- **FR-020**: The file list within a store MUST support text search by filename and be sortable by: filename (A→Z / Z→A) and upload date (newest / oldest).
- **FR-021**: The JSON record list within a store MUST support text search by record name and be sortable by: record name (A→Z / Z→A), creation date, and last-updated date (newest / oldest).
- **FR-022**: All list views (stores, files, JSON records) MUST support pagination; each page MUST display up to 25 items by default, with the user able to navigate to the next/previous page.
- **FR-023**: Active search queries and sort selections MUST be preserved in the URL (query params) so the view can be bookmarked and shared within the organisation.

### AI Enrichment Requirements

- **FR-024**: After a document (file or custom JSON) is written, the system MUST asynchronously enrich it with AI-extracted metadata — status transitions: `pending` → `processing` → `completed | failed`. The UI MUST reflect the current enrichment status via a badge (shimmer for `pending`, spinner for `processing`, keyword chips for `completed`, warning for `failed`). Document creation is not blocked by enrichment; enrichment is optional and can fail gracefully.
- **FR-024a**: When enrichment fails, the system MUST implement automatic exponential backoff retry: initial attempt + up to 3 exponential backoff retries (2s, 4s, 8s delays) = 4 total attempts before marking as permanently `failed`. Failed enrichments MUST be visible to users via the error badge; manual retry trigger is not required but may be supported in future versions.
- **FR-025**: For file documents, the system MUST use Gemini 3.1 Flash (multimodal) to extract readable text (up to 10,000 characters) and generate a 2–4 sentence summary. For custom JSON documents, the system MUST use Gemini 3.1 Flash to generate a summary from the JSON structure and name.
- **FR-026**: The system MUST extract up to 20 keyword tags per document using Gemini 3.1 Flash structured output. Keywords MUST be lowercase and displayed as chips on the document when enrichment status is `completed`.
- **FR-027**: The system MUST generate a 768-dimensional text embedding per document using `text-embedding-004` and store it in the Firestore resource record for future semantic search via `findNearest()`.
- **FR-028**: For file documents, the system MUST index the file in a per-store Gemini File Search corpus (named `kb-{orgId}-{storeId}`) to enable future Gemini grounded generation over the store's contents. The corpus MUST be created automatically on first file upload and deleted when the store is deleted.

### Key Entities

- **Store**: A named container owned by an organisation. Has a name (required, 1–100 chars, unique within the org), an optional description (max 500 chars), creation timestamp, last-updated timestamp, and summary stats: `fileCount` (binary files) and `customCount` (JSON records). The UI displays these as separate item counts per FR-017. Scoped to one organisation.
- **File**: A binary object stored within a Store. Identified by its original filename within the store. Carries file size and upload timestamp. Backed by Firebase Cloud Storage (private bucket — no public access). Downloaded via server-generated short-lived signed URLs (15-minute expiry).
- **JSON Record**: A named structured-data entry within a Store. Has a user-defined name and an arbitrary JSON body. Supports full create/read/update/delete.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a store and have it ready to use in under 30 seconds.
- **SC-002**: File upload completes and the file appears in the list within 5 seconds for files up to 10 MB on a standard broadband connection.
- **SC-003**: Users can create, view, edit, and delete a JSON record without leaving the store detail page.
- **SC-004**: Store deletion (including cascade) completes within 10 seconds for stores containing up to 100 items.
- **SC-005**: All list views (stores, files, JSON records) load their first page within 2 seconds; search results appear within 1 second of the user stopping typing (debounced).
- **SC-006**: 100% of cross-organisation access attempts are rejected — no data leakage between organisations.

## Clarifications

### Session 2026-04-06

- Q: After a file is uploaded to a store, how should users access/download it? → A: Time-limited signed URLs — server generates a short-lived authenticated URL per download request; only org members with a valid session can access files.
- Q: Must a JSON record name be unique within a store? → A: No — names are not enforced as unique; search, filter, and sort handle disambiguation.
- Q: Should users be able to add an optional description when creating or editing a store? → A: Yes — optional free-text description (max 500 chars) on create and edit.
- Q: Is there a hard cap on the number of stores per organisation? → A: No hard cap in v1; practical Firestore limits apply.
- Q: How are files uploaded — directly from the browser to storage, or proxied through the server? → A: Client-direct using a server-generated short-lived signed upload URL — avoids routing large file bytes through the Next.js server.

### Session 2026-04-07

- Q: What happens if AI enrichment (Gemini API) fails after a document is uploaded? → A: Document creation succeeds; enrichment status transitions to `failed` with error badge shown to user. User can manually retry enrichment or proceed with the document (enrichment is not blocking). Automatic exponential backoff retry up to 3 times before manual intervention required. (Implements Option B: documents are usable even if enrichment fails.)
- Q: Should the spec use "document" or "Resource" terminology? → A: User-facing spec uses "document" and "file/JSON record" (user-friendly terms). Internal implementation uses "Resource" model with discriminated union types (file, data, node). No spec updates needed — terminology remains consistent with user language.
- Q: What observability/logging is required for the enrichment pipeline? → A: AI enrichment pipeline logs to Cloud Logging with start/completion events and error details. Status is exposed via `context.status` field in Firestore. No alerting layer required for v1; manual monitoring of failed enrichments via Cloud Logging is sufficient.

## Assumptions

- Users are authenticated and have completed onboarding (an `orgId` exists) before accessing the Store module.
- The platform already provides organisation-scoped authentication via the session cookie + `withContext` pattern established in the auth module.
- One organisation can have multiple stores (no hard cap in v1; practical Firestore document/subcollection limits apply). Store count is not displayed as a quota to users.
- Stores are not shared between organisations in v1 — sharing/collaboration is out of scope.
- File storage uses Firebase Cloud Storage with a private (non-public) bucket, scoped per organisation and store. Files are never served via public URLs; every download is served via a server-generated signed URL with a 15-minute expiry. Uploads are client-direct using a server-generated short-lived signed upload URL (15-minute expiry), so large file bytes never pass through the Next.js server.
- File type restrictions are not enforced in v1 — any MIME type is accepted up to the 50 MB limit.
- JSON records store the body as a raw JSON string; no schema validation beyond syntactic correctness is required in v1.
- Mobile-first responsive layout; no native mobile app required.
- Bulk file upload (multiple files at once) is out of scope for v1.
