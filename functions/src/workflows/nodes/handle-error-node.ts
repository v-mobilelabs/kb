import { adminDb } from "../../lib/admin-firestore.js";

interface HandleErrorInput {
  orgId: string;
  storeId: string;
  docId: string;
  error: string | null;
}

export async function handleErrorNode(state: HandleErrorInput): Promise<void> {
  // Log the error for debugging
  console.error(
    `[enrichment-error] doc: ${state.docId}, error: ${state.error}`,
  );

  const ref = adminDb.doc(
    `organizations/${state.orgId}/stores/${state.storeId}/documents/${state.docId}`,
  );
  await ref.update({
    status: "failed",
    error: state.error,
    updatedAt: new Date().toISOString(),
  });
}
