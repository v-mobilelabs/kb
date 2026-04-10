import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateStoreSchema } from "@/data/stores/dto/store-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import type { Store } from "@/data/stores/models/store.model";

export class UpdateStoreUseCase extends BaseUseCase<
  z.infer<typeof UpdateStoreSchema>,
  { store: Store }
> {
  protected schema = UpdateStoreSchema;
  private storeRepo: StoreRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.storeRepo = new StoreRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof UpdateStoreSchema>,
    result: Result<{ store: Store }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "STORE_UPDATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof UpdateStoreSchema>,
  ): Promise<Result<{ store: Store }, AppError>> {
    const existing = await this.storeRepo.findById(input.storeId);
    if (!existing.ok) return err(existing.error);
    if (existing.value.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    if (input.name) {
      const nameCheck = await this.storeRepo.nameExists(
        input.name,
        input.storeId,
      );
      if (!nameCheck.ok) return err(nameCheck.error);
      if (nameCheck.value) {
        return err(
          appError("CONFLICT", `A store named "${input.name}" already exists`),
        );
      }
    }

    const updates: Partial<Omit<Store, "id">> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.enableRagEvaluation !== undefined)
      updates.enableRagEvaluation = input.enableRagEvaluation;

    const result = await this.storeRepo.update(input.storeId, updates);
    if (!result.ok) return err(result.error);
    return ok({ store: result.value });
  }
}
