"use server";

import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { getBucket } from "@/data/files/lib/firebase-storage";
import { fileCacheTag, fileDetailCacheTag } from "@/lib/cache-tags";
import { ok, err, appError } from "@/lib/result";
import type { Result, AppError } from "@/lib/result";

/**
 * Delete a file — removes from Cloud Storage first (FR-014), then Firestore.
 * Returns Result<void, AppError> for the caller to handle.
 */
export async function deleteFileAction(
  fileId: string,
): Promise<Result<void, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const repository = new FileRepository(ctx.orgId);
    const file = await repository.getFile(fileId);

    if (!file) {
      return err(appError("NOT_FOUND", "File not found"));
    }

    const bucket = getBucket();
    const storagePath = `organizations/${ctx.orgId}/files/${file.fileName}`;

    try {
      await bucket.file(storagePath).delete();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return err(
        appError("INTERNAL_ERROR", `Storage delete failed: ${message}`),
      );
    }

    await repository.deleteFile(fileId);

    revalidateTag(fileCacheTag(ctx.orgId), "max");
    revalidateTag(fileDetailCacheTag(ctx.orgId, fileId), "max");

    return ok(undefined);
  });
}

/**
 * Revalidate file list cache — for use by Cloud Functions on upload completion.
 */
export async function revalidateFilesCache(orgId: string): Promise<void> {
  revalidateTag(fileCacheTag(orgId), "max");
}
