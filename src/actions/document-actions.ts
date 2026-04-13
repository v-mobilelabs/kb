"use server";

import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { DeleteDocumentUseCase } from "@/data/stores/use-cases/delete-document-use-case";
import { CreateCustomDocumentUseCase } from "@/data/stores/use-cases/create-custom-document-use-case";
import { UpdateCustomDocumentUseCase } from "@/data/stores/use-cases/update-custom-document-use-case";
import { ListDocumentsUseCase } from "@/data/stores/use-cases/list-documents-use-case";
import { RetryDocumentEnrichmentUseCase } from "@/data/stores/use-cases/retry-document-enrichment-use-case";
import { GetSignedUploadUrlUseCase } from "@/data/stores/use-cases/get-signed-upload-url-use-case";
import { docsCacheTag, storeDetailCacheTag } from "@/lib/cache-tags";
import type { Result, AppError } from "@/lib/result";
import type {
  DocumentSortKey,
  PaginatedResult,
} from "@/data/stores/repositories/store-document-repository";
import type {
  StoreDocument,
  DocumentKind,
} from "@/data/stores/models/store-document.model";

export async function deleteDocumentAction(
  rawInput: unknown,
): Promise<Result<{ deleted: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new DeleteDocumentUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate documents list cache on successful deletion
    // Note: We don't have storeId after deletion, so we'd need to extract it from input
    // For now, this is handled by the use case or should be passed back in result

    return result;
  });
}

export async function createCustomDocumentAction(
  rawInput: unknown,
): Promise<Result<{ document: StoreDocument }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new CreateCustomDocumentUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate documents list cache on successful creation
    if (result.ok) {
      const storeId = result.value.document.storeId;
      revalidateTag(docsCacheTag(ctx.orgId, storeId), "max");
    }

    return result;
  });
}

export async function updateCustomDocumentAction(
  rawInput: unknown,
): Promise<Result<{ document: StoreDocument }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new UpdateCustomDocumentUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate documents list cache on successful update
    if (result.ok) {
      const storeId = result.value.document.storeId;
      revalidateTag(docsCacheTag(ctx.orgId, storeId), "max");
    }

    return result;
  });
}

export async function listDocumentsPaginatedAction(
  storeId: string,
  options: {
    q?: string;
    sort?: string;
    kind?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<Result<PaginatedResult<StoreDocument>, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ListDocumentsUseCase(ctx.orgId);
    return uc.execute({
      storeId,
      q: options.q || "",
      sort: (options.sort ?? "createdAt_desc") as DocumentSortKey,
      kind: (options.kind as DocumentKind) || undefined,
      cursor: options.cursor || undefined,
      limit: options.limit ?? 10,
    });
  });
}

export async function retryEnrichmentAction(
  storeId: string,
  docId: string,
): Promise<Result<{ retried: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new RetryDocumentEnrichmentUseCase(ctx);
    return uc.execute({ storeId, docId });
  });
}

export async function getSignedUploadUrlAction(
  rawInput: unknown,
): Promise<
  Result<{ docId: string; storagePath: string; uploadUrl: string }, AppError>
> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new GetSignedUploadUrlUseCase(ctx);
    const result = await uc.execute(rawInput);

    // Invalidate documents list cache on successful upload URL generation
    if (result.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storeId = (rawInput as any)?.storeId;
      if (storeId) {
        revalidateTag(docsCacheTag(ctx.orgId, storeId), "max");
        revalidateTag(storeDetailCacheTag(ctx.orgId, storeId), "max");
      }
    }

    return result;
  });
}
