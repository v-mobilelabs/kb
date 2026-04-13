import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateMemorySchema } from "@/data/memories/schemas";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import type { Memory } from "@/data/memories/types";

export class UpdateMemoryUseCase extends BaseUseCase<
  z.infer<typeof UpdateMemorySchema>,
  { memory: Memory }
> {
  protected schema = UpdateMemorySchema;
  private memoryRepo: MemoryRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.memoryRepo = new MemoryRepository(ctx.orgId);
  }

  protected auditDescriptor(
    input: z.infer<typeof UpdateMemorySchema>,
    result: Result<{ memory: Memory }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "MEMORY_UPDATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof UpdateMemorySchema>,
  ): Promise<Result<{ memory: Memory }, AppError>> {
    // Verify memory exists
    const existsRes = await this.memoryRepo.findById(input.memoryId);
    if (!existsRes.ok) return err(existsRes.error);

    const updateData: Partial<Omit<Memory, "id">> = {
      updatedAt: new Date(),
    };

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.documentCapacity !== undefined) {
      updateData.documentCapacity = input.documentCapacity;
    }

    if (input.condenseThresholdPercent !== undefined) {
      updateData.condenseThresholdPercent = input.condenseThresholdPercent;
    }

    const result = await this.memoryRepo.update(input.memoryId, updateData);

    if (!result.ok) return err(result.error);
    return ok({ memory: result.value });
  }
}
