import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { adminDb } from "../lib/admin-firestore.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const onStoreDocumentDeleted = onDocumentDeleted(
  { document: "organizations/{orgId}/stores/{storeId}/documents/{docId}" },
  async (event) => {
    const { orgId, storeId, docId } = event.params;
    const data = event.data?.data();
    if (!data) return;

    // Belt-and-suspenders counter decrement (primary decrement is in DeleteDocumentUseCase)
    const storeRef = adminDb.doc(`organizations/${orgId}/stores/${storeId}`);
    const decrements: Record<string, FieldValue> = {
      documentCount: FieldValue.increment(-1),
      updatedAt: Timestamp.now() as unknown as FieldValue,
    };

    if (data.kind === "data") {
      decrements.dataCount = FieldValue.increment(-1);
    }

    // Ignore NOT_FOUND on parent store (may already be deleted)
    await storeRef.update(decrements).catch(() => {});

    void docId; // explicitly used in path binding
  },
);
