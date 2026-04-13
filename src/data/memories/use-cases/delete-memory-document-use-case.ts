import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteMemoryDocumentSchema } from "@/data/memories/schemas";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";

const DeleteMemoryDocumentUseCaseInput = z.object({
  memoryId: z.string().min(1),
  ...DeleteMemoryDocumentSchema.shape,
});

const DeleteMemoryDocumentUseCasePayload = z.object({
  deletedDocumentId: z.string().min(1),
});

export class DeleteMemoryDocumentUseCase extends BaseUseCase<
  z.infer<typeof DeleteMemoryDocumentUseCaseInput>,
  z.infer<typeof DeleteMemoryDocumentUseCasePayload>
> {
  protected schema = DeleteMemoryDocumentUseCaseInput;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(
    input: z.infer<typeof DeleteMemoryDocumentUseCaseInput>,
    result: Result<
      z.infer<typeof DeleteMemoryDocumentUseCasePayload>,
      AppError
    >,
  ): AuditDescriptor {
    return {
      eventType: "MEMORY_DOCUMENT_DELETED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof DeleteMemoryDocumentUseCaseInput>,
  ): Promise<
    Result<z.infer<typeof DeleteMemoryDocumentUseCasePayload>, AppError>
  > {
    const repo = new MemoryDocumentRepository(this.ctx.orgId, input.memoryId);

    // Verify document exists
    const existsRes = await repo.findById(input.documentId);
    if (!existsRes.ok) return err(existsRes.error);

    // Delete with decrement
    const deleteRes = await repo.deleteWithDecrement(input.documentId);

    if (!deleteRes.ok) return err(deleteRes.error);

    return ok({
      deletedDocumentId: input.documentId,
    });
  }
}
