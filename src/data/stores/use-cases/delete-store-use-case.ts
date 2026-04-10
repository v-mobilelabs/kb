import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteStoreSchema } from "@/data/stores/dto/store-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";

export class DeleteStoreUseCase extends BaseUseCase<
  z.infer<typeof DeleteStoreSchema>,
  { deleted: true }
> {
  protected schema = DeleteStoreSchema;
  private storeRepo: StoreRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.storeRepo = new StoreRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof DeleteStoreSchema>,
    result: Result<{ deleted: true }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "STORE_DELETED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof DeleteStoreSchema>,
  ): Promise<Result<{ deleted: true }, AppError>> {
    const existing = await this.storeRepo.findById(input.storeId);
    // Idempotent: already gone → success
    if (!existing.ok && existing.error.code === "NOT_FOUND") {
      return ok({ deleted: true });
    }
    if (!existing.ok) return err(existing.error);

    // Delete all Firestore documents + store document
    const deleteResult = await this.storeRepo.deleteWithDocuments(
      input.storeId,
    );
    if (!deleteResult.ok) return err(deleteResult.error);

    return ok({ deleted: true });
  }
}
