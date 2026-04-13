import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateContextSchema } from "@/data/contexts/dto/context-dto";
import { ContextRepository } from "@/data/contexts/repositories/context-repository";
import { ContextDocumentRepository } from "@/data/contexts/repositories/context-document-repository";
import type { Context } from "@/data/contexts/models/context.model";

export class CreateContextUseCase extends BaseUseCase<
  z.infer<typeof CreateContextSchema>,
  Context
> {
  protected schema = CreateContextSchema;
  private readonly contextRepo: ContextRepository;
  private readonly docRepo: ContextDocumentRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.contextRepo = new ContextRepository(ctx.orgId);
    this.docRepo = new ContextDocumentRepository();
  }

  protected auditDescriptor(
    _input: z.infer<typeof CreateContextSchema>,
    result: Result<Context, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "CONTEXT_CREATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof CreateContextSchema>,
  ): Promise<Result<Context, AppError>> {
    const createResult = await this.contextRepo.create({
      orgId: this.ctx.orgId,
      name: input.name,
      windowSize: input.windowSize ?? null,
      documentCount: 0,
      createdBy: this.ctx.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!createResult.ok) return err(createResult.error);
    const context = createResult.value;

    // Grant creator access in RTDB
    await this.docRepo.grantAccess(this.ctx.orgId, this.ctx.uid, context.id);

    return ok(context);
  }
}
