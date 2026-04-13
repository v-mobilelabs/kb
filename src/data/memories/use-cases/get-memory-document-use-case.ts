import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import type { MemoryDocument } from "@/data/memories/types";

const GetMemoryDocumentSchema = z.object({
  memoryId: z.string().min(1),
  documentId: z.string().min(1),
});

/**
 * GetMemoryDocumentUseCase - Fetch a single memory document by ID
 * Validates ownership through repository scope
 */
export class GetMemoryDocumentUseCase extends BaseUseCase<
  z.infer<typeof GetMemoryDocumentSchema>,
  MemoryDocument
> {
  protected schema = GetMemoryDocumentSchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: z.infer<typeof GetMemoryDocumentSchema>,
  ): Promise<Result<MemoryDocument, AppError>> {
    const repo = new MemoryDocumentRepository(this.orgId, input.memoryId);
    return repo.findById(input.documentId);
  }
}
