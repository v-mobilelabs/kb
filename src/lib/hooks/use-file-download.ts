"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface DownloadResult {
  url: string;
  expiresIn: number;
  fileName: string;
}

/**
 * Hook to request a signed download URL for a file on demand.
 * Set `enabled: true` only when the user triggers a download.
 */
export function useFileDownload(fileId: string) {
  const query = useQuery({
    queryKey: queryKeys.fileDownload(fileId),
    queryFn: async () => {
      const res = await fetch(`/api/files/${fileId}/download`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Failed to get download URL");
      }
      return res.json() as Promise<DownloadResult>;
    },
    enabled: false, // triggered on demand via refetch()
    staleTime: 14 * 60 * 1000, // 14 min — slightly under 15-min signed URL expiry
  });

  async function triggerDownload() {
    const result = await query.refetch();
    if (result.data) {
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    }
  }

  return { triggerDownload, isPending: query.isFetching };
}
