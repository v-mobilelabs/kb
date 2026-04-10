# Contracts: Firebase Functions

**Feature**: `002-store-module`
**Date**: 2026-04-06
**Runtime**: Cloud Functions v2 — Node.js 22, 512 MB RAM, 540s timeout
**Orchestration**: LangGraph.js

---

## Function 1 — `enrichFileDocument`

### Trigger

Cloud Storage `onObjectFinalized` — fires whenever a file is successfully written to the bucket.

**Path pattern**: `orgs/{orgId}/stores/{storeId}/documents/{docId}/{filename}`

The function extracts `orgId`, `storeId`, and `docId` from the object path.

### Pre-conditions (bail early if violated)

1. Object path does not match the 5-segment pattern → skip (not a store document upload)
2. `documents/{docId}` Firestore record does not exist or `aiStatus !== 'pending'` → skip (already processed or orphan)

### LangGraph Graph: `fileEnrichmentGraph`

```
START
  │
  ▼
setProcessing          → updates Firestore aiStatus: 'processing'
  │
  ▼
inferKind              → reads mimeType from Storage object metadata; maps to DocumentKind
  │
  ▼
extractTextAndSummary  → Gemini Flash (multimodal) with file bytes as input part
  │                       output: { text: string; summary: string }
  ▼
extractKeywords        → Gemini Flash structured output
  │                       input: { name, summary, extractedText }
  │                       output: { keywords: string[] } (max 20 tags)
  ▼
generateEmbedding      → text-embedding-004
  │                       input: summary + extractedText (truncated to 8k chars)
  │                       output: number[] (768-dim)
  ▼
indexInGeminiFileSearch → Gemini File Search
  │                       corpus: kb-{orgId}-{storeId} (create if not exists)
  │                       import file using GCS URI
  │                       output: { ragFileId: string; fileUri: string }
  ▼
writeEnrichment        → Firestore update on documents/{docId}
  │                       fields: { aiStatus: 'done', keywords, summary, extractedText,
  │                                 embedding, geminiFileUri, updatedAt }
  ▼
END
```

**Error path** (any node throws):

```
handleError → Firestore update: { aiStatus: 'error', aiError: error.message, updatedAt }
```

### Input State (passed through graph nodes)

```ts
interface FileEnrichmentState {
  orgId: string;
  storeId: string;
  docId: string;
  filename: string;
  storagePath: string;
  gcsUri: string; // gs://bucket/orgs/...
  mimeType: string;
  sizeBytes: number;
  // populated as nodes run:
  kind: DocumentKind | null;
  extractedText: string | null;
  summary: string | null;
  keywords: string[];
  embedding: number[] | null;
  ragFileUri: string | null;
  error: string | null;
}
```

### Gemini Flash Prompt — `extractTextAndSummary`

```
System: You are a document analyser. Extract all readable text from the provided file and write a concise summary (2–4 sentences).

Response format (JSON):
{
  "text": "<all readable text, max 10000 chars>",
  "summary": "<2–4 sentence summary>"
}

If no text is extractable (e.g., binary image with no OCR text), return:
{
  "text": "",
  "summary": "Image file — no text content."
}
```

### Gemini Flash Prompt — `extractKeywords`

```
System: You are a metadata tagger. Given the document name, summary, and extracted text, return up to 20 relevant keyword tags. Tags should be lowercase, single words or short phrases. Return JSON only.

Response format:
{ "keywords": ["<tag1>", "<tag2>", ...] }
```

---

## Function 2 — `enrichCustomDocument`

### Trigger

Firestore `onDocumentCreated` and `onDocumentUpdated` on:
`organizations/{orgId}/stores/{storeId}/documents/{docId}`

**Filter**: only process if `kind === 'custom'` and `aiStatus === 'pending'`

### LangGraph Graph: `customDocumentEnrichmentGraph`

```
START
  │
  ▼
setProcessing          → Firestore aiStatus: 'processing'
  │
  ▼
prepareText            → serialize jsonBody to indented string for embedding input
  │
  ▼
extractKeywordsFromJson → Gemini Flash structured output
  │                        input: { name, jsonText }
  │                        output: { keywords: string[], summary: string }
  ▼
generateEmbedding      → text-embedding-004
  │                        input: name + '\n' + summary + '\n' + jsonText (truncated 8k)
  │                        output: number[] (768-dim)
  ▼
writeEnrichment        → Firestore update: { aiStatus: 'done', keywords, summary,
  │                                          extractedText (jsonText), embedding, updatedAt }
  ▼
END
```

