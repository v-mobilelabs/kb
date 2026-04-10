# Data Layer Migration Plan

**Scope:** Store list · Documents · Monitoring  
**Principle:** Action/Query → UseCase → Repository → AbstractFirebaseRepository

---

## Audit Findings

### Architecture Principles

| Principle        | Rule                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **Entry point**  | All callers (actions, queries, API routes) must instantiate a `UseCase`, never a `Repository` directly     |
| **Use cases**    | Must extend `BaseUseCase`, accept a Zod-validated DTO, and delegate all Firestore access to a `Repository` |
| **Repositories** | Must extend `AbstractFirebaseRepository<T>` for all Firestore collections                                  |

---

## Violations

### V1 — `document-actions.ts`: Direct repository calls (no use case)

| Function                       | Violation                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `listDocumentsAction`          | Instantiates `StoreDocumentRepository` directly and calls `findByStore()`          |
| `listDocumentsPaginatedAction` | Instantiates `StoreDocumentRepository` directly and calls `findByStorePaginated()` |
| `retryEnrichmentAction`        | Calls `adminDb.doc(...)` directly — no repository, no use case                     |

### V2 — `queries/`: Cached query functions call repositories directly

| File                      | Violation                                                            |
| ------------------------- | -------------------------------------------------------------------- |
| `list-stores-query.ts`    | `listStoresQuery` instantiates `StoreRepository` directly            |
| `list-documents-query.ts` | `listDocumentsQuery` instantiates `StoreDocumentRepository` directly |
| `get-store-query.ts`      | `getStoreQuery` instantiates `StoreRepository` directly              |

### V3 — `GetStoreMonitoringUseCase`: Use case bypasses repository

Calls `adminDb.collection(...)` directly for all document-level queries (count-by-status, latest 100 docs) instead of delegating to `StoreDocumentRepository`.

### V4 — `AuthRepository` does not extend `AbstractFirebaseRepository`

`src/data/auth/repositories/auth-repository.ts` is a thin HTTP wrapper around the reCAPTCHA v3 API and Firebase Identity Toolkit REST API — it has no Firestore interaction.  
**Decision: Intentional exception.** Label it `AuthHttpRepository` to distinguish it from Firestore repositories and document the exception inline.

---

## Missing Use Cases

| Use Case (to create)             | Location                     | Input Schema              | Repository used                                   |
| -------------------------------- | ---------------------------- | ------------------------- | ------------------------------------------------- |
| `ListStoresUseCase`              | `src/data/stores/use-cases/` | `StoreListQuerySchema`    | `StoreRepository.findByOrgPaginated()`            |
| `ListDocumentsUseCase`           | `src/data/stores/use-cases/` | `DocumentListQuerySchema` | `StoreDocumentRepository.findByStorePaginated()`  |
| `GetStoreUseCase`                | `src/data/stores/use-cases/` | `{ storeId }`             | `StoreRepository.findById()`                      |
| `RetryDocumentEnrichmentUseCase` | `src/data/stores/use-cases/` | `{ storeId, docId }`      | `StoreDocumentRepository.findById()` + `update()` |

---

## Migration Tasks

### Task 1 — Extend `StoreDocumentRepository` with monitoring queries

Add to `src/data/stores/repositories/store-document-repository.ts`:

```typescript
// Count documents grouped by enrichment status
async countByStatus(): Promise<Result<Record<AiStatus, number>, AppError>>

// Fetch the N most-recently-updated documents for activity + breakdown
async findRecentlyUpdated(limit: number): Promise<Result<StoreDocument[], AppError>>
```

These replace the raw `adminDb.collection(...)` calls in `GetStoreMonitoringUseCase`.  
Both support all pagination/filter/sort requirements because they're isolated to a store's document subcollection via the scoped `collectionPath`.

---

### Task 2 — Create `ListStoresUseCase`

**File:** `src/data/stores/use-cases/list-stores-use-case.ts`

- Extends `BaseUseCase<StoreListQuerySchema, PaginatedResult<Store>>`
- Input validated by `StoreListQuerySchema` (q, sort, from, to, cursor, limit — all implemented in `StoreRepository.findByOrgPaginated`)
- Delegates to `StoreRepository.findByOrgPaginated()`

---

### Task 3 — Create `ListDocumentsUseCase`

**File:** `src/data/stores/use-cases/list-documents-use-case.ts`

- Extends `BaseUseCase<DocumentListQuerySchema, PaginatedResult<StoreDocument>>`
- Input validated by `DocumentListQuerySchema` (q, sort, kind, fileType, cursor, limit — all implemented in `StoreDocumentRepository.findByStorePaginated`)
- Validates that the parent store belongs to the caller's org via `StoreRepository.findById()`
- Delegates to `StoreDocumentRepository.findByStorePaginated()`

