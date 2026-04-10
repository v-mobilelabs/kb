# Research: Store Module

**Feature**: `002-store-module`
**Date**: 2026-04-06
**Phase**: 0 — Unknowns resolved before design

---

## Decision 1 — Gemini Model Selection for the Enrichment Workflow

### Context

The Firebase Function runs a LangGraph workflow after each document is stored (file or custom JSON). It must:

- Extract file metadata (MIME type, page count, dimensions, duration)
- Extract and summarise text content from documents, PDFs, images, and sheets
- Generate keyword tags for search
- Generate text embeddings
- Index the file in Gemini File Search

Three models are available: `gemini-3.1-lite`, `gemini-3.1-flash`, `gemini-3.1-pro`.

### Decision

**Primary extraction model**: `gemini-3.1-flash`
**Embedding model**: `text-embedding-004` (Google's stable embedding model, 768-dim)
**Reserve model**: `gemini-3.1-pro` (available for future complex reasoning nodes)

### Rationale

| Factor                           | Lite     | Flash ✅ | Pro       |
| -------------------------------- | -------- | -------- | --------- |
| Multimodal (images, PDFs)        | Limited  | Full     | Full      |
| Structured JSON output           | Basic    | Reliable | Reliable  |
| Tokens/sec (async trigger)       | Fast     | Fast     | Slow      |
| Cost per 1M tokens (input)       | Lowest   | Low      | High      |
| Keyword/summary quality          | Adequate | Good     | Excellent |
| Suitability for async enrichment | ✓        | ✓✓       | Overkill  |

Flash is the optimal choice: full multimodal support (needed for image/PDF text extraction), reliable structured output (needed for keyword JSON), cost-effective at scale, and fast enough for background enrichment. **Pro is reserved** for future user-facing analysis features (e.g., "explain this document"). **Lite is not chosen** because it lacks reliable multimodal extraction for PDFs and complex documents.

### Alternatives Considered

- `gemini-3.1-pro` everywhere: unnecessary cost and latency for keyword/metadata tasks run in background
- `gemini-3.1-lite` for keywords only: loses multimodal accuracy; PDFs → text extraction degrades

---

## Decision 2 — Unified Document Collection vs. Separate Subcollections

### Context

The spec originally defined two separate subcollections: `files` and `jsonRecords`. The user has specified a unified `/organizations/{orgId}/stores/{storeId}/documents/{docId}` collection with a `kind` discriminator field.

### Decision

**Single `documents` subcollection** with `kind: DocumentKind` discriminator.

```
DocumentKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'video' | 'audio' | 'text' | 'custom'
```

### Rationale

- A single collection simplifies Firestore queries when searching across all content in a store
- The `kind` field enables Firestore `where('kind', '==', ...)` filters for UI filtering by type
- Firebase Functions can use a single `onDocumentCreated` trigger per path rather than two triggers
- Embedding and keyword fields are common to both file and custom documents — a shared schema avoids redundancy
- Firestore imposes no penalty for sparse fields (absent == null for UI purposes)

### Alternatives Considered

- Two separate subcollections (`files`, `jsonRecords`): Rejected because cross-kind queries (unified search, total count) would require multi-collection group queries; also two separate Function triggers
- One collection + type-specific subcollections: Rejected as premature complexity with no Firestore advantage

---

## Decision 3 — Gemini File Search

### Context

Files must be indexed in the "Gemini File Search API" with `org-id-store-id` as the corpus identifier, enabling semantic search within a store's documents.

### Decision

Use **Gemini File Search** (part of Vertex AI Generative AI platform) as the file search/indexing backend.

- Corpus naming convention: `kb-{orgId}-{storeId}` (lowercase, alphanumeric + hyphens, ≤128 chars)
- A new corpus is provisioned on first file upload to a store
- Files are imported via `GeminiFileSearch.importFiles()` after the Storage trigger fires
- Retrieval is performed via `gemini.retrieveContexts()` with the store's corpus name for future RAG queries

### Rationale

- Gemini File Search is the production-grade Google offering for file-based semantic indexing
- Natively integrates with Gemini 3.1 models for grounded generation
- Supports metadata filtering (can filter by `orgId` and `storeId` in the corpus)
- Persistent corpora survive between requests (unlike the transient Files API)
- Compatible with the Firebase Admin SDK environment used in Cloud Functions

### Alternatives Considered

- Google AI Files API (`ai.files.upload()`): Rejected — ephemeral (files expire in 48h), designed for prompt context injection not persistent search indices
- Pinecone / Weaviate: Rejected — external dependency contradicts the Firebase-first stack
- Firestore Vector Search alone: Used for in-app semantic search (complementary, not a replacement) — does not support document-level grounded generation

---

## Decision 4 — Embedding Storage Strategy

### Context

Custom JSON documents and extracted file text need to be embedded so users can perform semantic search within a store.

### Decision

**Dual strategy**:

1. **Firestore Vector field**: Store `embedding: number[]` (768-dim `text-embedding-004` output) on each `documents/{docId}` record for in-app `findNearest()` queries
2. **Gemini File Search corpus**: Also index the file/text for grounded Gemini retrieval (Decision 3)

### Rationale

- Firestore Vector Search (`collection.findNearest()`) is native, zero additional infrastructure, sub-second on small-to-medium corpora
- `text-embedding-004` (768-dim) matches the Firestore vector index dimension requirement
- The RAG corpus is used for future "ask about my documents" features; the Firestore vector is used for in-app semantic search today

### Alternatives Considered

- RAG corpus only: Does not support Firestore `findNearest()` queries; would require a separate Vertex AI Matching Engine call per search
- Only Firestore Vector: Sufficient for semantic search, but does not enable Gemini grounded generation over the store's documents

---

## Decision 5 — Firebase Function Architecture

### Context

After a file is uploaded to Cloud Storage (client-direct via signed URL), a Firebase Function must trigger the LangGraph enrichment workflow. Custom document writes also need AI enrichment.

### Decision

- **Storage trigger**: `onObjectFinalized` on path `orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename}` → triggers enrichment for file documents
- **Firestore trigger**: `onDocumentCreated` on `organizations/{orgId}/stores/{storeId}/documents/{docId}` where `kind == 'custom'` → triggers enrichment for custom documents
- Functions runtime: **Cloud Functions v2** (Node.js 22, 512 MB, 540s timeout — sufficient for multimodal extraction)
- Framework: **LangGraph.js** for orchestrating the multi-node enrichment graph

### Enrichment Pipeline (Data Flow)

When a `kind: 'data'` resource is created in Firestore, trigger a Firebase Cloud Function (v2) to perform the following enrichment steps:

1. **Structural Validation**: Use your Zod DTO to ensure the payload matches the expected schema for its type.
2. **Semantic Synthesis**: Send the JSON payload to Gemini 2.5 Flash. Ask it to generate a human-readable Summary and a list of Keywords.
3. **Vectorization**: Call the text-embedding-004 model to generate the embedding vector based on the synthesized summary + key data points.
4. **Materialization**: Convert the enriched JSON into a `.json` file and upload it to the Gemini File Search Store. This makes the "Data" searchable via RAG alongside your "Files."

### LangGraph Graph Topology

```
START
  │
  ▼
classifyAndRoute ──────────────────────────────────────────────────────┐
  │                                                                     │
  │ (kind: file)                                          (kind: custom)│
  ▼                                                                     ▼
fetchFileFromStorage                                      prepareCustomText
  │                                                                     │
  ▼                                                                     │
extractMetadata (Gemini Flash — MIME, pages, dims)                     │
  │                                                                     │
  ├────────────────────────────────────────────────────────────────────┘
  ▼
extractTextAndSummary (Gemini Flash — multimodal, structured JSON output)
  │
  ▼
extractKeywords (Gemini Flash — JSON array of keyword strings)
  │
  ▼
generateEmbedding (text-embedding-004 — 768-dim float array)
  │
  ▼
indexInGeminiFileSearch (Gemini File Search importFiles)
  │
  ▼
writeEnrichmentToFirestore (update document: keywords, summary, embedding, aiStatus: 'done')
  │
  ▼
END
```

**Error handling**: If any node fails, the node catches and routes to `handleError` which sets `aiStatus: 'error'` + `aiError` message in Firestore. Graph does not re-throw (Functions should not crash on enrichment failure — the file/document is still persisted).

### Alternatives Considered

- Next.js API Route for enrichment: Rejected — Next.js has a 60s execution limit (Vercel); multimodal extraction of large PDFs can exceed this
- Firebase Functions v1: Rejected — v2 offers better resource configuration, concurrency, and Node.js 22
- Direct sequential calls (no LangGraph): Rejected — LangGraph provides conditional routing, per-node error isolation, and future extensibility (human-in-the-loop, retries, streaming)

---

## Decision 6 — Storage Path Convention

### Decision

```
Cloud Storage path: orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename}
```

Including `docId` in the path:

1. Makes the Storage trigger's `onObjectFinalized` event carry enough context to locate the Firestore document
2. Avoids filename collisions across upsert cycles (new `docId` per upsert of same name)
3. Scopes delete operations precisely (delete `orgs/{orgId}/stores/{storeId}/documents/{docId}/` prefix)

### Firestore path: `organizations/{orgId}/stores/{storeId}/documents/{docId}`

---

## Decision 8 — Data Fetching Architecture (SSR + Cache + GET API + TanStack Query)

### Context

Next.js 16 and React 19 explicitly recommend Server Actions for **mutations only** (create, update, delete). Using Server Actions for queries (list fetching) bypasses Next.js's caching layer, prevents ISR, and violates the spirit of the Server Action model. The store module needs paginated, filterable, sortable list views with instant search (debounced), and real-time enrichment status updates.

### Decision

**Four-tier data fetching strategy**:

| Layer                       | Trigger                     | Mechanism                                                         | Caching                               |
| --------------------------- | --------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **SSR initial render**      | Page load / navigation      | Server component calls `'use cache'` query functions + `cacheTag` | Yes — per org, per filter combination |
| **Client filter/sort/page** | URL param change            | TanStack Query → GET route handler → same cached query fn         | Yes — HTTP + TanStack                 |
| **Mutation side-effects**   | Create / update / delete    | Server Action calls `revalidateTag(tag, 'max')`                   | Invalidates affected tags             |
| **Enrichment polling**      | Document pending/processing | TanStack Query `refetchInterval`                                  | No — polling bypasses cache           |

**Core rules**:

1. `'use cache'` directive on every query function (requires `cacheComponents: true` in `next.config.ts`)
2. `cacheTag()` called inside each cached function with org-scoped tag strings
3. GET route handlers at `/api/stores` and `/api/stores/[storeId]/documents` — auth-gated via session cookie
4. TanStack Query's `queryFn` calls the GET route (not a Server Action)
5. `listStoresAction` removed from `store-actions.ts` — queries never live in `"use server"` files
6. `revalidateTag(tag, 'max')` called in every mutation Server Action (stale-while-revalidate semantics)

### Cache Tag Convention

```ts
// lib/cache-tags.ts
storeCacheTag(orgId)           → `stores-${orgId}`
storeDetailCacheTag(orgId, id) → `store-${orgId}-${id}`
docsCacheTag(orgId, storeId)   → `docs-${orgId}-${storeId}`
```

### Pagination Strategy

**Cursor-based pagination** (aligned with Firestore's `startAfter` model):

- URL param: `?cursor=<base64url(JSON({id, sortValue}))>`
- Repository: `findByOrgPaginated({ cursor? })` calls `startAfter(sortValue, id)` on the Firestore query
- API response includes `nextCursor: string | null` (null = last page)
- UI shows Prev / Next buttons; "Prev" requires storing a cursor stack client-side (array in TanStack Query's `queryKey`)
- `page=1` (no cursor) is the default; no `OFFSET` queries against Firestore

### Rationale

- `'use cache'` is Next.js 16's recommended replacement for `unstable_cache`; enables component- and function-level caching with tag-based invalidation
- Separating GET route handlers from Server Actions gives TanStack Query a stable URL-based endpoint to call; avoids the double-invocation problem of using Server Actions as query functions
- Cursor pagination avoids Firestore's `OFFSET` limitation (Firestore does not support native offset skipping efficiently)
- Enrichment status changes are write-side events (Cloud Function updates Firestore); polling via `refetchInterval` is the correct pattern since SSR snapshots are stale by definition for live data

### Alternatives Considered

- **Server Actions for queries** (`listStoresAction` called from `useQuery`): Rejected — Next.js 16 explicitly discourages this; loses caching, ISR, and streaming benefits
- **`unstable_cache`**: Deprecated in Next.js 16 in favour of `'use cache'`; rejected
- **Firestore real-time listener (`onSnapshot`)**: Ideal for enrichment status but requires Firebase Client SDK and listener cleanup; `refetchInterval` is simpler and sufficient for async background enrichment (5-30s latency acceptable)
- **Offset pagination**: Rejected — Firestore does not support OFFSET; emulating it by fetching and discarding items is wasteful

---

## Decision 7 — `confirm-upload` Server Action Pattern

### Context

With client-direct upload via signed upload URL, the Next.js server never sees the file bytes. A Firestore document must be created **before** the client uploads (so Firebase Functions can find it via the trigger), but must be marked `aiStatus: 'pending'` until the Function enriches it.

### Decision

Two-step pattern:

1. **`getSignedUploadUrlAction`**: Creates the `documents/{docId}` record in Firestore with `aiStatus: 'pending'`, returns signed upload URL + `docId` to client
2. Client uploads directly to Cloud Storage using the signed URL
3. `onObjectFinalized` trigger fires → LangGraph workflow runs → enriches the Firestore document

The client does **not** need to call a "confirm upload" action — the Storage trigger serves as the confirmation.

### Alternatives Considered

- Create Firestore record in the Function trigger only: Rejected — race condition if UI polls before Function fires; also duplicates document-creation logic in Functions
- Create Firestore record after client upload signals back: Rejected — adds an extra round-trip; signed URL pattern makes the Storage trigger the canonical upload completion signal
