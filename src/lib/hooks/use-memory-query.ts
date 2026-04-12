"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Memory } from "@/data/memories/types";

export function useMemoryQuery(memoryId: string) {
  return useQuery({
    queryKey: queryKeys.memoryDetail(memoryId),
    queryFn: async () => {
      const res = await fetch(`/api/memories/${memoryId}`);
      if (!res.ok) throw new Error("Failed to fetch memory");
      return (await res.json()) as Memory;
    },
    enabled: !!memoryId,
  });
}
