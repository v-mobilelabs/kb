import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { DeleteAccountSchema } from "@/data/auth/dto/delete-account-dto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { CacheRepository } from "@/data/organizations/repositories/cache-repository";

export class DeleteAccountUseCase extends BaseUseCase<
  z.infer<typeof DeleteAccountSchema>,
  { deleted: true }
> {
  protected schema = DeleteAccountSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "ACCOUNT_DELETED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(
    _input: z.infer<typeof DeleteAccountSchema>,
  ): Promise<Result<{ deleted: true }, AppError>> {
    const { uid, orgId } = this.ctx;

    // Cascade delete: stores & documents → apiKeys → org → profile
    const batch = adminDb.batch();

    if (orgId) {
      // Delete all stores and their documents
      const storesSnap = await adminDb
        .collection(`organizations/${orgId}/stores`)
        .get();
      for (const storeDoc of storesSnap.docs) {
        const docsSnap = await adminDb
          .collection(`organizations/${orgId}/stores/${storeDoc.id}/documents`)
          .get();
        for (const docToDelete of docsSnap.docs) {
          batch.delete(docToDelete.ref);
        }
        batch.delete(storeDoc.ref);
      }

      // Delete all API keys
      const apiKeysSnap = await adminDb
        .collection("api_keys")
        .where("orgId", "==", orgId)
        .get();
      const keysToEvict: string[] = [];
      for (const doc of apiKeysSnap.docs) {
        batch.delete(doc.ref);
        const key = doc.data().key as string | undefined;
        if (key) keysToEvict.push(key);
      }
      await new CacheRepository().removeMany(keysToEvict);

      // Delete the organization
      batch.delete(adminDb.collection("organizations").doc(orgId));
    }

    // Delete the profile
    batch.delete(adminDb.collection("profiles").doc(uid));

    await batch.commit().catch((cause: unknown) => {
      throw appError("INTERNAL_ERROR", "Failed to delete account data", cause);
    });

    // Delete Firebase Auth user last (not in batch — separate operation)
    await adminAuth.deleteUser(uid).catch(() => {
      // Acceptable: Auth record orphaned but profile/org already deleted.
      // User cannot log in as WithContext will find no profile.
    });

    return ok({ deleted: true });
  }
}
