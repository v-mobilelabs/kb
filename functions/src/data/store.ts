import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/admin-firestore.js";
import { logApiKeyUsageSuccess } from "../lib/audit-logger.js";

interface CreateStoreInput {
  orgId: string;
  apiKeyId: string;
  name: string;
  description?: string | null;
  source: {
    id: string;
    collection: string;
  };
}

interface UpdateStoreInput {
  orgId: string;
  storeId: string;
  apiKeyId: string;
  name?: string;
  description?: string | null;
  source?: {
    id: string;
    collection: string;
  };
}

interface StoreData {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  source: {
    id: string;
    collection: string;
  };
  documentCount: number;
  customCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create a new store
 */
export async function createStore(input: CreateStoreInput): Promise<StoreData> {
  const { orgId, apiKeyId, name, description, source } = input;

  const ref = adminDb.collection(`organizations/${orgId}/stores`).doc();
  const now = Timestamp.now();
  const store = {
    orgId,
    name,
    description: description || null,
    source,
    documentCount: 0,
    customCount: 0,
    createdBy: `api:${apiKeyId}`,
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.runTransaction(async (tx) => {
    tx.set(ref, store);
  });

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "create_store",
    storeId: ref.id,
  });

  return { id: ref.id, ...store };
}

/**
 * Update an existing store
 */
export async function updateStore(input: UpdateStoreInput): Promise<StoreData> {
  const { orgId, storeId, apiKeyId, name, description, source } = input;

  const storeRef = adminDb.doc(`organizations/${orgId}/stores/${storeId}`);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(storeRef);

    if (!snap.exists) {
      throw new Error("Store not found");
    }

    const data = snap.data() as Record<string, unknown>;
    if (data.orgId !== orgId) {
      throw new Error("Forbidden");
    }

    const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };

    if (name !== undefined) {
      updates.name = name;
    }

    if (description !== undefined) {
      updates.description = description || null;
    }

    if (source !== undefined) {
      updates.source = source;
    }

    tx.update(storeRef, updates);
    return { id: storeId, ...data, ...updates } as StoreData;
  });

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "update_store",
    storeId,
  });

  return result;
}

/**
 * Delete a store and all its documents
 */
export async function deleteStore(
  orgId: string,
  storeId: string,
  apiKeyId: string,
): Promise<boolean> {
  const storeRef = adminDb.doc(`organizations/${orgId}/stores/${storeId}`);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(storeRef);

    // idempotent: return success if already deleted
    if (!snap.exists) {
      return;
    }

    const data = snap.data() as Record<string, unknown>;
    if (data.orgId !== orgId) {
      throw new Error("Forbidden");
    }

    // Delete all subcollection documents
    const docsSnap = await adminDb
      .collection(`organizations/${orgId}/stores/${storeId}/documents`)
      .get();

    for (const doc of docsSnap.docs) {
      tx.delete(doc.ref);
    }

    // Delete the store itself
    tx.delete(storeRef);
  });

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "delete_store",
    storeId,
  });

  return true;
}
