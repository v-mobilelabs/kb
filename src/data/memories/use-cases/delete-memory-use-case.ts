import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteMemorySchema } from "@/data/memories/schemas";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";

const DeleteMemoryUseCasePayload = z.object({
  deletedMemoryId: z.string().min(1),
  deletedDocumentCount: z.number().int().nonnegative(),
});

export class DeleteMemoryUseCase extends BaseUseCase<
  z.infer<typeof DeleteMemorySchema>,
  z.infer<typeof DeleteMemoryUseCasePayload>
> {
  protected schema = DeleteMemorySchema;
  private memoryRepo: MemoryRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.memoryRepo = new MemoryRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof DeleteMemorySchema>,
    result: Result<z.infer<typeof DeleteMemoryUseCasePayload>, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "MEMORY_DELETED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof DeleteMemorySchema>,
  ): Promise<Result<z.infer<typeof DeleteMemoryUseCasePayload>, AppError>> {
    // Verify memory exists
    const existsRes = await this.memoryRepo.findById(input.memoryId);
    if (!existsRes.ok) return err(existsRes.error);

    const memory = existsRes.value;

    // Delete memory and cascade-delete all documents
    const deleteRes = await this.memoryRepo.deleteWithDocuments(input.memoryId);

    if (!deleteRes.ok) return err(deleteRes.error);

    return ok({
      deletedMemoryId: input.memoryId,
      deletedDocumentCount: memory.documentCount,
    });
  }
}
