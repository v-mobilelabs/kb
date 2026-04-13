"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { memoriesCacheTag } from "@/lib/cache-tags";
import { ListMemoriesUseCase } from "@/data/memories/use-cases/list-memories-use-case";
import type { PaginatedResult } from "@/data/memories/repositories/memory-repository";
import type { MemorySortKey } from "@/data/memories/schemas";
import type { Memory } from "@/data/memories/types";
import type { AppError, Result } from "@/lib/result";

interface ListMemoriesOptions {
  q?: string;
  sort: MemorySortKey;
  cursor?: string;
  limit: number;
}

/**
 * Fetch paginated memories for an organization with caching
 * @param orgId - Organization ID
 * @param options - Query options: q (search), sort, cursor, limit
 * @returns Paginated result with items and nextCursor
 */
export async function listMemoriesQuery(
  orgId: string,
  options: ListMemoriesOptions,
): Promise<Result<PaginatedResult<Memory>, AppError>> {
  // Tag this cache entry per organization
  cacheTag(memoriesCacheTag(orgId));

  // Cache for 1 minute; mutations call revalidateTag(tag, 'max') to refresh immediately
  cacheLife("minutes");

  const uc = new ListMemoriesUseCase(orgId);
  return uc.execute(options);
}
