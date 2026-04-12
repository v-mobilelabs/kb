"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MemoryDocument } from "@/data/memories/types";
import type {
  CreateMemoryDocumentInput,
  UpdateMemoryDocumentInput,
} from "@/data/memories/schemas";

export function useCreateMemoryDocumentMutation(memoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemoryDocumentInput) => {
      const res = await fetch(`/api/memories/${memoryId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create document");
      }
      return (await res.json()) as MemoryDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.memoryDocuments(memoryId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memoryDetail(memoryId),
      });
    },
  });
}

export function useUpdateMemoryDocumentMutation(memoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMemoryDocumentInput) => {
      const { documentId, ...body } = input;
      const res = await fetch(
        `/api/memories/${memoryId}/documents/${documentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update document");
      }
      return (await res.json()) as MemoryDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.memoryDocuments(memoryId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memoryDocumentDetail(memoryId, data.id),
      });
    },
  });
}

export function useDeleteMemoryDocumentMutation(memoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(
        `/api/memories/${memoryId}/documents/${documentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete document");
      }
      return (await res.json()) as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.memoryDocuments(memoryId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memoryDetail(memoryId),
      });
    },
  });
}
