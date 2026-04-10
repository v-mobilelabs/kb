import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import { StoreRepository } from "@/data/stores/repositories/store-repository";

const RetryDocumentEnrichmentSchema = z.object({
  storeId: z.string().min(1),
  docId: z.string().min(1),
});

type RetryDocumentEnrichmentInput = z.infer<
  typeof RetryDocumentEnrichmentSchema
>;

export class RetryDocumentEnrichmentUseCase extends BaseUseCase<
  RetryDocumentEnrichmentInput,
  { retried: true }
> {
  protected schema = RetryDocumentEnrichmentSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    input: RetryDocumentEnrichmentInput,
  ): Promise<Result<{ retried: true }, AppError>> {
    // Verify store belongs to org
    const storeRepo = new StoreRepository(this.ctx.orgId);
    const storeResult = await storeRepo.findById(input.storeId);
    if (!storeResult.ok) return err(storeResult.error);
    if (storeResult.value.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    const docRepo = new StoreDocumentRepository(this.ctx.orgId, input.storeId);
    const docResult = await docRepo.findById(input.docId);
    if (!docResult.ok) return err(docResult.error);

    const doc = docResult.value;
    if (doc.status !== "failed") {
      return err(
        appError("VALIDATION_ERROR", "Only failed documents can be retried"),
      );
    }

    const updateResult = await docRepo.update(input.docId, {
      status: "pending",
      updatedAt: new Date().toISOString(),
    });
    if (!updateResult.ok) return err(updateResult.error);

    return ok({ retried: true });
  }
}
