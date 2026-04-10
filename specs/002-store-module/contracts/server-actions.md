# Contracts: Server Actions

**Feature**: `002-store-module`
**Date**: 2026-04-06
**Pattern**: All Server Actions wrapped in `withContext(...)`. Return `Result<TOutput, AppError>`. Client callers use TanStack Query `useMutation` or React `useActionState`.

---

## `src/actions/store-actions.ts`

### `createStoreAction`

Creates a new store scoped to the authenticated user's organisation.

**Input**

```ts
{
  name: string;        // 1–100 chars, trimmed
  description?: string; // max 500 chars; omit or empty string → null
}
```

**Output**

```ts
Result<{ store: Store }, AppError>;
```

**Side effects**: Writes `organizations/{orgId}/stores/{storeId}` with `documentCount: 0`, `fileCount: 0`, `customCount: 0`, `createdBy: uid`.

**Error cases**:

- `VALIDATION_ERROR` — name empty, too long, or description too long
- `CONFLICT` — a store with the same (trimmed, case-insensitive) name already exists in this org
- `INTERNAL_ERROR` — Firestore write failure

---

### `updateStoreAction`

Updates a store's name and/or description.

**Input**

```ts
{
  storeId: string;
  name?: string;        // 1–100 chars, trimmed; omit to leave unchanged
  description?: string; // max 500 chars; pass null to clear
}
```

**Output**

```ts
Result<{ store: Store }, AppError>;
```

**Error cases**:

- `VALIDATION_ERROR` — same field constraints as create
- `NOT_FOUND` — store does not exist in this org
- `CONFLICT` — new name collides with another store in the org
- `FORBIDDEN` — store belongs to a different org

---

### `deleteStoreAction`

Deletes a store and cascade-deletes all its documents.

**Input**

```ts
{
  storeId: string;
}
```

**Output**

```ts
Result<{ deleted: true }, AppError>;
```

**Side effects**:

1. Batch-delete all `documents/{*}` subcollection documents (≤500 per Firestore batch; uses recursive batched delete helper)
2. Delete corresponding Cloud Storage objects under `orgs/{orgId}/stores/{storeId}/documents/`
3. Request deletion of Gemini File Search corpus `kb-{orgId}-{storeId}` (fire-and-forget; non-fatal if corpus does not exist)
4. Delete the store document itself

**Error cases**:

- `NOT_FOUND` — store not found or does not belong to this org
- `INTERNAL_ERROR` — Firestore or Storage deletion failure

---

### `getSignedUploadUrlAction`

Generates a short-lived signed upload URL for a file. Also creates the `documents/{docId}` record in Firestore with `aiStatus: 'pending'` so the Storage trigger can locate it.

**Input**

```ts
{
  storeId: string;
  filename: string; // original filename; 1–500 chars
  mimeType: string; // client-reported MIME type (used for kind inference)
  sizeBytes: number; // must be ≤ 52_428_800 (50 MB); validated server-side
}
```

**Output**

```ts
Result<
  {
    docId: string; // The Firestore document ID just created
    uploadUrl: string; // Signed Cloud Storage upload URL (15-min expiry)
    storagePath: string; // Cloud Storage path for the client to PUT to
  },
  AppError
>;
```

**Side effects**:

- Checks if a document with this filename already exists in the store → if so, deletes the old Firestore record + Cloud Storage object before creating a fresh one (upsert semantics)
- Writes `documents/{docId}` with `kind`, `storagePath`, `mimeType`, `sizeBytes`, `aiStatus: 'pending'`
- Generates signed upload URL via `adminStorage.bucket().file(path).generateSignedUrl({ action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: mimeType })`

**Error cases**:

- `VALIDATION_ERROR` — filename empty, sizeBytes exceeds 50 MB
- `NOT_FOUND` — storeId not found in org
- `INTERNAL_ERROR` — Firestore or Storage signing failure

---

### `getSignedDownloadUrlAction`

Generates a short-lived signed download URL for a stored file.

**Input**

```ts
{
  storeId: string;
  docId: string;
}
```

**Output**

```ts
Result<{ downloadUrl: string }, AppError>;
```

**Side effects**: none (read-only)

**Error cases**:

- `NOT_FOUND` — docId not found or does not belong to this org/store
- `FORBIDDEN` — kind is 'custom' (no storage object)
- `INTERNAL_ERROR` — Storage signing failure

---

## `src/actions/document-actions.ts`

### `createCustomDocumentAction`

Creates a custom JSON data document within a store.

**Input**

```ts
{
  storeId: string;
  name: string; // 1–100 chars; record label (not required to be unique)
  jsonBody: string; // Must be parseable by JSON.parse(); validated with z.string().refine(isValidJson)
}
```

**Output**

```ts
Result<{ document: StoreDocument }, AppError>;
```

**Side effects**:

- Writes `documents/{docId}` with `kind: 'custom'`, `aiStatus: 'pending'`, `embedding: null`, `keywords: []`
- Increments `Store.documentCount` and `Store.customCount` in the same Firestore transaction
- The `onDocumentCreated` Firebase Function trigger picks up the new record and starts enrichment

**Error cases**:

- `VALIDATION_ERROR` — name too long, JSON body invalid syntax
- `NOT_FOUND` — storeId not found in org
- `INTERNAL_ERROR` — Firestore write failure

---

### `updateCustomDocumentAction`

Updates an existing custom JSON document's name or body.

**Input**

```ts
{
  storeId: string;
  docId: string;
  name?: string;     // 1–100 chars; omit to leave unchanged
  jsonBody?: string; // Must be valid JSON; omit to leave unchanged
}
```

**Output**

```ts
Result<{ document: StoreDocument }, AppError>;
```

**Side effects**: Resets `aiStatus: 'pending'` and clears `embedding`, `keywords`, `summary` — triggers fresh enrichment cycle via the Function's `onDocumentUpdated` trigger.

**Error cases**:

- `VALIDATION_ERROR` — name too long, JSON invalid
- `NOT_FOUND` — docId not found or is not kind 'custom'
- `FORBIDDEN` — document in different org/store

---

### `deleteDocumentAction`

Deletes a document (file or custom) from a store.

**Input**

```ts
{
  storeId: string;
  docId: string;
}
```

**Output**

```ts
Result<{ deleted: true }, AppError>;
```

**Side effects**:

1. If `kind !== 'custom'`: delete Cloud Storage object at `storagePath`
2. Remove file from Gemini File Search corpus (fire-and-forget; non-fatal)
3. Delete `documents/{docId}` from Firestore
4. Decrement `Store.documentCount` + appropriate kind counter in the same transaction

**Error cases**:

- `NOT_FOUND` — docId not found
- `FORBIDDEN` — wrong org/store
- `INTERNAL_ERROR` — Storage or Firestore failure
