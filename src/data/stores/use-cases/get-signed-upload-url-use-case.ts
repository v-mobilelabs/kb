import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  GetSignedUploadUrlSchema,
  type GetSignedUploadUrlInput,
} from "@/data/stores/dto/document-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import { inferFileContextType } from "@/lib/infer-document-kind";
import { getBucket } from "@/lib/firebase/storage";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

interface UploadUrlResult {
  docId: string;
  uploadUrl: string;
  storagePath: string;
}

export class GetSignedUploadUrlUseCase extends BaseUseCase<
  GetSignedUploadUrlInput,
  UploadUrlResult
> {
  protected schema = GetSignedUploadUrlSchema;
  private storeRepo: StoreRepository;

  constructor(private readonly ctx: AppContext) {
    super();
    this.storeRepo = new StoreRepository(ctx.orgId);
  }

  protected async handle(
    input: GetSignedUploadUrlInput,
  ): Promise<Result<UploadUrlResult, AppError>> {
    // Validate store exists and belongs to org
    const storeResult = await this.storeRepo.findById(input.storeId);
    if (!storeResult.ok) return err(storeResult.error);
    if (storeResult.value.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    const bucket = getBucket();
    const docRef = adminDb
      .collection(
        `organizations/${this.ctx.orgId}/stores/${input.storeId}/documents`,
      )
      .doc();
    const docId = docRef.id;

    // Generate storage path: org/{orgId}/store/{storeId}/doc/{docId}/filename
    const storagePath = `org/${this.ctx.orgId}/store/${input.storeId}/doc/${docId}/${input.filename}`;

    // Check for existing doc with same filename (upsert scenario)
    const docRepo = new StoreDocumentRepository(this.ctx.orgId, input.storeId);
    const existingDocs = await adminDb
      .collection(
        `organizations/${this.ctx.orgId}/stores/${input.storeId}/documents`,
      )
      .where("name", "==", input.filename)
      .limit(1)
      .get();

    let oldDocId: string | null = null;
    if (!existingDocs.empty) {
      oldDocId = existingDocs.docs[0].id;
    }

    // Generate 15-minute signed upload URL
    const signedUrl = await bucket.file(storagePath).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: input.mimeType,
    });

    const fileType = inferFileContextType(input.mimeType);
    const now = new Date();

    // Transaction: optionally delete old doc, write new doc, update store counts
    await adminDb.runTransaction(async (tx) => {
      // If upsert, delete old document and decrement counts
      if (oldDocId) {
        const oldDocRef = adminDb
          .collection(
            `organizations/${this.ctx.orgId}/stores/${input.storeId}/documents`,
          )
          .doc(oldDocId);
        tx.delete(oldDocRef);

        // Decrement store counts for old doc
        const storeRef = adminDb
          .collection(`organizations/${this.ctx.orgId}/stores`)
          .doc(input.storeId);
        tx.update(storeRef, {
          documentCount: FieldValue.increment(-1),
          fileCount: FieldValue.increment(-1),
          updatedAt: Timestamp.now(),
        });
      }

      // Write new document
      const newDocData = {
        id: docId,
        orgId: this.ctx.orgId,
        storeId: input.storeId,
        name: input.filename,
        kind: "file" as const,
        type: fileType,
        path: storagePath,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        extractedText: null,
        status: "pending" as const,
        error: null,
        summary: null,
        keywords: [],
        source: {
          id: "upload",
          collection: "documents",
        },
        data: null,
        createdBy: this.ctx.uid,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      tx.set(docRef, newDocData);

      // Increment store counts
      const storeRef = adminDb
        .collection(`organizations/${this.ctx.orgId}/stores`)
        .doc(input.storeId);
      tx.update(storeRef, {
        documentCount: FieldValue.increment(1),
        fileCount: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      });
    });

    return ok({
      docId,
      uploadUrl: signedUrl[0],
      storagePath,
    });
  }
}
