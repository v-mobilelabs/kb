import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteDocumentSchema } from "@/data/stores/dto/document-dto";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export class DeleteDocumentUseCase extends BaseUseCase<
  z.infer<typeof DeleteDocumentSchema>,
  { deleted: true }
> {
  protected schema = DeleteDocumentSchema;
  private storeRepo: StoreRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.storeRepo = new StoreRepository(ctx.orgId);
  }

  protected async handle(
    input: z.infer<typeof DeleteDocumentSchema>,
  ): Promise<Result<{ deleted: true }, AppError>> {
    const docRepo = new StoreDocumentRepository(this.ctx.orgId, input.storeId);
    const docResult = await docRepo.findById(input.docId);
    if (!docResult.ok) return err(docResult.error);

    const doc = docResult.value;
    if (doc.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Document does not belong to your organization"),
      );
    }

    const isData = doc.kind === "data";

    const docRef = adminDb
      .collection(
        `organizations/${this.ctx.orgId}/stores/${input.storeId}/documents`,
      )
      .doc(input.docId);
    const storeRef = adminDb
      .collection(`organizations/${this.ctx.orgId}/stores`)
      .doc(input.storeId);

    await adminDb.runTransaction(async (tx) => {
      tx.delete(docRef);
      tx.update(storeRef, {
        documentCount: FieldValue.increment(-1),
        ...(isData ? { dataCount: FieldValue.increment(-1) } : {}),
        updatedAt: Timestamp.now(),
      });
    });

    return ok({ deleted: true });
  }
}
