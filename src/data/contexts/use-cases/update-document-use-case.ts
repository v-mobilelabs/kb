import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateDocumentSchema } from "@/data/contexts/dto/context-dto";
import { ContextDocumentRepository } from "@/data/contexts/repositories/context-document-repository";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";

export class UpdateDocumentUseCase extends BaseUseCase<
  z.infer<typeof UpdateDocumentSchema>,
  ContextDocument
> {
  protected schema = UpdateDocumentSchema;
  private readonly docRepo = new ContextDocumentRepository();

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(
    _input: z.infer<typeof UpdateDocumentSchema>,
    result: Result<ContextDocument, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "CONTEXT_DOCUMENT_UPDATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof UpdateDocumentSchema>,
  ): Promise<Result<ContextDocument, AppError>> {
    return this.docRepo.update(input.orgId, input.contextId, input.docId, {
      role: input.role,
      parts: input.parts,
      metadata: input.metadata,
    });
  }
}
