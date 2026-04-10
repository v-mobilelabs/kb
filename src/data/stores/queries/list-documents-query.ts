/**
 * Cached query function for fetching paginated document lists within a store
 * Uses Next.js 16 'use cache' directive for automatic invalidation
 * Tagged per store for fine-grained cache revalidation
 */

"use cache";

import { docsCacheTag } from "@/lib/cache-tags";
import { cacheTag, cacheLife } from "next/cache";
import { ListDocumentsUseCase } from "@/data/stores/use-cases/list-documents-use-case";
import type {
  PaginatedResult,
  DocumentSortKey,
} from "@/data/stores/repositories/store-document-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";
import type { AppError, Result } from "@/lib/result";
import type {
  DocumentKindFilter,
  FileTypeFilter,
} from "@/data/stores/dto/store-query-dto";

/**
 * Fetch paginated documents within a store with caching
 * @param orgId - Organization ID
 * @param storeId - Store ID
 * @param options - Query options: q (search), sort, kind filter, cursor, limit
 * @returns Paginated result with items and nextCursor
 */
export async function listDocumentsQuery(
  orgId: string,
  storeId: string,
  options: {
    q?: string;
    sort: DocumentSortKey;
    kind?: DocumentKindFilter;
    fileType?: FileTypeFilter;
    status?: string;
    cursor?: string;
    limit: number;
  },
): Promise<Result<PaginatedResult<StoreDocument>, AppError>> {
  // Tag this cache entry per store
  cacheTag(docsCacheTag(orgId, storeId));

  // Cache for 1 minute; mutations call revalidateTag(tag, 'max') to refresh immediately
  cacheLife("minutes");

  const uc = new ListDocumentsUseCase(orgId);
  return uc.execute({
    storeId,
    q: options.q ?? "",
    sort: options.sort,
    kind: options.kind,
    fileType: options.fileType,
    status: options.status,
    cursor: options.cursor,
    limit: options.limit,
  });
}
