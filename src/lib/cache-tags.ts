/**
 * Cache tag builder functions for Next.js 16 'use cache' directive and revalidateTag()
 * Each function returns a unique tag string per org/store/context
 */

/**
 * Cache tag for store list queries scoped to an organization
 * @param orgId - Organization ID
 * @returns Cache tag string: `stores-${orgId}`
 */
export const storeCacheTag = (orgId: string): string => `stores-${orgId}`;

/**
 * Cache tag for individual store detail queries
 * @param orgId - Organization ID
 * @param id - Store ID
 * @returns Cache tag string: `store-${orgId}-${id}`
 */
export const storeDetailCacheTag = (orgId: string, id: string): string =>
  `store-${orgId}-${id}`;

/**
 * Cache tag for document list queries within a store
 * @param orgId - Organization ID
 * @param storeId - Store ID
 * @returns Cache tag string: `docs-${orgId}-${storeId}`
 */
export const docsCacheTag = (orgId: string, storeId: string): string =>
  `docs-${orgId}-${storeId}`;

/**
 * Cache tag for monitoring data queries within a store
 * @param orgId - Organization ID
 * @param storeId - Store ID
 * @returns Cache tag string: `monitoring-${orgId}-${storeId}`
 */
export const monitoringCacheTag = (orgId: string, storeId: string): string =>
  `monitoring-${orgId}-${storeId}`;

/**
 * Cache tag for dashboard metrics queries scoped to an organization
 * @param orgId - Organization ID
 * @returns Cache tag string: `dashboard-${orgId}`
 */
export const dashboardCacheTag = (orgId: string): string =>
  `dashboard-${orgId}`;

export const memoriesCacheTag = (orgId: string): string => `memories-${orgId}`;

export const memoryDetailCacheTag = (orgId: string, memoryId: string): string =>
  `memory-${orgId}-${memoryId}`;

export const memoryDocsCacheTag = (orgId: string, memoryId: string): string =>
  `memory-docs-${orgId}-${memoryId}`;

/**
 * Cache tag for file list queries scoped to an organization
 * @param orgId - Organization ID
 * @returns Cache tag string: `files-${orgId}`
 */
export const fileCacheTag = (orgId: string): string => `files-${orgId}`;

/**
 * Cache tag for individual file detail queries
 * @param orgId - Organization ID
 * @param fileId - File ID
 * @returns Cache tag string: `file-${orgId}-${fileId}`
 */
export const fileDetailCacheTag = (orgId: string, fileId: string): string =>
  `file-${orgId}-${fileId}`;
