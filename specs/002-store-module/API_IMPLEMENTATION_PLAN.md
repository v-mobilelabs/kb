# API Implementation Plan: Documents, Store & Monitoring

**Status**: Planning  
**Updated**: 2026-04-09  
**Scope**: SSR hydration → TanStack Query migration

---

## Overview

Implement RESTful APIs for **documents**, **store**, and **monitoring** with URL-persisted state (pagination, search, filter, sort). Phase 1 uses server-side rendering (SSR) with Next.js `'use cache'`. Phase 2 migrates to TanStack Query v5 for client-side mutations and real-time updates.

### Architecture

```
Edge ← Next.js API Routes ← Use Cases ← Repositories (Firestore)
        ↓
    Cache Layer (next/cache tags)
        ↓
    TanStack Query (Phase 2)
```

---

## Phase 1: SSR + Server-Side Caching

### 1.1 API Contracts & DTOs

#### Store API

```
GET  /api/stores
  Params: q, sort, cursor, limit
  Returns: { items: Store[], nextCursor?: string }

GET  /api/stores/[storeId]
  Returns: Store

POST /api/stores
  Body: CreateStoreInput
  Returns: Store

PUT  /api/stores/[storeId]
  Body: UpdateStoreInput
  Returns: Store

DELETE /api/stores/[storeId]
  Returns: { deleted: true }
```

#### Documents API

```
GET  /api/stores/[storeId]/documents
  Params: q, sort, kind, status, cursor, limit
  Returns: { items: StoreDocument[], nextCursor?: string }

GET  /api/stores/[storeId]/documents/[docId]
  Returns: StoreDocument

POST /api/stores/[storeId]/documents
  Body: CreateDocumentInput (file or JSON)
  Returns: StoreDocument

PUT  /api/stores/[storeId]/documents/[docId]
  Body: UpdateDocumentInput
  Returns: StoreDocument

DELETE /api/stores/[storeId]/documents/[docId]
  Returns: { deleted: true }

POST /api/stores/[storeId]/documents/[docId]/retry-enrichment
  Returns: StoreDocument
```

#### Monitoring API

```
GET  /api/stores/[storeId]/monitoring/activity
  Params: q, actionType, sort, cursor, limit, from, to
  Returns: { items: ActivityLogEntry[], nextCursor?: string }

GET  /api/stores/[storeId]/monitoring/stats
  Returns: {
    totalDocuments: number
    documentsByKind: Record<string, number>
    totalSize: number
    enrichmentStats: { pending, processing, completed, failed }
    lastEnrichmentRun: DateTime | null
  }

GET  /api/stores/[storeId]/monitoring/errors
  Params: q, sort, cursor, limit, from, to
  Returns: { items: ErrorLog[], nextCursor?: string }
```

### 1.2 Query DTOs & Validation

**File**: `src/data/stores/dto/list-query-schema.ts`

```typescript
import { z } from "zod";

// Shared pagination
export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

// Store listing
export const StoreListQuerySchema = PaginationSchema.extend({
  q: z.string().optional(),
  sort: z
    .enum(["name_asc", "name_desc", "createdAt_asc", "createdAt_desc"])
    .default("createdAt_desc"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Document listing
export const DocumentListQuerySchema = PaginationSchema.extend({
  q: z.string().optional(),
  sort: z
    .enum([
      "name_asc",
      "name_desc",
      "createdAt_asc",
      "createdAt_desc",
      "size_asc",
      "size_desc",
    ])
    .default("createdAt_desc"),
  kind: z.enum(["file", "custom"]).optional(),
  status: z.enum(["draft", "enriching", "indexed", "failed"]).optional(),
});

// Activity listing
export const ActivityListQuerySchema = PaginationSchema.extend({
  q: z.string().optional(),
  actionType: z
    .enum([
      "document.created",
      "document.deleted",
      "enrichment.started",
      "enrichment.completed",
      "enrichment.failed",
    ])
    .optional(),
  sort: z.enum(["timestamp_asc", "timestamp_desc"]).default("timestamp_desc"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Error logging
export const ErrorListQuerySchema = PaginationSchema.extend({
  q: z.string().optional(),
  sort: z.enum(["timestamp_asc", "timestamp_desc"]).default("timestamp_desc"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
```

### 1.3 Query Functions (Cached)

**File**: `src/data/stores/queries/list-documents-query.ts`

