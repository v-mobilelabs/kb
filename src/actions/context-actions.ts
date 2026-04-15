"use server";

import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import {
  contextsCacheTag,
  contextDetailCacheTag,
  contextDocsCacheTag,
} from "@/lib/cache-tags";
import { CreateContextUseCase } from "@/data/contexts/use-cases/create-context-use-case";
import { UpdateContextUseCase } from "@/data/contexts/use-cases/update-context-use-case";
import { DeleteContextUseCase } from "@/data/contexts/use-cases/delete-context-use-case";
import { GetContextUseCase } from "@/data/contexts/use-cases/get-context-use-case";
import { ListContextsUseCase } from "@/data/contexts/use-cases/list-contexts-use-case";
import { CreateDocumentUseCase } from "@/data/contexts/use-cases/create-document-use-case";
import { UpdateDocumentUseCase } from "@/data/contexts/use-cases/update-document-use-case";
import { DeleteDocumentUseCase } from "@/data/contexts/use-cases/delete-document-use-case";
import { GetDocumentUseCase } from "@/data/contexts/use-cases/get-document-use-case";
import { ListDocumentsUseCase } from "@/data/contexts/use-cases/list-documents-use-case";
import type { PaginatedContextResult } from "@/data/contexts/repositories/context-repository";
import type { PaginatedDocumentResult } from "@/data/contexts/repositories/context-document-repository";
import type { Result, AppError } from "@/lib/result";
import type { Context } from "@/data/contexts/models/context.model";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";

// ── Context Actions ───────────────────────────────────────────────────────────

export async function createContextAction(
  rawInput: unknown,
): Promise<Result<Context, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new CreateContextUseCase(ctx);
    const result = await uc.execute(rawInput);
    if (result.ok) {
      revalidateTag(contextsCacheTag(ctx.orgId), "max");
    }
    return result;
  });
}

export async function updateContextAction(
  rawInput: unknown,
): Promise<Result<Context, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new UpdateContextUseCase(ctx);
    const result = await uc.execute(rawInput);
    if (result.ok) {
      revalidateTag(contextDetailCacheTag(ctx.orgId, result.value.id), "max");
      revalidateTag(contextsCacheTag(ctx.orgId), "max");
    }
    return result;
  });
}

export async function deleteContextAction(
  rawInput: unknown,
): Promise<Result<{ deleted: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    // Extract contextId for cache invalidation before deletion
    const input = rawInput as { contextId?: string };
    const contextId = input?.contextId ?? "";

    const uc = new DeleteContextUseCase(ctx);
    const result = await uc.execute(rawInput);
    if (result.ok) {
      revalidateTag(contextDetailCacheTag(ctx.orgId, contextId), "max");
      revalidateTag(contextDocsCacheTag(ctx.orgId, contextId), "max");
      revalidateTag(contextsCacheTag(ctx.orgId), "max");
    }
    return result;
  });
}

export async function getContextAction(
  rawInput: unknown,
): Promise<Result<Context, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new GetContextUseCase(ctx.orgId);
    return uc.execute(rawInput);
  });
}

export async function listContextsAction(
  rawInput: unknown,
): Promise<Result<PaginatedContextResult, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ListContextsUseCase(ctx.orgId);
    return uc.execute(rawInput);
  });
}

// ── Document Actions ──────────────────────────────────────────────────────────

export async function createDocumentAction(
  rawInput: unknown,
): Promise<Result<ContextDocument, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    console.log("[createDocumentAction] rawInput:", rawInput);
    const input = rawInput as Record<string, unknown>;
    const uc = new CreateDocumentUseCase(ctx);
    const result = await uc.execute({
      ...input,
      orgId: ctx.orgId,
    });
    console.log("[createDocumentAction] result.ok:", result.ok);
    if (!result.ok) {
      console.error("[createDocumentAction] error:", result.error);
    }
    if (result.ok && typeof input.contextId === "string") {
      const contextId = input.contextId;
      console.log(
        "[createDocumentAction] Revalidating cache tags for org:",
        ctx.orgId,
        "context:",
        contextId,
      );
      revalidateTag(contextDocsCacheTag(ctx.orgId, contextId), "max");
      revalidateTag(contextDetailCacheTag(ctx.orgId, contextId), "max");
      console.log("[createDocumentAction] Cache tags revalidated");
    }
    return result;
  });
}

export async function updateDocumentAction(
  rawInput: unknown,
): Promise<Result<ContextDocument, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const input = rawInput as Record<string, unknown>;
    const uc = new UpdateDocumentUseCase(ctx);
    const result = await uc.execute({
      ...input,
      orgId: ctx.orgId,
    });
    if (result.ok && typeof input.contextId === "string") {
      const contextId = input.contextId;
      revalidateTag(contextDocsCacheTag(ctx.orgId, contextId), "max");
    }
    return result;
  });
}

export async function deleteDocumentAction(
  rawInput: unknown,
): Promise<Result<{ deleted: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const input = rawInput as { contextId?: string; docId?: string };
    const contextId = input?.contextId ?? "";

    const uc = new DeleteDocumentUseCase(ctx);
    const result = await uc.execute({
      ...(rawInput as Record<string, unknown>),
      orgId: ctx.orgId,
    });
    if (result.ok) {
      revalidateTag(contextDocsCacheTag(ctx.orgId, contextId), "max");
      revalidateTag(contextDetailCacheTag(ctx.orgId, contextId), "max");
    }
    return result;
  });
}

export async function getDocumentAction(
  rawInput: unknown,
): Promise<Result<ContextDocument, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new GetDocumentUseCase();
    return uc.execute(rawInput);
  });
}

export async function listDocumentsAction(
  rawInput: unknown,
): Promise<Result<PaginatedDocumentResult, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ListDocumentsUseCase();
    return uc.execute(rawInput);
  });
}
