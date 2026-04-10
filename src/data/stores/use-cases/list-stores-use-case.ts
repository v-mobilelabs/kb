import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  StoreListQuerySchema,
  type StoreListQuery,
} from "@/data/stores/dto/store-query-dto";
import {
  StoreRepository,
  type PaginatedResult,
} from "@/data/stores/repositories/store-repository";
import type { Store } from "@/data/stores/models/store.model";

export class ListStoresUseCase extends BaseUseCase<
  StoreListQuery,
  PaginatedResult<Store>
> {
  protected schema = StoreListQuerySchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: StoreListQuery,
  ): Promise<Result<PaginatedResult<Store>, AppError>> {
    const repo = new StoreRepository(this.orgId);
    return repo.findByOrgPaginated({
      q: input.q,
      sort: input.sort,
      from: input.from,
      to: input.to,
      cursor: input.cursor,
      limit: input.limit,
    });
  }
}