```typescript
"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { docsCacheTag } from "@/lib/cache-tags";
import { ListDocumentsUseCase } from "@/data/stores/use-cases/list-documents-use-case";
import type { DocumentListQuerySchema } from "@/data/stores/dto/list-query-schema";
import type { PaginatedResult } from "@/data/stores/repositories/store-document-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";
import type { Result, AppError } from "@/lib/result";

export async function listDocumentsQuery(
  orgId: string,
  storeId: string,
  options: z.infer<typeof DocumentListQuerySchema>,
): Promise<Result<PaginatedResult<StoreDocument>, AppError>> {
  cacheTag(docsCacheTag(orgId, storeId));
  cacheLife("minutes");

  const uc = new ListDocumentsUseCase(orgId);
  return uc.execute({ storeId, ...options });
}
```

**File**: `src/data/stores/queries/get-monitoring-stats-query.ts`

```typescript
"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { monitoringStatsTag } from "@/lib/cache-tags";
import { GetMonitoringStatsUseCase } from "@/data/stores/use-cases/get-monitoring-stats-use-case";
import type { Result, AppError } from "@/lib/result";

export interface MonitoringStats {
  totalDocuments: number;
  documentsByKind: Record<string, number>;
  totalSize: number;
  enrichmentStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  lastEnrichmentRun: Date | null;
}

export async function getMonitoringStatsQuery(
  orgId: string,
  storeId: string,
): Promise<Result<MonitoringStats, AppError>> {
  cacheTag(monitoringStatsTag(orgId, storeId));
  cacheLife("minutes");

  const uc = new GetMonitoringStatsUseCase(orgId);
  return uc.execute({ storeId });
}
```

### 1.4 API Route Handlers

**File**: `src/app/api/stores/[storeId]/documents/route.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { listDocumentsQuery } from "@/data/stores/queries/list-documents-query";
import { DocumentListQuerySchema } from "@/data/stores/dto/list-query-schema";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } },
) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const parsed = DocumentListQuerySchema.safeParse({
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || "createdAt_desc",
      kind: searchParams.get("kind") || undefined,
      status: searchParams.get("status") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit") ?? "25", 10)
        : 25,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const result = await listDocumentsQuery(
      ctx.orgId,
      params.storeId,
      parsed.data,
    );

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json(result.value, { status: 200 });
  });
}
```

**File**: `src/app/api/stores/[storeId]/monitoring/activity/route.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { listActivityQuery } from "@/data/stores/queries/list-activity-query";
import { ActivityListQuerySchema } from "@/data/stores/dto/list-query-schema";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } },
) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const parsed = ActivityListQuerySchema.safeParse({
      q: searchParams.get("q") || undefined,
      actionType: searchParams.get("actionType") || undefined,
      sort: searchParams.get("sort") || "timestamp_desc",
      cursor: searchParams.get("cursor") || undefined,
      limit: Number.parseInt(searchParams.get("limit") ?? "25", 10),
      from: searchParams.get("from")
        ? new Date(searchParams.get("from")!)
        : undefined,
      to: searchParams.get("to")
        ? new Date(searchParams.get("to")!)
        : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const result = await listActivityQuery(
      ctx.orgId,
      params.storeId,
      parsed.data,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.value, { status: 200 });
  });
}
```

### 1.5 Cache Tags Update

**File**: `src/lib/cache-tags.ts`

```typescript
export const storeCacheTag = (orgId: string) => `store:${orgId}`;
export const storeDetailCacheTag = (orgId: string, storeId: string) =>
  `store:${orgId}:${storeId}`;

export const docsCacheTag = (orgId: string, storeId: string) =>
  `docs:${orgId}:${storeId}`;
export const docDetailCacheTag = (
  orgId: string,
  storeId: string,
  docId: string,
) => `docs:${orgId}:${storeId}:${docId}`;

export const monitoringActivityTag = (orgId: string, storeId: string) =>
  `monitor:activity:${orgId}:${storeId}`;
export const monitoringStatsTag = (orgId: string, storeId: string) =>
  `monitor:stats:${orgId}:${storeId}`;
export const monitoringErrorsTag = (orgId: string, storeId: string) =>
  `monitor:errors:${orgId}:${storeId}`;
```

---

## Phase 2: TanStack Query Integration (Client-Side)

### 2.1 Query Keys Factory

**File**: `src/lib/query-keys.ts`

```typescript
export const queryKeys = {
  stores: () => ["stores"],
  storesList: (filters: Record<string, any>) => ["stores", "list", filters],
  storeDetail: (storeId: string) => ["stores", storeId],

  documents: (storeId: string) => ["stores", storeId, "documents"],
  documentsList: (storeId: string, filters: Record<string, any>) => [
    "stores",
    storeId,
    "documents",
    "list",
    filters,
  ],
  documentDetail: (storeId: string, docId: string) => [
    "stores",
    storeId,
    "documents",
    docId,
  ],

  monitoring: (storeId: string) => ["stores", storeId, "monitoring"],
  monitoringActivity: (storeId: string, filters: Record<string, any>) => [
    "stores",
    storeId,
    "monitoring",
    "activity",
    filters,
  ],
  monitoringStats: (storeId: string) => [
    "stores",
    storeId,
    "monitoring",
    "stats",
  ],
  monitoringErrors: (storeId: string, filters: Record<string, any>) => [
    "stores",
    storeId,
    "monitoring",
    "errors",
    filters,
  ],
};
```

