"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { deleteFileAction } from "@/actions/file-actions";

/**
 * Mutation hook to delete a file via the server action.
 * On success, invalidates all files list queries.
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const result = await deleteFileAction(fileId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files(),
      });
    },
  });
}
