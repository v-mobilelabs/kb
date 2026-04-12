"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MemoryDocument } from "@/data/memories/types";
import type { MemoryDocumentSortKey } from "@/data/memories/schemas";
import type { PaginatedResult } from "@/data/memories/repositories/memory-repository";

interface UseMemoryDocumentsQueryOptions {
  orgId: string;
  memoryId: string;
  sort: MemoryDocumentSortKey;
  search: string;
  includeCondensed?: boolean;
  limit?: number;
}

export function useMemoryDocumentsQuery({
  orgId,
  memoryId,
  sort,
  search,
  includeCondensed = true,
  limit = 25,
}: UseMemoryDocumentsQueryOptions) {
  return useInfiniteQuery({
    queryKey: queryKeys.memoryDocumentsList(orgId, memoryId, {
      sort,
      search,
      includeCondensed,
      limit,
    }),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        q: search || "",
        sort,
        includeCondensed: String(includeCondensed),
        limit: String(limit),
      });
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(
        `/api/memories/${memoryId}/documents?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch memory documents");
      return (await res.json()) as PaginatedResult<MemoryDocument>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!memoryId,
  });
}