### 2.2 Custom Hooks with URL State Persistence

**File**: `src/components/stores/hooks/use-stores-list.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";

export interface UseStoresListOptions {
  q?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
}

export function useStoresList(options: UseStoresListOptions = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract filters from URL
  const filters = {
    q: searchParams.get("q") || undefined,
    sort: searchParams.get("sort") || "createdAt_desc",
    cursor: searchParams.get("cursor") || undefined,
    limit: Number.parseInt(searchParams.get("limit") ?? "25", 10),
    ...options,
  };

  const query = useQuery({
    queryKey: queryKeys.storesList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      params.append("sort", filters.sort);
      if (filters.cursor) params.append("cursor", filters.cursor);
      params.append("limit", String(filters.limit));

      const res = await fetch(`/api/stores?${params}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`Failed to fetch stores: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Update URL when filters change
  const updateFilters = (newFilters: Partial<UseStoresListOptions>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return {
    ...query,
    filters,
    updateFilters,
  };
}
```

**File**: `src/components/stores/hooks/use-documents-list.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";

export interface UseDocumentsListOptions {
  storeId: string;
  q?: string;
  sort?: string;
  kind?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

export function useDocumentsList({
  storeId,
  ...options
}: UseDocumentsListOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = {
    q: searchParams.get("q") || undefined,
    sort: searchParams.get("sort") || "createdAt_desc",
    kind: searchParams.get("kind") || undefined,
    status: searchParams.get("status") || undefined,
    cursor: searchParams.get("cursor") || undefined,
    limit: Number.parseInt(searchParams.get("limit") ?? "25", 10),
    ...options,
  };

  const query = useQuery({
    queryKey: queryKeys.documentsList(storeId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      params.append("sort", filters.sort);
      if (filters.kind) params.append("kind", filters.kind);
      if (filters.status) params.append("status", filters.status);
      if (filters.cursor) params.append("cursor", filters.cursor);
      params.append("limit", String(filters.limit));

      const res = await fetch(`/api/stores/${storeId}/documents?${params}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`Failed to fetch documents: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60,
  });

  const updateFilters = (
    newFilters: Partial<Omit<UseDocumentsListOptions, "storeId">>,
  ) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return {
    ...query,
    filters,
    updateFilters,
  };
}
```

### 2.3 Monitoring Activity Hook

