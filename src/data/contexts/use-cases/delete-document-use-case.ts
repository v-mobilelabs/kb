import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteDocumentSchema } from "@/data/contexts/dto/context-dto";
import { ContextDocumentRepository } from "@/data/contexts/repositories/context-document-repository";
import { ContextRepository } from "@/data/contexts/repositories/context-repository";

export class DeleteDocumentUseCase extends BaseUseCase<
  z.infer<typeof DeleteDocumentSchema>,
  { deleted: true }
> {
  protected schema = DeleteDocumentSchema;
  private readonly docRepo = new ContextDocumentRepository();
  private readonly contextRepo: ContextRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.contextRepo = new ContextRepository(ctx.orgId);
  }

  protected auditDescriptor(
    _input: z.infer<typeof DeleteDocumentSchema>,
    result: Result<{ deleted: true }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "CONTEXT_DOCUMENT_DELETED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof DeleteDocumentSchema>,
  ): Promise<Result<{ deleted: true }, AppError>> {
    const deleteResult = await this.docRepo.delete(
      input.orgId,
      input.contextId,
      input.docId,
    );
    if (!deleteResult.ok) return deleteResult;

    // Decrement context document count (non-fatal)
    await this.contextRepo.incrementDocumentCount(input.contextId, -1);

    return { ok: true, value: { deleted: true } };
  }
}
