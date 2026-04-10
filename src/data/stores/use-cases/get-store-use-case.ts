import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err } from "@/lib/result";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import type { Store } from "@/data/stores/models/store.model";

const GetStoreInputSchema = z.object({
  storeId: z.string().min(1),
});

type GetStoreInput = z.infer<typeof GetStoreInputSchema>;

export class GetStoreUseCase extends BaseUseCase<GetStoreInput, Store> {
  protected schema = GetStoreInputSchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: GetStoreInput,
  ): Promise<Result<Store, AppError>> {
    const repo = new StoreRepository(this.orgId);
    const result = await repo.findById(input.storeId);
    if (!result.ok) return err(result.error);
    if (result.value.orgId !== this.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }
    return result;
  }
}
