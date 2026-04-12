# Feature Specification: Memory Module

**Feature Branch**: `003-memory-module`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "Build memory module with Next.js - User can create, delete, view memory with pagination, sorting, filter. User can create, delete, view memory documents with pagination, sorting, filter. Store memories inside organization/id/memories/doc and organization/id/memories/id/documents/id"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Memory Lifecycle Management (Priority: P1)

An authenticated user wants to create and organize named memory containers to capture and store important information. They navigate to the Memories section, create a new memory with a title and optional description, see it appear in their list, and can later delete it when it's no longer needed (with a confirmation step to prevent accidental loss).

**Why this priority**: Memories are the foundational container for memory documents. Nothing else can be built until memories exist.

**Independent Test**: Can be fully tested by creating one memory and verifying it appears in the list, then deleting it and verifying it disappears — delivers a complete CRUD lifecycle without any memory document functionality.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Memories page, **When** they submit a valid memory title, **Then** the memory appears in their memory list immediately and is persisted.
2. **Given** a memory exists, **When** the user triggers deletion and confirms, **Then** the memory and all its documents are permanently removed.
3. **Given** a memory exists, **When** the user cancels the delete confirmation, **Then** the memory is not deleted.
4. **Given** the user has no memories, **When** they view the Memories page, **Then** an empty state is shown with a prompt to create their first memory.
5. **Given** a memory exists, **When** the user opens it, **Then** the memory detail view displays the memory's metadata and the associated memory documents list.

---

### User Story 2 - Memory Document Management Within a Memory (Priority: P2)

A user opens a memory and creates one or more memory documents (e.g., notes, references, structured data). They can see a list of all documents in the memory, search and filter them, and delete individual documents when no longer needed.

**Why this priority**: Memory documents are the primary use-case for storing information within a memory. This delivers concrete value independently of other features.

**Independent Test**: Can be fully tested by creating a memory document within an existing memory, verifying it appears in the document list with title and metadata, then deleting it and verifying removal — no additional features required.

**Acceptance Scenarios**:

1. **Given** a memory is open, **When** the user creates a document with a title and optional content, **Then** the document appears in the document list with title, creation timestamp, and last-modified timestamp.
2. **Given** a memory document exists, **When** the user clicks the document, **Then** the full document content is displayed.
3. **Given** a memory document exists, **When** the user edits and saves changes, **Then** the document reflects the updates and the last-modified timestamp is refreshed.
4. **Given** a memory document exists, **When** the user deletes the document and confirms, **Then** the document is permanently removed from the memory.
5. **Given** a memory is open, **When** the user creates multiple documents, **Then** all documents are displayed in a paginated list.

---

### User Story 3 - Memory Condensation (Priority: P2)

As a memory accumulates documents approaching its capacity limit, the system automatically triggers a condensation workflow at a configurable threshold (default: 50% capacity). A Worker Agent summarizes the 10 oldest documents into a single "Contextual Summary" document using AI (Gemini), then automatically deletes the 10 old documents. This allows users to preserve long-term context without losing information, while staying within their document limits.

**Why this priority**: Condensation delivers intelligent information aggregation without requiring manual intervention. It's a peer-level feature with document management since it directly affects document lifecycle.

**Independent Test**: Can be fully tested by creating a memory with capacity 100, adding documents past 50% threshold (51+ documents), verifying the system creates a condensation summary document and deletes oldest 10 documents automatically — no user intervention required.

**Acceptance Scenarios**:

1. **Given** a memory has 51+ documents (over 50% of its 100-document capacity), **When** a new document is created, **Then** the system automatically summarizes the 10 oldest documents into a single "Contextual Summary" document and deletes those 10 old documents in a single atomic transaction.
2. **Given** a condensation summary exists in the memory, **When** the user views the document list, **Then** the summary is listed with a visual indicator (badge or label) showing it as an AI-generated summary.
3. **Given** a condensation summary exists, **When** the user clicks it, **Then** the full summary content is displayed with a note indicating it's a machine-generated summarization.
4. **Given** a user reduces a memory's capacity to a value below its current document count, **When** the reduction is saved, **Then** the system automatically evicts the oldest documents to bring the count in line with the new capacity (no summarization; pure FIFO deletion).
5. **Given** condensation is in progress (Gemini summarization API is being called), **When** a new document is created during this window, **Then** the new document creation succeeds immediately; condensation completes asynchronously without blocking.

