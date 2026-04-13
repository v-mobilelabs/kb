import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  MemoryListQuerySchema,
  type MemoryListQuery,
} from "@/data/memories/schemas";
import {
  MemoryRepository,
  type PaginatedResult,
} from "@/data/memories/repositories/memory-repository";
import type { Memory } from "@/data/memories/types";

/**
 * ListMemoriesUseCase - Fetch paginated memories for an organization
 * Validates query parameters and delegates to repository
 */
export class ListMemoriesUseCase extends BaseUseCase<
  MemoryListQuery,
  PaginatedResult<Memory>
> {
  protected schema = MemoryListQuerySchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: MemoryListQuery,
  ): Promise<Result<PaginatedResult<Memory>, AppError>> {
    const repo = new MemoryRepository(this.orgId);
    return repo.findByOrgPaginated({
      q: input.q,
      sort: input.sort,
      cursor: input.cursor,
      limit: input.limit,
    });
  }
}
