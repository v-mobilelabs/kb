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
    console.log("[CreateDocumentUseCase] input.metadata:", input.metadata);

    // Generate default name from content if not provided
    let name = input.name;
    if (!name && input.metadata?.content) {
      // Use first line or first 50 chars of content as name
      const content = input.metadata.content as string;
      name =
        content.split("\n")[0].substring(0, 50).trim() || "Untitled Document";
    }
    name = name || "Untitled Document";

    const createResult = await this.docRepo.create(
      input.orgId,
      input.contextId,
      {
        name,
        metadata: input.metadata,
        createdBy: this.ctx.uid,
      },
    );

    if (!createResult.ok) return err(createResult.error);

    console.log(
      "[CreateDocumentUseCase] created doc.metadata:",
      createResult.value.metadata,
    );
    // Increment context document count (non-fatal if fails)
    await this.contextRepo.incrementDocumentCount(input.contextId, 1);

    return createResult;
  }
}
