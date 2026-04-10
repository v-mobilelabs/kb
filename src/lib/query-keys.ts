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
};
