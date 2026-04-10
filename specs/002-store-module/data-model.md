# Data Model: Store Module

**Feature**: `002-store-module`
**Date**: 2026-04-06
**Firestore Root**: `organizations/{orgId}/stores/{storeId}/documents/{docId}`

---

## Entities

### `Store`

Firestore path: `organizations/{orgId}/stores/{storeId}`

```typescript
interface Store {
  id: string; // Firestore document ID (auto-generated)
  orgId: string; // Parent org — enforces multi-tenant isolation
  name: string; // 1–100 chars; unique within org (enforced at write)
  description: string | null; // max 500 chars; null if not provided
  documentCount: number; // Denormalised total — incremented/decremented on document write/delete
  fileCount: number; // Denormalised subset count (kind !== 'custom')
  customCount: number; // Denormalised subset count (kind === 'custom')
  createdBy: string; // uid of creator
  createdAt: Date; // Firestore Timestamp → Date
  updatedAt: Date; // Updated on any mutation
}
```

**Validation rules (Zod)**:

- `name`: `z.string().min(1).max(100)` — trimmed before validation
- `description`: `z.string().max(500).nullable()`
- Name uniqueness enforced inside `CreateStoreUseCase` via a `where('name', '==', name)` + `where('orgId', '==', orgId)` query before write (reject with `CONFLICT` if any result)

**Firestore indexes required**:

- `(orgId, createdAt DESC)` — store list, default sort
- `(orgId, name ASC)` — store list, name sort
- `(orgId, name)` — uniqueness check query

---

### `StoreDocument`

Firestore path: `organizations/{orgId}/stores/{storeId}/documents/{docId}`

```typescript
type DocumentKind =
  | "image" // MIME: image/*
  | "pdf" // MIME: application/pdf
  | "doc" // MIME: application/msword, docx
  | "sheet" // MIME: application/vnd.ms-excel, xlsx, csv
  | "video" // MIME: video/*
  | "audio" // MIME: audio/*
  | "text" // MIME: text/plain, text/markdown
  | "custom"; // User-defined JSON data (no file)

type AiStatus = "pending" | "processing" | "done" | "error";

interface StoreDocument {
  id: string; // Firestore document ID (auto-generated)
  orgId: string; // Denormalised for security rule scoping
  storeId: string; // Parent store reference
  name: string; // Filename (file docs) or record name (custom docs)
  kind: DocumentKind; // Discriminator field

  // ── AI Enrichment (populated by Firebase Function) ─────────────────────
  aiStatus: AiStatus; // 'pending' on create; updated by Function
  keywords: string[]; // Extracted by Gemini Flash; empty until aiStatus='done'
  summary: string | null; // Short description extracted by Gemini Flash
  extractedText: string | null; // Raw text extracted from file (truncated to 10k chars)
  embedding: number[] | null; // 768-dim vector from text-embedding-004; null until done
  geminiFileUri: string | null; // Gemini File Search file URI (null until indexed)
  aiError: string | null; // Populated when aiStatus='error'

  // ── File-specific (kind !== 'custom') ──────────────────────────────────
  storagePath: string | null; // Cloud Storage path: orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename}
  mimeType: string | null; // MIME type detected at upload
  sizeBytes: number | null; // File size in bytes (max 52_428_800 = 50 MB)
  pageCount: number | null; // PDFs and docs only; null for other kinds
  dimensions: { width: number; height: number } | null; // Images only

  // ── Custom data-specific (kind === 'custom') ───────────────────────────
  jsonBody: string | null; // Raw JSON string (validated syntactically before persist)

  createdBy: string; // uid of creator
  createdAt: Date;
  updatedAt: Date;
}
```

**Kind inference from MIME type** (implemented in `inferDocumentKind(mimeType: string): DocumentKind`):

```
image/*         → 'image'
application/pdf → 'pdf'
application/msword | application/vnd.openxmlformats-officedocument.wordprocessingml.* → 'doc'
application/vnd.ms-excel | application/vnd.openxmlformats-officedocument.spreadsheetml.* | text/csv → 'sheet'
video/*         → 'video'
audio/*         → 'audio'
text/*          → 'text'
(none)          → 'custom' (custom JSON documents have no MIME)
```

