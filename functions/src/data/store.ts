import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/admin-firestore.js";
import { logApiKeyUsageSuccess } from "../lib/audit-logger.js";

interface StoreDocumentData {
  id: string;
  orgId: string;
  storeId: string;
  name: string;
  kind: "data";
  type: "json";
  status: "pending" | "completed" | "error";
  error: string | null;
  summary: string | null;
  keywords: string[];
  source: { id: string; collection: string };
  data: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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

/**
 * List documents in a store (up to 25 most-recent)
 */
export async function getStoreDocuments(
  orgId: string,
  storeId: string,
): Promise<{ items: StoreDocumentData[]; hasNext: boolean; nextCursor: string | null }> {
  const pageSize = 25;
  const snap = await adminDb
    .collection(`organizations/${orgId}/stores/${storeId}/documents`)
    .orderBy("createdAt", "desc")
    .limit(pageSize + 1)
    .get();

  const allItems = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return { id: d.id, ...data } as StoreDocumentData;
  });

  const hasNext = allItems.length > pageSize;
  const items = hasNext ? allItems.slice(0, pageSize) : allItems;
  const nextCursor = hasNext ? (items.at(-1)?.createdAt ?? null) : null;

  return { items, hasNext, nextCursor };
}

/**
 * Create a custom "data" document in a store
 */
export async function createStoreDocument(
  orgId: string,
  storeId: string,
  apiKeyId: string,
  name: string,
  source: { id: string; collection: string },
  data: unknown,
  keywords: string[] = [],
): Promise<StoreDocumentData> {
  const storeRef = adminDb.doc(`organizations/${orgId}/stores/${storeId}`);
  const storeSnap = await storeRef.get();

  if (!storeSnap.exists) {
    throw new Error("Store not found");
  }
  if ((storeSnap.data() as Record<string, unknown>).orgId !== orgId) {
    throw new Error("Forbidden");
  }

  const docRef = adminDb
    .collection(`organizations/${orgId}/stores/${storeId}/documents`)
    .doc();
  const now = new Date().toISOString();

  const docData: Omit<StoreDocumentData, "id"> = {
    orgId,
    storeId,
    name: name.trim(),
    kind: "data",
    type: "json",
    status: "pending",
    error: null,
    summary: null,
    keywords,
    source,
    data,
    createdBy: `api:${apiKeyId}`,
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.runTransaction(async (tx) => {
    tx.set(docRef, docData);
    tx.update(storeRef, {
      documentCount: FieldValue.increment(1),
      dataCount: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    });
  });

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "create_store_document",
    storeId,
    documentId: docRef.id,
  });

  return { id: docRef.id, ...docData };
}

/**
 * Update a custom "data" document in a store
 */
export async function updateStoreDocument(
  orgId: string,
  storeId: string,
  docId: string,
  apiKeyId: string,
  updates: {
    name?: string;
    source?: { id: string; collection: string };
    data?: unknown;
    keywords?: string[];
  },
): Promise<StoreDocumentData> {
  const docRef = adminDb.doc(
    `organizations/${orgId}/stores/${storeId}/documents/${docId}`,
  );
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new Error("Document not found");
  }

  const existing = snap.data() as Record<string, unknown>;
  if (existing.orgId !== orgId) {
    throw new Error("Forbidden");
  }
  if (existing.kind !== "data") {
    throw new Error("Only data documents can be updated via this endpoint");
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updatedAt: now };

  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.keywords !== undefined) patch.keywords = updates.keywords;
  if (updates.source !== undefined) patch.source = updates.source;
  if (updates.data !== undefined) {
    patch.data = updates.data;
    patch.status = "pending"; // trigger re-enrichment
  }

  await docRef.update(patch);

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "update_store_document",
    storeId,
    documentId: docId,
  });

  return { id: docId, ...existing, ...patch } as StoreDocumentData;
}
