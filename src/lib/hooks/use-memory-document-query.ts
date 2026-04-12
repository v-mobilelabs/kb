"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MemoryDocument } from "@/data/memories/types";

export function useMemoryDocumentQuery(memoryId: string, documentId: string) {
  return useQuery({
    queryKey: queryKeys.memoryDocumentDetail(memoryId, documentId),
    queryFn: async () => {
      const res = await fetch(
        `/api/memories/${memoryId}/documents/${documentId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch memory document");
      return (await res.json()) as MemoryDocument;
    },
    enabled: !!memoryId && !!documentId,
  });
}
