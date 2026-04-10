import { adminDb } from "../../lib/admin-firestore.js";

interface SetProcessingInput {
  orgId: string;
  storeId: string;
  docId: string;
}

export async function setProcessingNode(
  state: SetProcessingInput,
): Promise<void> {
  const ref = adminDb.doc(
    `organizations/${state.orgId}/stores/${state.storeId}/documents/${state.docId}`,
  );
  await ref.update({
    status: "processing",
    updatedAt: new Date().toISOString(),
  });
}
