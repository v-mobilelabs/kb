"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { contextsCacheTag } from "@/lib/cache-tags";
import { ListContextsUseCase } from "@/data/contexts/use-cases/list-contexts-use-case";
import type { PaginatedContextResult } from "@/data/contexts/repositories/context-repository";
import type { ContextSortKey } from "@/data/contexts/dto/context-dto";
import type { AppError, Result } from "@/lib/result";

export async function listContextsQuery(
  orgId: string,
  options: { sort?: ContextSortKey; cursor?: string; limit?: number },
): Promise<Result<PaginatedContextResult, AppError>> {
  cacheTag(contextsCacheTag(orgId));
  cacheLife("minutes");

  const uc = new ListContextsUseCase(orgId);
  return uc.execute({
    sort: options.sort ?? "updatedAt_desc",
    cursor: options.cursor,
    limit: options.limit ?? 25,
  });
}
