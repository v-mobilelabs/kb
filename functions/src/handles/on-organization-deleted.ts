import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { adminDb } from "../lib/admin-firestore.js";
import { getBucket } from "../lib/admin-storage.js";

/**
 * Cascade-delete all files (Storage + Firestore) when an organisation is deleted.
 * FR-017: Org-scoped cascade delete for the Files module.
 */
export const onOrganizationDeleted = onDocumentDeleted(
  { document: "organizations/{orgId}" },
  async (event) => {
    const { orgId } = event.params;

    // 1. Delete all Storage objects under organizations/{orgId}/files/
    try {
      const bucket = getBucket();
      const [files] = await bucket.getFiles({
        prefix: `organizations/${orgId}/files/`,
      });
      if (files.length > 0) {
        await Promise.all(files.map((f) => f.delete().catch(() => {})));
      }
    } catch (err) {
      console.error(
        `[onOrganizationDeleted] Storage cleanup failed for org ${orgId}:`,
        err,
      );
      // Non-fatal: Storage files can be cleaned up asynchronously
    }

    // 2. Batch-delete all Firestore docs in organizations/{orgId}/files
    const filesRef = adminDb.collection(`organizations/${orgId}/files`);
    const snapshot = await filesRef.get();

    if (snapshot.empty) return;

    const BATCH_SIZE = 500;
    const batches: Array<Promise<void>> = [];

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      snapshot.docs
        .slice(i, i + BATCH_SIZE)
        .forEach((doc) => batch.delete(doc.ref));
      batches.push(batch.commit().then(() => undefined));
    }

    await Promise.all(batches);
  },
);
