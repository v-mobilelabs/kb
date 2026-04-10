import { adminDb } from "../../lib/admin-firestore.js";

interface WriteEnrichmentInput {
  orgId: string;
  storeId: string;
  docId: string;
  keywords: string[];
  summary: string | null;
}

export async function writeEnrichmentNode(
  state: WriteEnrichmentInput,
): Promise<void> {
  const ref = adminDb.doc(
    `organizations/${state.orgId}/stores/${state.storeId}/documents/${state.docId}`,
  );
  await ref.update({
    status: "completed",
    keywords: state.keywords,
    summary: state.summary,
    error: null,
    // embedding is already written by generateEmbeddingNode via storeDocIndexer
    updatedAt: new Date().toISOString(),
  });
}
