/**
 * Cached query function for fetching paginated store lists
 * Uses Next.js 16 'use cache' directive for automatic invalidation
 * Tagged per organization for fine-grained cache revalidation
 */

"use cache";

import { storeCacheTag } from "@/lib/cache-tags";
import { cacheTag, cacheLife } from "next/cache";
import { ListStoresUseCase } from "@/data/stores/use-cases/list-stores-use-case";
import type { PaginatedResult } from "@/data/stores/repositories/store-repository";
import type { StoreSortKey } from "@/data/stores/dto/store-query-dto";
import type { Store } from "@/data/stores/models/store.model";
import type { AppError, Result } from "@/lib/result";

/**
 * Fetch paginated stores for an organization with caching
 * @param orgId - Organization ID
 * @param options - Query options: q (search), sort, from, to, cursor, limit
 * @returns Paginated result with items and nextCursor
 */
export async function listStoresQuery(
  orgId: string,
  options: {
    q?: string;
    sort: StoreSortKey;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit: number;
  },
): Promise<Result<PaginatedResult<Store>, AppError>> {
  // Tag this cache entry per organization
  cacheTag(storeCacheTag(orgId));

  // Cache for 1 minute; mutations call revalidateTag(tag, 'max') to refresh immediately
  cacheLife("minutes");

  const uc = new ListStoresUseCase(orgId);
  return uc.execute(options);
}
