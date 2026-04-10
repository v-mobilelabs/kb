import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateCustomDocumentSchema } from "@/data/stores/dto/custom-document-dto";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export class UpdateCustomDocumentUseCase extends BaseUseCase<
  z.infer<typeof UpdateCustomDocumentSchema>,
  { document: StoreDocument }
> {
  protected schema = UpdateCustomDocumentSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof UpdateCustomDocumentSchema>,
  ): Promise<Result<{ document: StoreDocument }, AppError>> {
    const docRepo = new StoreDocumentRepository(this.ctx.orgId, input.storeId);
    const docResult = await docRepo.findById(input.docId);
    if (!docResult.ok) return err(docResult.error);

    const doc = docResult.value;
    if (doc.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Document does not belong to your organization"),
      );
    }
    if (doc.kind !== "data") {
      return err(
        appError(
          "VALIDATION_ERROR",
          "Only data documents can be updated via this action",
        ),
      );
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      updatedAt: now.toISOString(),
    };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.keywords !== undefined) updates.keywords = input.keywords;
    if (input.source !== undefined) updates.source = input.source;
    if (input.data !== undefined) {
      updates.data = JSON.parse(input.data);
      updates.status = "pending"; // trigger re-enrichment
    }

    const docRef = adminDb
      .collection(
        `organizations/${this.ctx.orgId}/stores/${input.storeId}/documents`,
      )
      .doc(input.docId);
    await docRef.update(updates);

    const updated: StoreDocument = {
      ...doc,
      name: (input.name ?? doc.name).trim(),
      keywords: input.keywords ?? doc.keywords,
      source: input.source ?? doc.source,
      ...(input.data !== undefined ? { data: JSON.parse(input.data) } : {}),
      updatedAt: now.toISOString() as string,
    };

    return ok({ document: updated });
  }
}
