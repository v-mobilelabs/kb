"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { fileDetailCacheTag } from "@/lib/cache-tags";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { ok, err, appError } from "@/lib/result";
import type { Result, AppError } from "@/lib/result";
import type { File } from "@/data/files/models/file.model";

/**
 * Cached query to fetch a single file's metadata.
 * Tagged per file for fine-grained cache invalidation.
 */
export async function getFileQuery(
  orgId: string,
  fileId: string,
): Promise<Result<File, AppError>> {
  cacheTag(fileDetailCacheTag(orgId, fileId));
  cacheLife({ revalidate: 600 }); // 10 minutes

  const repository = new FileRepository(orgId);
  const file = await repository.getFile(fileId);

  if (!file) {
    return err(appError("NOT_FOUND", "File not found"));
  }

  return ok(file);
}
