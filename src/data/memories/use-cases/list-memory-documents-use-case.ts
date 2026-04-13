import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  MemoryDocumentListQuerySchema,
  type MemoryDocumentListQuery,
} from "@/data/memories/schemas";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import type { PaginatedResult } from "@/data/memories/repositories/memory-repository";
import type { MemoryDocument } from "@/data/memories/types";

const ListMemoryDocumentsInput = z.object({
  memoryId: z.string().min(1),
  ...MemoryDocumentListQuerySchema.shape,
});

/**
 * ListMemoryDocumentsUseCase - Fetch paginated documents within a memory
 * Validates query parameters and delegates to repository
 */
export class ListMemoryDocumentsUseCase extends BaseUseCase<
  z.infer<typeof ListMemoryDocumentsInput>,
  PaginatedResult<MemoryDocument>
> {
  protected schema = ListMemoryDocumentsInput;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: z.infer<typeof ListMemoryDocumentsInput>,
  ): Promise<Result<PaginatedResult<MemoryDocument>, AppError>> {
    const repo = new MemoryDocumentRepository(this.orgId, input.memoryId);
    return repo.findByMemoryPaginated({
      q: input.q,
      sort: input.sort,
      includeCondensed: input.includeCondensed,
      cursor: input.cursor,
      limit: input.limit,
    });
  }
}
