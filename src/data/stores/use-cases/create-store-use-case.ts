import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateStoreSchema } from "@/data/stores/dto/store-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import type { Store } from "@/data/stores/models/store.model";

export class CreateStoreUseCase extends BaseUseCase<
  z.infer<typeof CreateStoreSchema>,
  { store: Store }
> {
  protected schema = CreateStoreSchema;
  private storeRepo: StoreRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.storeRepo = new StoreRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof CreateStoreSchema>,
    result: Result<{ store: Store }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "STORE_CREATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof CreateStoreSchema>,
  ): Promise<Result<{ store: Store }, AppError>> {
    const nameCheck = await this.storeRepo.nameExists(input.name);
    if (!nameCheck.ok) return err(nameCheck.error);
    if (nameCheck.value) {
      return err(
        appError("CONFLICT", `A store named "${input.name}" already exists`),
      );
    }

    const now = new Date();
    const result = await this.storeRepo.create({
      orgId: this.ctx.orgId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      documentCount: 0,
      fileCount: 0,
      customCount: 0,
      enableRagEvaluation: input.enableRagEvaluation ?? true,
      createdBy: this.ctx.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (!result.ok) return err(result.error);
    return ok({ store: result.value });
  }
}
