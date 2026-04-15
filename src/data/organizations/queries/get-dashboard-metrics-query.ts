/**
 * Cached query function for fetching dashboard metrics
 * Uses Next.js 16 'use cache' directive for automatic invalidation
 */

"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { dashboardCacheTag } from "@/lib/cache-tags";
import { GetDashboardMetricsUseCase } from "@/data/organizations/use-cases/get-dashboard-metrics-use-case";
import type { AppContext } from "@/lib/middleware/with-context";
import type { AppError, Result } from "@/lib/result";

interface DashboardMetrics {
  totalActiveKeys: number;
  totalStores: number;
  totalFiles: number;
  totalContexts: number;
  totalMembers: number;
  keyActivity: { date: string; count: number }[];
  errors: { date: string; count: number }[];
}

/**
 * Fetch dashboard metrics for an organization with caching
 * @param ctx - Authenticated app context
 * @param days - Number of days to look back (defaults to 30)
 * @returns Dashboard metrics
 */
export async function getDashboardMetricsQuery(
  ctx: AppContext,
  options?: { days?: number },
): Promise<Result<DashboardMetrics, AppError>> {
  // Tag this cache entry per organization
  cacheTag(dashboardCacheTag(ctx.orgId));

  // Cache for 5 minutes; mutations can call revalidateTag to refresh
  cacheLife("minutes");

  const uc = new GetDashboardMetricsUseCase(ctx);
  return uc.execute(options ?? {});
}
