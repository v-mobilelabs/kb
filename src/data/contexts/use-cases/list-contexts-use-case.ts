import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  ListContextsSchema,
  type ListContextsInput,
} from "@/data/contexts/dto/context-dto";
import {
  ContextRepository,
  type PaginatedContextResult,
} from "@/data/contexts/repositories/context-repository";

export class ListContextsUseCase extends BaseUseCase<
  ListContextsInput,
  PaginatedContextResult
> {
  protected schema = ListContextsSchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: ListContextsInput,
  ): Promise<Result<PaginatedContextResult, AppError>> {
    const repo = new ContextRepository(this.orgId);
    return repo.findByOrgPaginated({
      sort: input.sort,
      cursor: input.cursor,
      limit: input.limit,
    });
  }
}
