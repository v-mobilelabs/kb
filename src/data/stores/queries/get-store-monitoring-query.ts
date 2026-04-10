/**
 * Cached query function for fetching store monitoring metrics.
 * Uses Next.js 16 'use cache' directive for automatic invalidation.
 * Tagged per store for fine-grained cache revalidation.
 */

"use cache";

import { monitoringCacheTag } from "@/lib/cache-tags";
import { cacheTag, cacheLife } from "next/cache";
import { GetStoreMonitoringUseCase } from "@/data/stores/use-cases/get-store-monitoring-use-case";
import type { AppContext } from "@/lib/middleware/with-context";
import type { StoreMonitoringMetrics } from "@/data/stores/dto/store-monitoring-dto";
import type { AppError, Result } from "@/lib/result";

/**
 * Fetch monitoring metrics for a store with caching.
 * @param ctx - Authenticated app context (uid, orgId, email)
 * @param storeId - Store ID
 * @returns Monitoring metrics: enrichment stats, document breakdown, activity timeline
 */
export async function getStoreMonitoringQuery(
  ctx: Required<AppContext>,
  storeId: string,
): Promise<Result<StoreMonitoringMetrics, AppError>> {
  cacheTag(monitoringCacheTag(ctx.orgId, storeId));
  cacheLife("seconds");

  const uc = new GetStoreMonitoringUseCase(ctx);
  return uc.execute({ storeId });
}
