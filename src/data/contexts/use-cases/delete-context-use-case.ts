import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteContextSchema } from "@/data/contexts/dto/context-dto";
import { ContextRepository } from "@/data/contexts/repositories/context-repository";
import { ContextDocumentRepository } from "@/data/contexts/repositories/context-document-repository";

export class DeleteContextUseCase extends BaseUseCase<
  z.infer<typeof DeleteContextSchema>,
  { deleted: true }
> {
  protected schema = DeleteContextSchema;
  private readonly contextRepo: ContextRepository;
  private readonly docRepo: ContextDocumentRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.contextRepo = new ContextRepository(ctx.orgId);
    this.docRepo = new ContextDocumentRepository();
  }

  protected auditDescriptor(
    _input: z.infer<typeof DeleteContextSchema>,
    result: Result<{ deleted: true }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "CONTEXT_DELETED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof DeleteContextSchema>,
  ): Promise<Result<{ deleted: true }, AppError>> {
    const deleteResult = await this.contextRepo.delete(input.contextId);
    if (!deleteResult.ok) return deleteResult;

    // Async cascade: delete all RTDB documents + revoke all access grants
    // Errors here are non-fatal (Cloud Function will also handle cleanup)
    await Promise.allSettled([
      this.docRepo.deleteAll(this.ctx.orgId, input.contextId),
      this.docRepo.revokeAllAccessForContext(this.ctx.orgId, input.contextId),
    ]);

    return { ok: true, value: { deleted: true } };
  }
}
