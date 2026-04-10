import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateCustomDocumentSchema } from "@/data/stores/dto/custom-document-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export class CreateCustomDocumentUseCase extends BaseUseCase<
  z.infer<typeof CreateCustomDocumentSchema>,
  { document: StoreDocument }
> {
  protected schema = CreateCustomDocumentSchema;
  private storeRepo: StoreRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.storeRepo = new StoreRepository(ctx.orgId);
  }

  protected async handle(
    input: z.infer<typeof CreateCustomDocumentSchema>,
  ): Promise<Result<{ document: StoreDocument }, AppError>> {
    const storeResult = await this.storeRepo.findById(input.storeId);
    if (!storeResult.ok) return err(storeResult.error);
    if (storeResult.value.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    const now = new Date();
    const docRef = adminDb
      .collection(
        `organizations/${this.ctx.orgId}/stores/${input.storeId}/documents`,
      )
      .doc();
    const docId = docRef.id;

    const storeRef = adminDb
      .collection(`organizations/${this.ctx.orgId}/stores`)
      .doc(input.storeId);

    const docData = {
      id: docId,
      orgId: this.ctx.orgId,
      storeId: input.storeId,
      name: input.name.trim(),
      kind: "data" as const,
      type: "json" as const,
      status: "pending" as const,
      error: null,
      summary: null,
      keywords: input.keywords ?? [],
      source: input.source,
      data: JSON.parse(input.data),
      createdBy: this.ctx.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await adminDb.runTransaction(async (tx) => {
      tx.set(docRef, docData);
      tx.update(storeRef, {
        documentCount: FieldValue.increment(1),
        dataCount: FieldValue.increment(1),
        updatedAt: Timestamp.fromDate(now),
      });
    });

    const document: StoreDocument = {
      ...docData,
    };

    return ok({ document });
  }
}