**Firestore indexes required**:

- `(orgId, storeId, createdAt DESC)` — document list, default sort
- `(orgId, storeId, kind, createdAt DESC)` — filtered by kind
- `(orgId, storeId, name ASC)` — document list, name sort
- `(orgId, storeId, kind, name ASC)` — filtered by kind + name sort
- `(orgId, storeId, updatedAt DESC)` — last-updated sort (custom docs)
- Vector index on `embedding` field (768-dim, `DOT_PRODUCT` distance) — for `findNearest()` semantic search

---

## State Machine: `AiStatus`

```
create document
      │
      ▼
  [pending]  ←── Function not yet triggered
      │
      │  onObjectFinalized / onDocumentCreated fires
      ▼
  [processing]  ←── LangGraph graph started
      │
      ├── all nodes succeed
      │        ▼
      │    [done]  ←── enrichment complete; keywords, summary, embedding, geminiFileUri populated
      │
      └── any node throws
               ▼
           [error]  ←── aiError contains message; document still readable/usable
```

**UI behaviour per state**:

- `pending`: Show shimmer badge "Indexing…"
- `processing`: Show animated badge "Processing…"
- `done`: Show keyword chips; enable semantic search
- `error`: Show warning badge "Indexing failed"; document functional but not searchable via AI

---

## Gemini File Search Corpus

Not a Firestore entity — provisioned in Gemini File Search.

| Field                | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| Corpus name (API ID) | `kb-{orgId}-{storeId}` (alphanumeric + hyphens, ≤128 chars) |
| Description          | `CosmoOps KB — org {orgId} store {storeId}`                 |
| Embedding model      | `text-embedding-004`                                        |
| Created              | On first file document created in the store                 |
| Deleted              | When the store is deleted (cascade)                         |

Corpus ID is **not** stored in Firestore — it is deterministically derived from `orgId` + `storeId` at query time.

---

## Denormalisation Strategy

`Store.documentCount`, `Store.fileCount`, and `Store.customCount` are maintained by use cases:

- **Increment** in `CreateDocumentUseCase` / `ConfirmUploadUseCase` using a Firestore batch write (document write + counter increment in one batch)
- **Decrement** in `DeleteDocumentUseCase` using a Firestore batch write
- **Cascade** in `DeleteStoreUseCase`: batch-delete all `documents/{*}` + delete the Store document + issue Vertex AI corpus deletion

> **Note**: Firestore transactions (not batches) are used for increment/decrement to avoid lost updates under concurrent writes.

---

## Firestore Security Rules

New rules scoped to the store module (added to `firestore.rules`):

```
// Stores subcollection
match /organizations/{orgId}/stores/{storeId} {
  allow read, write: if isOrgMember(orgId) && isAuthenticated();
}

// Documents subcollection
match /organizations/{orgId}/stores/{storeId}/documents/{docId} {
  allow read, write: if isOrgMember(orgId) && isAuthenticated();
}
```

Where `isOrgMember(orgId)` references the caller's `request.auth.token.orgId` custom claim (set during onboarding and included in the Firebase session token).

---

## Cloud Storage Security Rules

New rules in `storage.rules`:

```
match /orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename} {
  // Direct reads forbidden — all downloads go through server-generated signed URLs
  allow read: if false;
  // Direct writes forbidden — all uploads go through server-generated signed upload URLs
  allow write: if false;
}
```

All access is via the Firebase Admin SDK (bypasses storage rules) from server-side code and signed URLs.

---

## Firestore Indexes (to add to `firestore.indexes.json`)

```json
[
  {
    "collectionGroup": "stores",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "stores",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "documents",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "storeId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "documents",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "storeId", "order": "ASCENDING" },
      { "fieldPath": "kind", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "documents",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "storeId", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "documents",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "storeId", "order": "ASCENDING" },
      { "fieldPath": "kind", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "documents",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "storeId", "order": "ASCENDING" },
      { "fieldPath": "updatedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "documents",
    "queryScope": "COLLECTION",
    "fields": [
      {
        "fieldPath": "embedding",
        "vectorConfig": { "dimension": 768, "flat": {} }
      }
    ]
  }
]
```
