# Contract: GET /api/stores/[storeId]/documents

**Route**: `GET /api/stores/{storeId}/documents`  
**Auth**: Session cookie (`session`) — verified server-side via `withAuthenticatedContext`  
**Purpose**: Paginated, filterable, sortable list of documents (files + custom JSON records) within a store. Called by TanStack Query on search/sort/cursor changes after SSR initial render.

---

## Request

### Path Parameters

| Param     | Type     | Required |
| --------- | -------- | -------- |
| `storeId` | `string` | Yes      |

### Query Parameters

| Param      | Type                    | Required | Default            | Validation                                                                                    |
| ---------- | ----------------------- | -------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `q`        | `string`                | No       | `""`               | ≤100 chars; prefix filter on `name`                                                           |
| `sort`     | `DocumentSortKey`       | No       | `"createdAt_desc"` | One of `createdAt_desc`, `createdAt_asc`, `name_asc`, `name_desc`, `updatedAt_desc`           |
| `kind`     | `DocumentKind \| ""`    | No       | `""`               | Empty = all kinds; else one of `file`, `data`                                                 |
| `fileType` | `FileContextType \| ""` | No       | `""`               | Empty = all types; else one of `image`, `pdf`, `doc`, `csv`. Only meaningful when `kind=file` |
| `cursor`   | `string`                | No       | —                  | `base64url(JSON({id, sortValue}))`                                                            |
| `limit`    | `number`                | No       | `25`               | Integer 1–100                                                                                 |

### Zod Schema (`DocumentListQuerySchema`)

```ts
// src/data/stores/dto/store-query-dto.ts
import { z } from "zod";

export const DocumentSortKeySchema = z.enum([
  "createdAt_desc",
  "createdAt_asc",
  "name_asc",
  "name_desc",
  "updatedAt_desc",
]);

export const DocumentKindSchema = z.enum(["file", "data"]).optional();

export const FileTypeFilterSchema = z
  .enum(["image", "pdf", "doc", "csv"])
  .optional();

export const DocumentListQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sort: DocumentSortKeySchema.optional().default("createdAt_desc"),
  kind: DocumentKindSchema,
  fileType: FileTypeFilterSchema,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});
```

---

## Response

### 200 OK

```jsonc
{
  "documents": [
    {
      "id": "doc123",
      "orgId": "org456",
      "storeId": "store789",
      "name": "Q1 Report.pdf",
      "kind": "file",
      "createdBy": "uid001",
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-06T10:05:00.000Z",
      "embedding": null,
      "context": {
        "type": "pdf",
        "fileName": "Q1 Report.pdf",
        "fileSizeBytes": 204800,
        "mimeType": "application/pdf",
        "storagePath": "orgs/org456/stores/store789/documents/doc123/Q1 Report.pdf",
        "status": "completed",
        "summary": "Q1 financial report for Acme Corp.",
        "keywords": ["finance", "q1", "acme"],
        "extractedText": null,
      },
    },
    // … up to `limit` items
  ],
  "nextCursor": "eyJpZCI6ImRvYzEyMyIsInNvcnRWYWx1ZSI6MTc0NDA2MDAwMDAwMH0",
}
```

> **Note**: `embedding` is always `null` in API responses (internal field, not needed by clients).

### 401 Unauthorized

```json
{ "error": "UNAUTHENTICATED", "message": "No valid session" }
```

### 403 Forbidden

```json
{
  "error": "FORBIDDEN",
  "message": "Store does not belong to your organisation"
}
```

### 404 Not Found

```json
{ "error": "NOT_FOUND", "message": "Store not found" }
```

### 400 Bad Request

```json
{ "error": "VALIDATION_ERROR", "message": "sort: Invalid enum value" }
```

---

## Enrichment Status Polling

Document rows with `context.status === 'pending'` or `context.status === 'processing'` are polled individually by TanStack Query:

```ts
// Per-document status query
useQuery({
  queryKey: ["document-status", orgId, storeId, docId],
  queryFn: () =>
    fetch(`/api/stores/${storeId}/documents/${docId}`).then((r) => r.json()),
  refetchInterval: (query) => {
    const s = query.state.data?.context?.status;
    return s === "completed" || s === "failed" ? false : 4000;
  },
});
```

This avoids re-fetching the entire list during enrichment. Only the affected document row is polled.

---

## Caching

Underlying `listDocumentsQuery` is tagged with `cacheTag(docsCacheTag(orgId, storeId))`. Invalidated by `revalidateTag(docsCacheTag(orgId, storeId), 'max')` after document create/update/delete.

Enrichment-status polling queries bypass caching (`no-store` fetch option in the polling `queryFn`).

---

## Companion Route: GET /api/stores/[storeId]/documents/[docId]

Used by enrichment-status polling only. Returns a single `StoreDocument`. Same auth and org-isolation rules apply.

```jsonc
// 200 OK
{
  "document": {
    /* single StoreDocument */
  },
}
```