---

### Task 4 — Create `GetStoreUseCase`

**File:** `src/data/stores/use-cases/get-store-use-case.ts`

- Extends `BaseUseCase<{ storeId }, Store>`
- Validates org ownership: `store.orgId === ctx.orgId`
- Delegates to `StoreRepository.findById()`

---

### Task 5 — Create `RetryDocumentEnrichmentUseCase`

**File:** `src/data/stores/use-cases/retry-document-enrichment-use-case.ts`

- Extends `BaseUseCase<{ storeId, docId }, { retried: true }>`
- Validates doc existence and status (`failed` only) via `StoreDocumentRepository.findById()`
- Updates `status → "pending"` via `StoreDocumentRepository.update()`
- Replaces the raw `adminDb.doc()` call in `retryEnrichmentAction`

---

### Task 6 — Fix `GetStoreMonitoringUseCase`

**File:** `src/data/stores/use-cases/get-store-monitoring-use-case.ts`

Remove all direct `adminDb.collection(...)` calls.  
Replace with:

- `StoreDocumentRepository.countByStatus()` for enrichment stats
- `StoreDocumentRepository.findRecentlyUpdated(100)` for type breakdown + activity

---

### Task 7 — Update `document-actions.ts`

| Function                       | Change                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `listDocumentsAction`          | Remove. Its callers should use `listDocumentsPaginatedAction` / the query layer. Alternatively replace with `ListDocumentsUseCase`. |
| `listDocumentsPaginatedAction` | Replace direct repo call with `new ListDocumentsUseCase(ctx).execute(options)`                                                      |
| `retryEnrichmentAction`        | Replace raw `adminDb` call with `new RetryDocumentEnrichmentUseCase(ctx).execute({ storeId, docId })`                               |

---

### Task 8 — Update query functions to call use cases

> **Context:** `"use cache"` functions receive `orgId` directly (no full `AppContext`). `BaseUseCase` requires `AppContext`. The query layer is purely read-only.  
> **Solution:** Read-only use cases accept a lightweight `ReadContext` (just `{ orgId }`) instead of the full `AppContext` with uid + session. Alternatively, use cases for reads can be constructed with orgId only.

Options per function:

| Query                | Change                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| `listStoresQuery`    | Construct `ListStoresUseCase` with `orgId`-only context; call `.execute(options)` |
| `listDocumentsQuery` | Same with `ListDocumentsUseCase`                                                  |
| `getStoreQuery`      | Same with `GetStoreUseCase`                                                       |

This keeps the `"use cache"` tag + `cacheLife` wiring in the query function (infrastructure concern) while the business rule (what to fetch, org scoping) lives in the use case.

---

### Task 9 — Rename `AuthRepository` (optional / housekeeping)

Rename `auth-repository.ts` class to `AuthHttpRepository` and add a comment:

```typescript
/**
 * NOT a Firestore repository. Does not extend AbstractFirebaseRepository.
 * Wraps external HTTP APIs: Google reCAPTCHA v3, Firebase Identity Toolkit REST.
 */
export class AuthHttpRepository { ... }
```

---

## Pagination / Filter / Sort Coverage

Verify after migration that every layer exposes:

| Parameter                  | `StoreRepository` | `StoreDocumentRepository` |    use cases    |  action/query   |
| -------------------------- | :---------------: | :-----------------------: | :-------------: | :-------------: |
| `q` (name search)          |        ✅         |            ✅             | After tasks 2–3 | After tasks 7–8 |
| `sort`                     |        ✅         |            ✅             | After tasks 2–3 | After tasks 7–8 |
| `from` / `to` (date range) |        ✅         |            ✅             | After tasks 2–3 | After tasks 7–8 |
| `kind` filter              |         —         |            ✅             |  After task 3   | After tasks 7–8 |
| `fileType` filter          |         —         |            ✅             |  After task 3   | After tasks 7–8 |
| `cursor` (pagination)      |        ✅         |            ✅             | After tasks 2–3 | After tasks 7–8 |
| `limit`                    |        ✅         |            ✅             | After tasks 2–3 | After tasks 7–8 |

---

## Execution Order

```
Task 1  →  Task 6  (monitoring repo methods → fix monitoring use case)
Task 2  →  Task 8  (list-stores use case → list-stores query)
Task 3  →  Task 7b, Task 8  (list-docs use case → document-actions + query)
Task 4  →  Task 8  (get-store use case → get-store query)
Task 5  →  Task 7c  (retry use case → document-actions)
Task 9  (independent housekeeping)
```

Estimated files changed: ~12 (4 new use cases, 2 updated use cases, 1 updated repository, 3 updated queries, 1 updated action, 1 renamed class)
