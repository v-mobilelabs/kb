"use client";

import { useMutation } from "@tanstack/react-query";
import type { Memory } from "@/data/memories/types";
import type {
  CreateMemoryInput,
  UpdateMemoryInput,
} from "@/data/memories/schemas";

export function useCreateMemoryMutation(_orgId: string) {
  return useMutation({
    mutationFn: async (input: CreateMemoryInput) => {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create memory");
      }
      return (await res.json()) as Memory;
    },
  });
}

export function useUpdateMemoryMutation(_orgId: string) {
  return useMutation({
    mutationFn: async (input: UpdateMemoryInput) => {
      const { memoryId, ...body } = input;
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update memory");
      }
      return (await res.json()) as Memory;
    },
  });
}

export function useDeleteMemoryMutation(_orgId: string) {
  return useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete memory");
      }
      return (await res.json()) as { success: boolean; deletedCount: number };
    },
  });
}
