import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateMemorySchema } from "@/data/memories/schemas";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import type { Memory } from "@/data/memories/types";

export class CreateMemoryUseCase extends BaseUseCase<
  z.infer<typeof CreateMemorySchema>,
  { memory: Memory }
> {
  protected schema = CreateMemorySchema;
  private memoryRepo: MemoryRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.memoryRepo = new MemoryRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof CreateMemorySchema>,
    result: Result<{ memory: Memory }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "MEMORY_CREATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof CreateMemorySchema>,
  ): Promise<Result<{ memory: Memory }, AppError>> {
    const now = new Date();
    const result = await this.memoryRepo.create({
      description: input.description,
      documentCapacity: input.documentCapacity,
      condenseThresholdPercent: input.condenseThresholdPercent,
      documentCount: 0,
      sessionId: this.ctx.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (!result.ok) return err(result.error);
    return ok({ memory: result.value });
  }
}