---

### Edge Cases

- What happens when a memory title is empty or exceeds 200 characters? → Validation error; memory not created.
- What happens when a memory document title is empty or exceeds 500 characters? → Validation error; document not created.
- What happens when a user attempts to create a memory with a title that already exists? → Allow duplicate titles; uniqueness is not enforced.
- What happens when the user deletes a memory that contains multiple documents? → All documents are cascade-deleted; user sees a warning in the confirmation dialog listing the count of documents that will be lost.
- What happens when two browser tabs simultaneously delete the same memory? → The second request responds gracefully (idempotent delete).
- What happens when a search query returns no results? → An empty state is shown with the active search term displayed and a "Clear search" affordance.
- What happens when the user navigates to a paginated page that no longer exists (e.g. after deletion reduces total)? → Redirect to the last valid page.
- What happens when sorting and search are applied simultaneously? → Both constraints apply together (sort is applied to the filtered/searched result set).
- What happens when a user updates a memory document while viewing it? → The view should reflect the changes immediately upon save.
- What happens when a user navigates away while editing a memory document without saving? → Unsaved changes are discarded silently; no confirmation dialog or draft recovery is shown.
- What happens when a memory reaches its document capacity and a new document is created? → The oldest document by creation date is automatically and silently deleted to make room for the new document (FIFO eviction); no user confirmation is shown for the deletion.
- What happens when a user reduces the document capacity of a memory to a value lower than its current document count? → The oldest documents are automatically evicted to bring the count in line with the new capacity; the operation completes atomically, and users see the reduced count in the UI immediately.
- What happens when a user attempts to set a document capacity of 0 or negative? → Validation error; minimum capacity is 1; the memory retains its previous capacity value.
- What happens when condensation is triggered but fewer than 10 documents exist (e.g. capacity 20, threshold 50% fires at 10 documents, but only 8 documents are present due to prior deletions)? → Condensation summarizes all available documents using the actual count — not a hardcoded 10; the batch deletes `n` source documents and creates 1 summary, decrementing `documentCount` by `n − 1`.
- Q: What is the default and configurable document capacity for a memory? → A: Default capacity is 100 documents per memory; capacity is configurable at memory creation and edit time with a minimum of 1 document and no hard maximum. When capacity is exceeded, FIFO eviction automatically removes the oldest document.

## Requirements _(mandatory)_

### Functional Requirements

#### Memory Management

- **FR-001**: Users MUST be able to create a memory by providing a title (1–200 characters, required) and an optional description (up to 1000 characters). Users MAY optionally set a document capacity limit (default: 100 documents). The capacity determines the maximum number of documents a memory can hold; once reached, creating a new document automatically deletes the oldest document by creation date (FIFO eviction).
- **FR-002**: Users MUST be able to view a paginated list of all memories belonging to their organisation, ordered by creation date descending. Each memory card MUST show its title, description (if set), creation date, and document count.
- **FR-003**: Users MUST be able to edit a memory's title, description, and document capacity limit after creation.
- **FR-004**: Users MUST be able to delete a memory, after confirming via a danger-intent modal that lists the count of documents that will be permanently deleted.
- **FR-005**: Deleting a memory MUST cascade-delete all memory documents contained within it.
- **FR-006**: Users MUST be able to search memories by title (case-insensitive, prefix match — e.g., typing "pro" matches "Project Notes").
- **FR-007**: The memory list MUST be sortable by: title (A→Z / Z→A) and creation date (newest / oldest). Default sort is creation date descending.
- **FR-008**: The memory list MUST support pagination; each page MUST display up to 25 items by default, with the user able to navigate to the next/previous page.
- **FR-009**: Active search queries and sort selections MUST be preserved in the URL (query params) so the view can be bookmarked.
- **FR-010**: All memory operations MUST be scoped to the authenticated user's organisation — users MUST NOT be able to access another organisation's memories.
- **FR-010a**: The Memory module MUST appear as a top-level sidebar navigation entry at the same hierarchy level as the Stores module, making it immediately discoverable.

#### Memory Document Management

