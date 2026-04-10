# Quickstart: Store Module

**Feature**: `002-store-module`
**Date**: 2026-04-06

---

## Prerequisites

- Node.js 22+
- Firebase CLI (`npm i -g firebase-tools`) and logged in (`firebase login`)
- A Firebase project configured in `.env.local` (see `specs/001-auth-onboarding-platform/quickstart.md` for base env setup)
- Vertex AI API enabled in the GCP project

---

## New Environment Variables

Add to `.env.local` (Next.js server) and `functions/.env` (Cloud Functions):

```env
# Firebase Storage bucket (same project as Firestore)
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Vertex AI
VERTEX_AI_LOCATION=us-central1
```

---

## Initialise Firebase Functions

Functions are a **new package** in this project. Run once:

```bash
# From repo root
firebase init functions
# Choose: TypeScript, ESLint, install deps — yes
# This creates functions/ directory
```

Install LangGraph and Vertex AI in the functions package:

```bash
cd functions
npm install @langchain/langgraph @google-cloud/vertexai @google-cloud/storage firebase-admin firebase-functions
npm install --save-dev typescript @types/node
```

---

## Deploy Firestore Indexes

New vector and composite indexes are required. Deploy them:

```bash
firebase deploy --only firestore:indexes
```

> The vector index build can take 5–10 minutes. New documents written before the index is ready will still persist; `findNearest()` queries will be available once the index is active.

---

## Run Locally (Full Stack)

Terminal 1 — Next.js dev server:

```bash
npm run dev
```

Terminal 2 — Firebase emulators (Firestore + Storage + Functions):

```bash
firebase emulators:start --only firestore,storage,functions
```

> Set `FUNCTIONS_EMULATOR=true` in `functions/.env` to skip Vertex AI calls during local development. The Function will still set `aiStatus: 'done'` with empty `keywords`, `summary`, and a zero embedding so the UI doesn't hang on `pending`.

---

## Key Flows

### 1. Create a Store

```
User → Stores page → "New Store" button
→ createStoreAction({ name, description })
→ StoreRepository.create(...)
→ Redirect to /stores/{storeId}
```

### 2. Upload a File

```
User → Store detail page → "Upload" button → selects file
→ getSignedUploadUrlAction({ storeId, filename, mimeType, sizeBytes })
  → Creates documents/{docId} with aiStatus: 'pending'
  → Returns { docId, uploadUrl }
→ Client PUT file bytes directly to uploadUrl (Cloud Storage, no Next.js proxy)
→ onObjectFinalized trigger fires
→ fileEnrichmentGraph runs:
   Gemini Flash extracts text + summary + keywords
   text-embedding-004 generates 768-dim embedding
   File converted to .json and uploaded to Gemini File Search Store
   Firestore documents/{docId} updated: aiStatus: 'done'
→ UI polling detects aiStatus change → shows keyword chips
```

### 3. Create a Custom JSON Document

```
User → Store detail → "New Record" → fills in name + JSON body
→ createCustomDocumentAction({ storeId, name, jsonBody })
  → Validates JSON.parse(jsonBody) does not throw
  → Writes documents/{docId} kind='custom', aiStatus='pending'
→ onDocumentCreated trigger fires
→ customDocumentEnrichmentGraph runs:
   Gemini Flash extracts keywords + summary from JSON
   text-embedding-004 generates embedding
   Firestore updated: aiStatus: 'done'
```

### 4. Download a File

```
User → clicks file in list
→ GET /api/stores/{storeId}/documents/{docId}/download
→ withContext verifies session + org membership
→ GetSignedDownloadUrlUseCase generates 15-min signed URL
→ 302 redirect to signed URL
→ Browser downloads directly from Cloud Storage
```

### 5. Delete a Store (with cascade)

```
User → "Delete" → ReusableConfirmModal (danger intent) → confirm
→ deleteStoreAction({ storeId })
  → Batch-delete all documents (Firestore + Storage objects)
  → Delete Gemini File Search corpus kb-{orgId}-{storeId} (fire-and-forget)
  → Delete Store document
→ UI redirects to /stores
```

---

## Semantic Search (Future — not P1)

Once documents have `aiStatus: 'done'` and `embedding` populated:

```ts
// In StoreDocumentRepository
const results = await this.collection().findNearest(
  "embedding",
  queryEmbedding,
  {
    limit: 10,
    distanceMeasure: "DOT_PRODUCT",
  },
);
```

For grounded Gemini answers over store files, use Gemini File Search:

```ts
const contexts = await geminiClient.retrieveContexts({
  file_search_store: { file_search_corpora: [`kb-${orgId}-${storeId}`] },
  query: { text: userQuery },
});
```

---

## Testing the Enrichment Workflow

With emulators running:

