import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateDocumentSchema } from "@/data/contexts/dto/context-dto";
import { ContextDocumentRepository } from "@/data/contexts/repositories/context-document-repository";
import { ContextRepository } from "@/data/contexts/repositories/context-repository";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";
import { err } from "@/lib/result";

export class CreateDocumentUseCase extends BaseUseCase<
  z.infer<typeof CreateDocumentSchema>,
  ContextDocument
> {
  protected schema = CreateDocumentSchema;
  private readonly docRepo: ContextDocumentRepository;
  private readonly contextRepo: ContextRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.docRepo = new ContextDocumentRepository();
    this.contextRepo = new ContextRepository(ctx.orgId);
  }

  protected auditDescriptor(
    _input: z.infer<typeof CreateDocumentSchema>,
    result: Result<ContextDocument, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "CONTEXT_DOCUMENT_CREATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof CreateDocumentSchema>,
  ): Promise<Result<ContextDocument, AppError>> {
    const createResult = await this.docRepo.create(
      input.orgId,
      input.contextId,
      {
        role: input.role,
        parts: input.parts,
        metadata: input.metadata,
        createdBy: this.ctx.uid,
      },
    );

    if (!createResult.ok) return err(createResult.error);

    // Increment context document count (non-fatal if fails)
    await this.contextRepo.incrementDocumentCount(input.contextId, 1);

    return createResult;
  }
}