- **FR-011**: Users MUST be able to create a memory document within a memory by providing a title (1–500 characters, required) and optional plain-text content (up to 10,000 characters). Content is stored and displayed as plain text; no rich-text or Markdown rendering is supported.
- **FR-012**: Users MUST be able to view a paginated list of all documents within a memory, ordered by creation date descending. Each document entry MUST show its title, creation timestamp, and last-modified timestamp.
- **FR-013**: Users MUST be able to open a memory document and view its full content.
- **FR-014**: Users MUST be able to edit a memory document's title and content after creation, with the last-modified timestamp updated on save.
- **FR-015**: Users MUST be able to delete a memory document after confirmation.
- **FR-015a**: The `documentCount` on a Memory MUST be updated atomically in the same Firestore transaction as every document create or delete operation to ensure it always reflects the true count.
- **FR-016**: Users MUST be able to search memory documents by title within a memory (case-insensitive, prefix match).
- **FR-017**: The memory document list MUST be sortable by: title (A→Z / Z→A), creation date (newest / oldest), and last-modified date (newest / oldest). Default sort is creation date descending.
- **FR-018**: The memory document list MUST support pagination; each page MUST display up to 25 items by default.
- **FR-019**: Active search queries and sort selections within a memory MUST be preserved in the URL (query params).
- **FR-020**: Memory documents MUST be scoped to their parent memory and organisation — users MUST NOT be able to access documents from other organisations' memories.
- **FR-021**: While list views are loading, the UI MUST display skeleton loaders for list items and temporarily disable sort/filter controls to prevent interaction with stale data.
- **FR-022**: When a memory has reached its document capacity limit and a new document is created, the system MUST atomically delete the oldest document (by creation date) and create the new document in a single Firestore transaction, maintaining FIFO eviction semantics. The oldest document's deletion MUST NOT trigger a user confirmation prompt; deletion is automatic and silent.
- **FR-023**: When a memory's document count reaches or exceeds 50% of its document capacity (configurable via `condenseThresholdPercent`, default: 50), the system MUST automatically trigger an asynchronous Memory Condensation workflow that: (a) selects the 10 oldest documents, (b) generates a machine-readable "Contextual Summary" using Gemini 3.1 Flash, (c) creates a new document marked with `isCondensationSummary: true` containing the summary, and (d) atomically deletes the 10 original documents in a single batch transaction. Condensation is non-blocking; document creation always succeeds immediately.
- **FR-024**: Condensation summary documents MUST be visually distinguishable from user-created documents in the UI with a badge or label indicating "AI-Generated Summary". Users MAY filter to show/hide condensation summaries via an optional UI toggle.
- **FR-025**: Every memory and memory document MUST capture and store the `sessionId` of the user who created it, enabling session-level audit trails and tracing. The session ID is captured from the authenticated session context at creation time.
- **FR-026**: The Memory module API endpoints (`POST /api/memories`, `GET /api/memories`, `POST /api/memories/{id}/documents`, etc.) MUST stream JSON responses using progressive chunking compatible with TanStack Query v5 and React Suspense for efficient paginated list rendering on the client.

### Key Entities

- **Memory**: A named container owned by an organisation. Has a title (required, 1–200 chars), an optional description (max 1000 chars), a `documentCapacity` limit (configurable, default: 100, minimum: 1), a `condenseThresholdPercent` (configurable, default: 50), creation timestamp, last-updated timestamp, `sessionId` of creator, and a `documentCount` maintained via atomic Firestore increment/decrement on each document write. Scoped to one organisation. Stored at `organization/{orgId}/memories/{memoryId}`.
- **Memory Document**: A content entry within a Memory. Has a user-defined title (required, 1–500 chars), optional plain-text content (max 10,000 chars, no rich-text or Markdown), creation and last-modified timestamps, `sessionId` of creator, and a boolean flag `isCondensationSummary` (default: false; set to true for AI-generated summaries). Scoped to one memory and one organisation. Stored at `organization/{orgId}/memories/{memoryId}/documents/{documentId}`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a memory and have it ready to use in under 30 seconds.
- **SC-002**: Users can create a memory document and have it appear in the list within 2 seconds.
- **SC-003**: Users can create, view, edit, and delete a memory document without leaving the memory detail page.
- **SC-004**: Memory deletion (including cascade) completes within 10 seconds for memories containing up to 100 documents.
- **SC-005**: Memory and document list views load their first page within 2 seconds; search results appear within 1 second of the user stopping typing (debounced). Loading states display skeleton loaders with disabled sort/filter controls.
- **SC-006**: 100% of cross-organisation access attempts are rejected — no data leakage between organisations.
- **SC-007**: Users can toggle between different sort orders on both memory and document lists with the view updating in under 1 second.
- **SC-008**: Memory condensation is triggered automatically at 50% document capacity and completes asynchronously without blocking document creation; document creation always succeeds within 2 seconds even during condensation.

