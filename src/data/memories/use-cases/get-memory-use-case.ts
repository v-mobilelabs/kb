import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import type { Memory } from "@/data/memories/types";

const GetMemorySchema = z.object({
  memoryId: z.string().min(1),
});

/**
 * GetMemoryUseCase - Fetch a single memory by ID
 * Validates ownership through repository scope
 */
export class GetMemoryUseCase extends BaseUseCase<
  z.infer<typeof GetMemorySchema>,
  Memory
> {
  protected schema = GetMemorySchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: z.infer<typeof GetMemorySchema>,
  ): Promise<Result<Memory, AppError>> {
    const repo = new MemoryRepository(this.orgId);
    return repo.findById(input.memoryId);
  }
}
