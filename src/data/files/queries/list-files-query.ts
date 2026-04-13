"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { fileCacheTag } from "@/lib/cache-tags";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { ok } from "@/lib/result";
import type { Result, AppError } from "@/lib/result";
import type { File } from "@/data/files/models/file.model";

export interface ListFilesOptions {
  search?: string;
  sort?: "name" | "createdAt" | "size";
  order?: "asc" | "desc";
  kinds?: string[];
  cursor?: string;
  limit?: number;
}

export interface ListFilesResult {
  files: File[];
  nextCursor: string | null;
  total: number;
}

/**
 * Cached query to list files for an organisation with pagination, search, sort, and filter.
 * Tagged per organisation for fine-grained cache invalidation.
 */
export async function listFilesQuery(
  orgId: string,
  options: ListFilesOptions = {},
): Promise<Result<ListFilesResult, AppError>> {
  cacheTag(fileCacheTag(orgId));
  cacheLife({ revalidate: 600 }); // 10 minutes

  const repository = new FileRepository(orgId);

  const result = await repository.listFiles({
    search: options.search,
    sort: options.sort ?? "createdAt",
    order: options.order ?? "desc",
    kinds: options.kinds,
    cursor: options.cursor,
    limit: options.limit ?? 25,
  });

  return ok({
    files: result.files,
    nextCursor: result.nextCursor,
    total: result.total,
  });
}
