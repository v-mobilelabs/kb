"use server";

import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { CreateStoreUseCase } from "@/data/stores/use-cases/create-store-use-case";
import { UpdateStoreUseCase } from "@/data/stores/use-cases/update-store-use-case";
import { DeleteStoreUseCase } from "@/data/stores/use-cases/delete-store-use-case";
import {
  storeCacheTag,
  storeDetailCacheTag,
  dashboardCacheTag,
} from "@/lib/cache-tags";
import type { Result, AppError } from "@/lib/result";
import type { Store } from "@/data/stores/models/store.model";

export async function createStoreAction(
  rawInput: unknown,
): Promise<Result<{ store: Store }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new CreateStoreUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate store list and dashboard caches on successful creation
    if (result.ok) {
      revalidateTag(storeCacheTag(ctx.orgId), "max");
      revalidateTag(dashboardCacheTag(ctx.orgId), "max");
    }

    return result;
  });
}

export async function updateStoreAction(
  rawInput: unknown,
): Promise<Result<{ store: Store }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new UpdateStoreUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate store detail, list, and dashboard caches on successful update
    if (result.ok) {
      const storeId = result.value.store.id;
      revalidateTag(storeDetailCacheTag(ctx.orgId, storeId), "max");
      revalidateTag(storeCacheTag(ctx.orgId), "max");
      revalidateTag(dashboardCacheTag(ctx.orgId), "max");
    }

    return result;
  });
}

export async function deleteStoreAction(
  rawInput: unknown,
): Promise<Result<{ deleted: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new DeleteStoreUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate store detail, list, and dashboard caches on successful deletion
    if (result.ok) {
      // Note: We don't have the storeId here after deletion,
      // so we invalidate the entire store list for the org to be safe
      revalidateTag(storeCacheTag(ctx.orgId), "max");
      revalidateTag(dashboardCacheTag(ctx.orgId), "max");
    }

    return result;
  });
}
