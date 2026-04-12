"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Memory } from "@/data/memories/types";
import type { MemorySortKey } from "@/data/memories/schemas";
import type { PaginatedResult } from "@/data/memories/repositories/memory-repository";

interface UseMemoriesQueryOptions {
  orgId: string;
  sort: MemorySortKey;
  search: string;
  limit?: number;
}

export function useMemoriesQuery({
  orgId,
  sort,
  search,
  limit = 25,
}: UseMemoriesQueryOptions) {
  return useInfiniteQuery({
    queryKey: queryKeys.memoriesList(orgId, { sort, search, limit }),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        q: search || "",
        sort,
        limit: String(limit),
      });
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/memories?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch memories");
      return (await res.json()) as PaginatedResult<Memory>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