1. Upload any file via the UI (or directly via Firebase Storage emulator UI at `http://localhost:4000`)
2. Check Functions emulator logs: `firebase emulators:start` output will show the graph nodes
3. In Firestore emulator UI (`http://localhost:4000/firestore`), verify `documents/{docId}` shows `aiStatus: 'done'` and populated `keywords`

With `FUNCTIONS_EMULATOR=true`, node `indexInVertexRag` is a no-op and `generateEmbedding` returns a zero vector — this allows end-to-end testing without Vertex AI credentials.

---

## Data Fetching Architecture (Added 2026-04-07)

### Enable Cache Components

In `next.config.ts`, add:

```ts
const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true, // ← required for 'use cache' directive
};
```

### Query Function Pattern

```ts
// src/data/stores/queries/list-stores-query.ts
import { cacheTag, cacheLife } from "next/cache";
import { StoreRepository } from "../repositories/store-repository";
import { storeCacheTag } from "@/lib/cache-tags";
import type {
  FindByOrgPaginatedOptions,
  PaginatedResult,
} from "../repositories/store-repository";
import type { Store } from "../models/store.model";
import type { Result, AppError } from "@/lib/result";

export async function listStoresQuery(
  orgId: string,
  options: FindByOrgPaginatedOptions,
): Promise<Result<PaginatedResult<Store>, AppError>> {
  "use cache";
  cacheTag(storeCacheTag(orgId));
  cacheLife("minutes");

  const repo = new StoreRepository(orgId);
  return repo.findByOrgPaginated(options);
}
```

### SSR Page Pattern

```ts
// src/app/(platform)/stores/page.tsx
import { listStoresQuery } from '@/data/stores/queries/list-stores-query'

export default async function StoresPage({ searchParams }) {
  const { q, sort, cursor } = await searchParams
  const ctx = await getAuthContext()   // reads session cookie, throws → redirect
  const result = await listStoresQuery(ctx.orgId, { q, sort, cursor })
  const { items, nextCursor } = result.ok ? result.value : { items: [], nextCursor: null }

  return <StoreListClient initialStores={items} initialNextCursor={nextCursor} orgId={ctx.orgId} />
}
```

### GET Route Handler Pattern

```ts
// src/app/api/stores/route.ts
import { NextResponse } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { StoreListQuerySchema } from "@/data/stores/dto/store-query-dto";
import { listStoresQuery } from "@/data/stores/queries/list-stores-query";

export async function GET(request: Request) {
  return withAuthenticatedContext(async (ctx) => {
    const { searchParams } = new URL(request.url);
    const parsed = StoreListQuerySchema.safeParse(
      Object.fromEntries(searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }
    const result = await listStoresQuery(ctx.orgId, parsed.data);
    if (!result.ok)
      return NextResponse.json(
        { error: result.error.kind, message: result.error.message },
        { status: 500 },
      );
    return NextResponse.json({
      stores: result.value.items,
      nextCursor: result.value.nextCursor,
    });
  });
}
```

### TanStack Query Client Pattern

```ts
// src/components/stores/store-list-client.tsx
const { data, isFetching } = useQuery({
  queryKey: ["stores", orgId, sort, debouncedQ, cursor],
  queryFn: async () => {
    const params = new URLSearchParams({
      sort,
      q: debouncedQ,
      ...(cursor ? { cursor } : {}),
    });
    const res = await fetch(`/api/stores?${params}`);
    if (!res.ok) throw new Error("Failed to load stores");
    return res.json() as Promise<{
      stores: Store[];
      nextCursor: string | null;
    }>;
  },
  // only when debouncedQ === '' && sort === 'createdAt_desc' && !cursor
  initialData: { stores: initialStores, nextCursor: initialNextCursor },
});
```

### Mutation + Cache Invalidation Pattern

```ts
// src/actions/store-actions.ts
"use server";
import { revalidateTag } from "next/cache";
import { storeCacheTag, storeDetailCacheTag } from "@/lib/cache-tags";

export async function createStoreAction(rawInput: unknown) {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new CreateStoreUseCase(ctx);
    const result = await uc.execute(rawInput);
    if (result.ok) revalidateTag(storeCacheTag(ctx.orgId), "max");
    return result;
  });
}
```

### Enrichment Polling Pattern

```ts
// Per document-row component
useQuery({
  queryKey: ["doc-status", orgId, storeId, doc.id],
  queryFn: async () => {
    const res = await fetch(`/api/stores/${storeId}/documents/${doc.id}`, {
      cache: "no-store",
    });
    return res.json() as Promise<{ document: StoreDocument }>;
  },
  initialData: { document: doc },
  refetchInterval: (query) => {
    const status = query.state.data?.document?.context?.status;
    return status === "completed" || status === "failed" ? false : 4000;
  },
});
```
