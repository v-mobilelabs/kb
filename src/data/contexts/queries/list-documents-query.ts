"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { contextDocsCacheTag } from "@/lib/cache-tags";
import { ListDocumentsUseCase } from "@/data/contexts/use-cases/list-documents-use-case";
import type { PaginatedDocumentResult } from "@/data/contexts/repositories/context-document-repository";
import type { DocumentSortKey } from "@/data/contexts/dto/context-dto";
import type { AppError, Result } from "@/lib/result";

export async function listDocumentsQuery(
  orgId: string,
  contextId: string,
  options: {
    sort?: DocumentSortKey;
    cursor?: string;
    limit?: number;
    filterId?: string;
  },
): Promise<Result<PaginatedDocumentResult, AppError>> {
  console.log("[listDocumentsQuery] Fetching documents for org:", orgId, "context:", contextId);
  cacheTag(contextDocsCacheTag(orgId, contextId));
  cacheLife("minutes");

  const uc = new ListDocumentsUseCase();
  const result = await uc.execute({
    orgId,
    contextId,
    sort: options.sort ?? "createdAt_desc",
    cursor: options.cursor,
    limit: options.limit ?? 25,
    filterId: options.filterId,
  });
  console.log("[listDocumentsQuery] Result ok:", result.ok, "items:", result.ok ? result.value.items.length : 0);
  return result;
}
