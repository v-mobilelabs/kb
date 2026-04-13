/**
 * Centralized TanStack Query key factory.
 * Ensures consistent cache key structure across all hooks and components.
 */

export const queryKeys = {
  // ── Stores ───────────────────────────────────────────────────────────────
  stores: () => ["stores"] as const,
  storesList: (orgId: string, filters: Record<string, unknown>) =>
    ["stores", orgId, "list", filters] as const,
  storeDetail: (storeId: string) => ["stores", storeId] as const,

  // ── Documents ─────────────────────────────────────────────────────────────
  documents: (storeId: string) => ["documents", storeId] as const,
  documentsList: (
    orgId: string,
    storeId: string,
    filters: Record<string, unknown>,
  ) => ["documents", orgId, storeId, "list", filters] as const,

  // ── Monitoring ────────────────────────────────────────────────────────────
  monitoring: (storeId: string) => ["monitoring", storeId] as const,
  monitoringStats: (orgId: string, storeId: string) =>
    ["monitoring", orgId, storeId, "stats"] as const,

  // ── Memories ──────────────────────────────────────────────────────────────
  memories: () => ["memories"] as const,
  memoriesList: (orgId: string, filters: Record<string, unknown>) =>
    ["memories", orgId, "list", filters] as const,
  memoryDetail: (memoryId: string) => ["memories", memoryId] as const,

  // ── Memory Documents ──────────────────────────────────────────────────────
  memoryDocuments: (memoryId: string) =>
    ["memories", memoryId, "documents"] as const,
  memoryDocumentsList: (
    orgId: string,
    memoryId: string,
    filters: Record<string, unknown>,
  ) => ["memories", orgId, memoryId, "documents", "list", filters] as const,
  memoryDocumentDetail: (memoryId: string, documentId: string) =>
    ["memories", memoryId, "documents", documentId] as const,

  // ── Files ─────────────────────────────────────────────────────────────────
  files: () => ["files"] as const,
  filesList: (orgId: string, filters: Record<string, unknown>) =>
    ["files", orgId, "list", filters] as const,
  fileDetail: (fileId: string) => ["files", fileId] as const,
  fileDownload: (fileId: string) => ["files", fileId, "download"] as const,
  fileThumbnail: (fileId: string) => ["files", fileId, "thumbnail"] as const,
};
