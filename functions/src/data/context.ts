import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/admin-firestore.js";
import { logApiKeyUsageSuccess } from "../lib/audit-logger.js";
import { getAdminRtdb } from "../lib/admin-rtdb.js";

interface CreateContextInput {
  orgId: string;
  apiKeyId: string;
  name: string;
  description?: string | null;
  windowSize?: number | null;
}

interface ContextData {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  windowSize: number | null;
  documentCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ContextDocument {
  id: string;
  contextId: string;
  name: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

interface ContextDocumentsResult {
  items: ContextDocument[];
  hasNext: boolean;
  nextCursor: string | null;
}

/**
 * Create a new context
 */
export async function createContext(
  input: CreateContextInput,
): Promise<ContextData> {
  const { orgId, apiKeyId, name, description, windowSize } = input;

  const ref = adminDb.collection(`organizations/${orgId}/contexts`).doc();

  const contextData: ContextData = {
    id: ref.id,
    orgId,
    name: name.trim(),
    description: description ?? null,
    windowSize: windowSize ?? null,
    documentCount: 0,
    createdBy: apiKeyId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await ref.set(contextData);

  // Log API key usage
  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "create_context",
    contextId: ref.id,
  });

  return contextData;
}

/**
 * Get context documents from RTDB
 */
export async function getContextDocuments(
  orgId: string,
  contextId: string,
): Promise<ContextDocumentsResult> {
  try {
    const db = getAdminRtdb();
    const ref = db
      .ref(`organizations/${orgId}/contexts/${contextId}/documents`)
      .orderByChild("createdAt")
      .limitToLast(26); // Fetch 1 extra to check if there's a next page

    const snapshot = await ref.get();

    if (!snapshot.exists()) {
      return {
        items: [],
        hasNext: false,
        nextCursor: null,
      };
    }

    let items: ContextDocument[] = [];
    snapshot.forEach((child) => {
      items.push({
        id: child.key as string,
        contextId,
        ...child.val(),
      });
    });

    // Reverse to get newest first (since we used limitToLast)
    items = items.reverse();

    const pageSize = 25;
    const hasNext = items.length > pageSize;
    if (hasNext) items = items.slice(0, pageSize);

    const lastItem = items.at(-1);
    const nextCursor = hasNext && lastItem ? String(lastItem.createdAt) : null;

    return {
      items,
      hasNext,
      nextCursor,
    };
  } catch (error) {
    console.error("Error fetching context documents:", error);
    throw error;
  }
}

/**
 * Add a document to a context in RTDB
 */
export async function addContextDocument(
  orgId: string,
  contextId: string,
  apiKeyId: string,
  name: string,
  metadata?: Record<string, unknown>,
): Promise<ContextDocument> {
  try {
    const db = getAdminRtdb();
    const ref = db.ref(
      `organizations/${orgId}/contexts/${contextId}/documents`,
    ).push();

    const now = Date.now();
    const documentData: Omit<ContextDocument, "id" | "contextId"> = {
      name: name.trim(),
      metadata: metadata || {},
      createdBy: apiKeyId,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(documentData);

    // Log API key usage
    await logApiKeyUsageSuccess(orgId, apiKeyId, {
      action: "add_context_document",
      contextId,
      documentId: ref.key,
    });

    return {
      id: ref.key as string,
      contextId,
      ...documentData,
    };
  } catch (error) {
    console.error("Error adding context document:", error);
    throw error;
  }
}

/**
 * Delete all documents in a context from RTDB
 */
export async function deleteContextDocuments(
  orgId: string,
  contextId: string,
  apiKeyId: string,
): Promise<{ deleted: boolean }> {
  try {
    const db = getAdminRtdb();
    const ref = db.ref(`organizations/${orgId}/contexts/${contextId}/documents`);

    await ref.remove();

    // Log API key usage
    await logApiKeyUsageSuccess(orgId, apiKeyId, {
      action: "delete_context_documents",
      contextId,
    });

    return { deleted: true };
  } catch (error) {
    console.error("Error deleting context documents:", error);
    throw error;
  }
}

/**
 * Delete a context and all its data
 */
export async function deleteContext(
  orgId: string,
  contextId: string,
  apiKeyId: string,
): Promise<{ deleted: boolean }> {
  try {
    // Delete context from Firestore
    await adminDb.doc(`organizations/${orgId}/contexts/${contextId}`).delete();

    // Delete documents from RTDB
    const db = getAdminRtdb();
    const documentsRef = db.ref(
      `organizations/${orgId}/contexts/${contextId}/documents`,
    );
    await documentsRef.remove();

    // Delete access control from RTDB
    const accessRef = db.ref(`organizations/${orgId}/contextAccessControl`);
    const snapshot = await accessRef.get();
    if (snapshot.exists()) {
      const updates: Record<string, unknown> = {};
      snapshot.forEach((userSnap) => {
        const userUpdates = userSnap.val();
        if (userUpdates && userUpdates[contextId]) {
          updates[`${userSnap.key}/${contextId}`] = null;
        }
      });
      if (Object.keys(updates).length > 0) {
        await accessRef.update(updates);
      }
    }

    // Log API key usage
    await logApiKeyUsageSuccess(orgId, apiKeyId, {
      action: "delete_context",
      contextId,
    });

    return { deleted: true };
  } catch (error) {
    console.error("Error deleting context:", error);
    throw error;
  }
}
