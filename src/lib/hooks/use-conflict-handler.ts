"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UseConflictHandlerOptions {
  /** TanStack Query keys to invalidate on conflict refresh */
  queryKeys: readonly (readonly unknown[])[];
  onConflict?: () => void;
}

/**
 * Returns a handler to call when a server action returns a CONFLICT error (FR-019).
 * Invalidates the specified query keys so the UI refreshes to the latest state.
 */
export function useConflictHandler({
  queryKeys,
  onConflict,
}: UseConflictHandlerOptions) {
  const queryClient = useQueryClient();

  const handleConflict = useCallback(async () => {
    await Promise.all(
      queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    );
    onConflict?.();
  }, [queryClient, queryKeys, onConflict]);

  return { handleConflict };
}
