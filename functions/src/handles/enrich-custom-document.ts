import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { handleErrorNode } from "../workflows/nodes/handle-error-node.js";
import {
  customEnrichmentFlow,
  type CustomEnrichmentState,
} from "../workflows/enrich/enrich-document-flow.js";

const FIRESTORE_PATH =
  "organizations/{orgId}/stores/{storeId}/documents/{docId}";

async function runEnrichment(
  orgId: string,
  storeId: string,
  docId: string,
  data: FirebaseFirestore.DocumentData,
): Promise<void> {
  if (data.kind !== "data" || data?.status !== "pending") return;

  const rawData = data.data ?? {};

  const initialState: CustomEnrichmentState = {
    orgId,
    storeId,
    docId,
    name: data.name ?? "",
    data: rawData,
    summary: null,
    keywords: [],
    error: null,
  };

  try {
    await customEnrichmentFlow(initialState);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await handleErrorNode({ orgId, storeId, docId, error: message });
  }
}

export const enrichCustomDocument = onDocumentCreated(
  { document: FIRESTORE_PATH, memory: "512MiB", timeoutSeconds: 300 },
  async (event) => {
    const { orgId, storeId, docId } = event.params;
    const data = event.data?.data();
    if (!data) return;
    await runEnrichment(orgId, storeId, docId, data);
  },
);

export const enrichCustomDocumentOnUpdate = onDocumentUpdated(
  { document: FIRESTORE_PATH, memory: "512MiB", timeoutSeconds: 300 },
  async (event) => {
    const { orgId, storeId, docId } = event.params;
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    // Only re-enrich when status transitioned back to "pending" (e.g. manual reset).
    // Ignore updates triggered by the enrichment pipeline itself to prevent loops.
    const statusBefore = before?.status as string | undefined;
    const statusAfter = after?.status as string | undefined;
    if (statusBefore === statusAfter) return;
    await runEnrichment(orgId, storeId, docId, after);
  },
);
