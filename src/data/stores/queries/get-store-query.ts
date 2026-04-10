/**
 * Cached query function for fetching a single store by ID
 * Uses Next.js 16 'use cache' directive for automatic invalidation
 * Tagged per store for fine-grained cache revalidation on store updates
 */

"use cache";

import { storeDetailCacheTag } from "@/lib/cache-tags";
import { cacheTag, cacheLife } from "next/cache";
import { GetStoreUseCase } from "@/data/stores/use-cases/get-store-use-case";
import type { Store } from "@/data/stores/models/store.model";
import type { AppError, Result } from "@/lib/result";

/**
 * Fetch a single store by ID with caching
 * @param orgId - Organization ID
 * @param storeId - Store ID
 * @returns The store or NOT_FOUND / FORBIDDEN error
 */
export async function getStoreQuery(
  orgId: string,
  storeId: string,
): Promise<Result<Store, AppError>> {
  // Tag this cache entry per store to allow fine-grained invalidation
  cacheTag(storeDetailCacheTag(orgId, storeId));

  // Cache for 1 minute; mutations call revalidateTag(tag, 'max') to refresh immediately
  cacheLife("minutes");

  const uc = new GetStoreUseCase(orgId);
  return uc.execute({ storeId });
}
