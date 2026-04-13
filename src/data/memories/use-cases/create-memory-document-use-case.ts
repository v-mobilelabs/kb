import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateMemoryDocumentSchema } from "@/data/memories/schemas";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import type { MemoryDocument } from "@/data/memories/types";

const CreateMemoryDocumentUseCaseInput = z.object({
  memoryId: z.string().min(1),
  ...CreateMemoryDocumentSchema.shape,
});

export class CreateMemoryDocumentUseCase extends BaseUseCase<
  z.infer<typeof CreateMemoryDocumentUseCaseInput>,
  { document: MemoryDocument }
> {
  protected schema = CreateMemoryDocumentUseCaseInput;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(
    input: z.infer<typeof CreateMemoryDocumentUseCaseInput>,
    result: Result<{ document: MemoryDocument }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "MEMORY_DOCUMENT_CREATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof CreateMemoryDocumentUseCaseInput>,
  ): Promise<Result<{ document: MemoryDocument }, AppError>> {
    // Verify memory exists
    const memoryRepo = new MemoryRepository(this.ctx.orgId);
    const memoryRes = await memoryRepo.findById(input.memoryId);
    if (!memoryRes.ok) return err(memoryRes.error);

    const memory = memoryRes.value;
    const now = new Date();

    // Create document with increment
    const docRepo = new MemoryDocumentRepository(
      this.ctx.orgId,
      input.memoryId,
    );
    const docRes = await docRepo.createWithIncrement({
      title: input.title,
      content: input.content,
      isCondensationSummary: false,
      sessionId: this.ctx.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (!docRes.ok) return err(docRes.error);

    const document = docRes.value;

    // Check if we exceeded capacity - evict oldest if needed
    if (memory.documentCount + 1 > memory.documentCapacity) {
      const evictRes = await docRepo.evictOldestDocumentsToCapacity(
        memory.documentCount + 1,
        memory.documentCapacity,
      );
      if (!evictRes.ok) {
        // Log warning but don't fail - document was created successfully
        console.warn(
          `[CreateMemoryDocument] Failed to evict oldest documents: ${evictRes.error.message}`,
        );
      }
    }

    return ok({ document });
  }
}
