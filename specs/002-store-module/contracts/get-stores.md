# Contract: GET /api/stores

**Route**: `GET /api/stores`  
**Auth**: Session cookie (`session`) — verified server-side via `withAuthenticatedContext`  
**Purpose**: Paginated, filterable, sortable list of stores for the authenticated user's organisation. Called by TanStack Query on search/sort/cursor changes after SSR initial render.

---

## Request

### Query Parameters

| Param   | Type           | Required | Default            | Validation                                                        |
| ------- | -------------- | -------- | ------------------ | ----------------------------------------------------------------- | --- | -------- | -------- | --- | --- | ---------------------------------------------- | ------------------------------- |
| `q`     | `string`       | No       | `""`               | ≤100 chars; used as Firestore prefix filter on `name`             |
| `sort`  | `StoreSortKey` | No       | `"createdAt_desc"` | One of `createdAt_desc`, `createdAt_asc`, `name_asc`, `name_desc` |     | `from`   | `string` | No  | —   | ISO 8601 date; filter `createdAt >= from`      |
| `to`    | `string`       | No       | —                  | ISO 8601 date; filter `createdAt <= to`                           |     | `cursor` | `string` | No  | —   | `base64url(JSON({id: string, sortValue: string | number}))`; absent = first page |
| `limit` | `number`       | No       | `25`               | Integer 1–100; clamped server-side                                |

### Zod Schema (`StoreListQuerySchema`)

```ts
// src/data/stores/dto/store-query-dto.ts
import { z } from "zod";

export const StoreSortKeySchema = z.enum([
  "createdAt_desc",
  "createdAt_asc",
  "name_asc",
  "name_desc",
]);

export const StoreListQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sort: StoreSortKeySchema.optional().default("createdAt_desc"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});
```

---

## Response

### 200 OK

```jsonc
{
  "stores": [
    {
      "id": "abc123",
      "orgId": "org456",
      "name": "Acme Store",
      "description": "Main product documents",
      "documentCount": 12,
      "customCount": 3,
      "createdBy": "uid789",
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-07T08:30:00.000Z",
    },
    // … up to `limit` items
  ],
  "nextCursor": "eyJpZCI6ImFiYzEyMyIsInNvcnRWYWx1ZSI6MTc0NDA2MDAwMDAwMH0", // null = last page
}
```

### 401 Unauthorized

```json
{ "error": "UNAUTHENTICATED", "message": "No valid session" }
```

### 400 Bad Request (invalid query params)

```json
{ "error": "VALIDATION_ERROR", "message": "sort: Invalid enum value" }
```

### 500 Internal Server Error

```json
{ "error": "INTERNAL", "message": "Unexpected error" }
```

---

## Cursor Mechanics

```
Next page:  request with cursor=<nextCursor from previous response>
Last page:  nextCursor === null
First page: omit cursor param entirely
```

Cursor is opaque — clients MUST NOT construct or parse it. It encodes enough information for `startAfter(sortValue, id)` on the Firestore query.

---

## Caching

The underlying `listStoresQuery` function is tagged with `cacheTag(storeCacheTag(orgId))`. The route handler calls the same cached function as the SSR server component. Cache is invalidated by `revalidateTag(storeCacheTag(orgId), 'max')` in mutation Server Actions.

---

## Example Requests

```
# First page, default sort
GET /api/stores

# Search by prefix
GET /api/stores?q=Acme&sort=name_asc

# Second page (cursor from previous response)
GET /api/stores?sort=createdAt_desc&cursor=eyJpZCI6InN0b3JlMSIsInNvcnRWYWx1ZSI6MTc0NDA2MDAwMDAwMH0
```
