import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateMemoryDocumentSchema } from "@/data/memories/schemas";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import type { MemoryDocument } from "@/data/memories/types";

const UpdateMemoryDocumentUseCaseInput = z.object({
  memoryId: z.string().min(1),
  ...UpdateMemoryDocumentSchema.shape,
});

export class UpdateMemoryDocumentUseCase extends BaseUseCase<
  z.infer<typeof UpdateMemoryDocumentUseCaseInput>,
  { document: MemoryDocument }
> {
  protected schema = UpdateMemoryDocumentUseCaseInput;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(
    input: z.infer<typeof UpdateMemoryDocumentUseCaseInput>,
    result: Result<{ document: MemoryDocument }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "MEMORY_DOCUMENT_UPDATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof UpdateMemoryDocumentUseCaseInput>,
  ): Promise<Result<{ document: MemoryDocument }, AppError>> {
    const repo = new MemoryDocumentRepository(this.ctx.orgId, input.memoryId);

    // Verify document exists
    const existsRes = await repo.findById(input.documentId);
    if (!existsRes.ok) return err(existsRes.error);

    const updateData: Partial<Omit<MemoryDocument, "id">> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    const result = await repo.update(input.documentId, updateData);

    if (!result.ok) return err(result.error);
    return ok({ document: result.value });
  }
}
