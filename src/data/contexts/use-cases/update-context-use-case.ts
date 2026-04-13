import { z } from "zod";
import { BaseUseCase, type AuditDescriptor } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateContextSchema } from "@/data/contexts/dto/context-dto";
import { ContextRepository } from "@/data/contexts/repositories/context-repository";
import type { Context } from "@/data/contexts/models/context.model";

export class UpdateContextUseCase extends BaseUseCase<
  z.infer<typeof UpdateContextSchema>,
  Context
> {
  protected schema = UpdateContextSchema;
  private readonly contextRepo: ContextRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.contextRepo = new ContextRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof UpdateContextSchema>,
    result: Result<Context, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "CONTEXT_UPDATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof UpdateContextSchema>,
  ): Promise<Result<Context, AppError>> {
    const patch: Partial<Pick<Context, "name" | "windowSize">> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.windowSize !== undefined) patch.windowSize = input.windowSize;

    return this.contextRepo.updateWithConflictDetection(
      input.contextId,
      patch,
      input.currentName,
    );
  }
}