**File**: `src/components/stores/hooks/use-monitoring-activity.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";

export interface UseMonitoringActivityOptions {
  storeId: string;
  q?: string;
  actionType?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
  from?: Date;
  to?: Date;
}

export function useMonitoringActivity({
  storeId,
  ...options
}: UseMonitoringActivityOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = {
    q: searchParams.get("q") || undefined,
    actionType: searchParams.get("actionType") || undefined,
    sort: searchParams.get("sort") || "timestamp_desc",
    cursor: searchParams.get("cursor") || undefined,
    limit: Number.parseInt(searchParams.get("limit") ?? "25", 10),
    from: searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    ...options,
  };

  const query = useQuery({
    queryKey: queryKeys.monitoringActivity(storeId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      if (filters.actionType) params.append("actionType", filters.actionType);
      params.append("sort", filters.sort);
      if (filters.cursor) params.append("cursor", filters.cursor);
      params.append("limit", String(filters.limit));
      if (filters.from) params.append("from", filters.from.toISOString());
      if (filters.to) params.append("to", filters.to.toISOString());

      const res = await fetch(
        `/api/stores/${storeId}/monitoring/activity?${params}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 30, // 30 seconds for monitoring
  });

  const updateFilters = (
    newFilters: Partial<Omit<UseMonitoringActivityOptions, "storeId">>,
  ) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        (value instanceof Date && isNaN(value.getTime()))
      ) {
        params.delete(key);
      } else if (value instanceof Date) {
        params.set(key, value.toISOString());
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return {
    ...query,
    filters,
    updateFilters,
  };
}
```

### 2.4 Stats Hook

**File**: `src/components/stores/hooks/use-monitoring-stats.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useMonitoringStats(storeId: string) {
  return useQuery({
    queryKey: queryKeys.monitoringStats(storeId),
    queryFn: async () => {
      const res = await fetch(`/api/stores/${storeId}/monitoring/stats`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}
```

### 2.5 Component Integration Example

**File**: `src/components/stores/documents-page.tsx` (refactored)

```typescript
"use client";

import { useDocumentsList } from "@/components/stores/hooks/use-documents-list";
import { DocumentsTable } from "@/components/stores/documents-table";
import { SearchFilters } from "@/components/stores/search-filters";
import { Spinner } from "@heroui/react";

export function DocumentsPage({ storeId }: { storeId: string }) {
  const { data, isLoading, filters, updateFilters } = useDocumentsList({
    storeId,
  });

  return (
    <div className="space-y-4">
      <SearchFilters
        filters={filters}
        onFilterChange={updateFilters}
        sortOptions={[
          { value: "createdAt_desc", label: "Newest" },
          { value: "createdAt_asc", label: "Oldest" },
          { value: "name_asc", label: "Name (A-Z)" },
          { value: "name_desc", label: "Name (Z-A)" },
          { value: "size_desc", label: "Largest" },
          { value: "size_asc", label: "Smallest" },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          <DocumentsTable
            documents={data?.items || []}
            onSort={(sort) => updateFilters({ sort, cursor: undefined })}
            onSearch={(q) => updateFilters({ q, cursor: undefined })}
          />

          {data?.nextCursor && (
            <button
              onClick={() => updateFilters({ cursor: data.nextCursor })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Load More
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Phase 3: Optimizations & Advanced Features

### 3.1 Optimistic Updates (Mutations)

```typescript
export function useDeleteDocument(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/stores/${storeId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onMutate: async (docId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.documentsList(storeId, {}),
      });

      // Snapshot previous data
      const previous = queryClient.getQueryData(
        queryKeys.documentsList(storeId, {}),
      );

      // Optimistic update
      queryClient.setQueryData(
        queryKeys.documentsList(storeId, {}),
        (old: any) => ({
          ...old,
          items: old.items.filter((doc: any) => doc.id !== docId),
        }),
      );

      return { previous };
    },
    onError: (err, docId, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.documentsList(storeId, {}),
          context.previous,
        );
      }
    },
    onSuccess: () => {
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.monitoringStats(storeId),
      });
    },
  });
}
```

### 3.2 Real-Time Updates (Firestore Listener)

```typescript
export function useMonitoringActivityRealtime(storeId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const db = getFirestore();
    const activityRef = collection(
      db,
      "organizations",
      orgId,
      "stores",
      storeId,
      "activity",
    );
    const q = query(activityRef, orderBy("timestamp", "desc"), limit(25));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      queryClient.setQueryData(
        queryKeys.monitoringActivity(storeId, {
          limit: 25,
          sort: "timestamp_desc",
        }),
        {
          items: snapshot.docs.map((doc) => doc.data()),
          nextCursor: snapshot.docs[snapshot.docs.length - 1]?.id,
        },
      );
    });

    return unsubscribe;
  }, [storeId, orgId]);
}
```

---

## Implementation Roadmap

### Sprint 1: Foundation

- [ ] Create DTOs & validation schemas
- [ ] Implement query functions with caching
- [ ] Build API routes (GETs)
- [ ] Update cache tags

### Sprint 2: Enhancement

- [ ] Implement TanStack Query hooks
- [ ] Add URL state persistence
- [ ] Refactor UI components
- [ ] Test filtering & pagination

### Sprint 3: Monitoring

- [ ] Implement monitoring APIs (activity, stats, errors)
- [ ] Add real-time updates
- [ ] Build monitoring dashboard

### Sprint 4: Optimization

- [ ] Optimistic mutations
- [ ] Real-time listeners
- [ ] Performance tuning
- [ ] Error handling & retries

---

## Key Decisions

| Decision                      | Rationale                                                                   |
| ----------------------------- | --------------------------------------------------------------------------- |
| Cursor-based pagination       | Better performance with Firestore than offset; works with real-time changes |
| URL-persisted filters         | Shareable links; survives page reload; works without backend session        |
| `next/cache` + TanStack Query | Next.js SSR caching for SEO; TQ for client interactivity                    |
| Zod schemas for DTOs          | Runtime validation; integrates with existing codebase                       |
| Tagged cache invalidation     | Granular invalidation; prevents over-fetching on mutations                  |

---

## Testing Strategy

- [ ] Query DTOs with invalid inputs (Zod validation)
- [ ] API routes with missing auth headers
- [ ] Cursor pagination edge cases (empty results, last page)
- [ ] Cache invalidation on mutations
- [ ] URL state persistence across page reloads
- [ ] TanStack Query deduplication & garbage collection

---

## References

- [TanStack Query v5 Docs](https://tanstack.com/query/latest)
- [Next.js 16 Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Firestore Pagination](https://firebase.google.com/docs/firestore/query-data/query-cursors)
- [Zod Validation](https://zod.dev)