## Data Model

### Firestore Structure

```
organizations/{orgId}
├── memories/{memoryId}
│   ├── title: string (required, 1-200 chars)
│   ├── description: string | null (optional, max 1000 chars)
│   ├── documentCapacity: number (default: 100, minimum: 1)
│   ├── condenseThresholdPercent: number (default: 50, range: 1-100)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── sessionId: string (creator's session ID)
│   ├── documentCount: number
│   └── documents/{documentId}
│       ├── title: string (required, 1-500 chars)
│       ├── content: string (optional, max 10,000 chars, plain text)
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       ├── sessionId: string (creator's session ID)
│       └── isCondensationSummary: boolean (default: false)
```

### Indexes Required

- `organizations/{orgId}/memories`: Composite index on `createdAt` (descending) for default sort
- `organizations/{orgId}/memories/{memoryId}/documents`: Composite index on `createdAt` (descending) for default sort

## Assumptions

- Users are authenticated and have completed onboarding (an `orgId` exists) before accessing the Memory module.
- The platform already provides organisation-scoped authentication via the session cookie + `withContext` pattern established in the auth module.
- One organisation can have multiple memories (no hard cap in v1; practical Firestore document/subcollection limits apply).
- Memories are not shared between organisations in v1 — sharing/collaboration is out of scope.
- Memory content is scoped per user's organisation; multi-tenancy is enforced at the organisation level.
- Pagination uses cursor-based pagination via Firestore `startAfter(sortValue, docId)` pattern established in the store module.

## Clarifications

### Session 2026-04-11

- Q: What visual feedback should users see when lists are loading or search is debouncing? → A: Skeleton loaders for list items with sort/filter controls temporarily disabled during loading state.
- Q: What happens when a user navigates away from a memory document editor without saving? → A: Unsaved changes are discarded silently — no confirmation dialog or draft recovery.
- Q: What content format should memory documents support? → A: Plain text only — textarea input, stored and displayed as-is; no rich-text or Markdown rendering.
- Q: How should the `documentCount` on a Memory be kept accurate? → A: Atomic Firestore increment/decrement in the same transaction as each document create or delete — consistent with the pattern used in the Store module.
- Q: Where should the Memory module appear in platform navigation? → A: Top-level sidebar entry alongside Stores at the same hierarchy level, making it a peer-level module with identical navigation prominence.
- Q: What is the default and configurable document capacity for a memory? → A: Default capacity is 100 documents per memory; capacity is configurable at memory creation and edit time with a minimum of 1 document and no hard maximum. When capacity is exceeded, FIFO eviction automatically removes the oldest document.
- Q: What is Memory Condensation and when is it triggered? → A: Memory Condensation is an intelligent document lifecycle feature that activates when document count reaches 50% of capacity (e.g., 50 docs when capacity is 100). A LangGraph Worker Agent summarizes the 10 oldest documents into a single AI-generated "Contextual Summary" document using Gemini 3.1 Flash, then atomically deletes those 10 documents in a single batch transaction. Condensation runs asynchronously and does not block document creation.
- Q: How are memories and documents tracked for audit purposes? → A: Every memory and memory document captures the `sessionId` of the authenticated user who created it. This enables session-level audit trails and tracing for compliance and debugging.
- Q: What API design and streaming strategy is used for list views? → A: All list endpoints stream JSON responses using progressive chunking compatible with TanStack Query v5 and React Suspense. Pagination is cursor-based (using `startAfter(sortValue, docId)`) with optional search/sort query parameters preserved in URLs for bookmarking.