> Note: Custom documents are **not** indexed in Gemini File Search (no binary file to import). Semantic search for custom docs relies solely on the Firestore Vector `findNearest()` query.

### Error path: same as `enrichFileDocument` — sets `aiStatus: 'error'`

---

## Function 3 — `onStoreDocumentDeleted`

### Trigger

Firestore `onDocumentDeleted` on `organizations/{orgId}/stores/{storeId}/documents/{docId}`

### Behaviour

1. If `data.geminiFileUri` is set → call Gemini File Search `deleteFile(geminiFileUri)` (fire-and-forget)
2. Decrements `Store.documentCount` + kind-specific counter (belt-and-suspenders; primary decrement is in `DeleteDocumentUseCase`)

> This function is a safety net for orphan cleanup, not the primary delete path.

---

## Function Directory Structure

```
functions/
├── src/
│   ├── index.ts                              # Exports all function handlers
│   ├── enrich-file-document.ts               # Function 1 handler
│   ├── enrich-custom-document.ts             # Function 2 handler
│   ├── on-store-document-deleted.ts          # Function 3 handler
│   ├── workflows/
│   │   ├── file-enrichment-graph.ts          # LangGraph graph definition (Function 1)
│   │   └── custom-document-enrichment-graph.ts # LangGraph graph (Function 2)
│   ├── nodes/
│   │   ├── set-processing-node.ts
│   │   ├── infer-kind-node.ts
│   │   ├── extract-text-summary-node.ts      # Gemini Flash multimodal
│   │   ├── extract-keywords-node.ts          # Gemini Flash structured output
│   │   ├── generate-embedding-node.ts        # text-embedding-004
│   │   ├── index-in-gemini-file-search-node.ts # Gemini File Search import
│   │   ├── write-enrichment-node.ts          # Firestore update
│   │   └── handle-error-node.ts
│   └── lib/
│       ├── vertex-ai.ts                      # VertexAI client (embeddings, Gemini models)
│       ├── admin-firestore.ts                # Firestore Admin singleton
│       ├── admin-storage.ts                  # Storage Admin singleton
│       ├── infer-document-kind.ts            # MIME → DocumentKind mapping util
│       └── corpus-name.ts                    # kb-{orgId}-{storeId} derivation util
├── package.json
└── tsconfig.json
```

---

## Environment Variables (Functions)

| Variable               | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID (auto-set in Cloud Functions runtime)   |
| `VERTEX_AI_LOCATION`   | Vertex AI region (e.g., `us-central1`)                 |
| `STORAGE_BUCKET`       | Firebase Storage bucket name                           |
| `FUNCTIONS_EMULATOR`   | `true` in local emulator; used to skip Vertex AI calls |

---

## API Routes (Next.js)

### `GET /api/stores/[storeId]/documents/[docId]/download`

Generates a signed download URL server-side and redirects. Wrapped in `withContext`.

```
GET /api/stores/{storeId}/documents/{docId}/download
  → 302 to signed download URL (15-min expiry)
  → 404 if not found
  → 403 if wrong org
  → 400 if kind === 'custom' (no file)
```

This route exists so the client can simply `<a href="/api/stores/{storeId}/documents/{docId}/download">` without exposing signed URLs in rendered HTML or storing them client-side.

---

## Gemini File Search Corpus Lifecycle

| Event                        | Action                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| First file uploaded to store | Create corpus `kb-{orgId}-{storeId}` if not exists            |
| File uploaded                | `importFiles()` with GCS URI                                  |
| File deleted                 | `deleteFile()` with `geminiFileUri`                           |
| Store deleted                | `deleteCorpus()` for `kb-{orgId}-{storeId}` (fire-and-forget) |

Corpus existence is checked before creation using `listCorpora()` filtered by display name. A store without files in Gemini File Search yet simply has no corpus — safe to check-before-create without a lock (creation is idempotent via display-name check).
