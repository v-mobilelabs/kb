"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { contextDetailCacheTag } from "@/lib/cache-tags";
import { GetContextUseCase } from "@/data/contexts/use-cases/get-context-use-case";
import type { Context } from "@/data/contexts/models/context.model";
import type { AppError, Result } from "@/lib/result";

export async function getContextQuery(
  orgId: string,
  contextId: string,
): Promise<Result<Context, AppError>> {
  cacheTag(contextDetailCacheTag(orgId, contextId));
  cacheLife("minutes");

  const uc = new GetContextUseCase(orgId);
  return uc.execute({ contextId });
}
