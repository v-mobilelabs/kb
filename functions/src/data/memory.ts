import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/admin-firestore.js";
import { ai } from "../lib/genkit.js";
import { logApiKeyUsageSuccess } from "../lib/audit-logger.js";

const CONDENSE_SYSTEM_PROMPT = [
  "You are a memory condenser. Your job is to distill raw content into a compact, " +
    "information-dense representation.",
  "Preserve ALL factual details, decisions, names, numbers, and key context — do not " +
    "omit information.",
  "Remove filler, repetition, and formatting noise.",
  "Return ONLY a JSON object: { \"title\": " +
    "\"<short descriptive title, max 80 chars>\", \"condensed\": " +
    "\"<condensed content>\" }",
  "Do not include any text outside the JSON.",
].join("\n");

interface MemoryData {
  id: string;
  orgId: string;
  [key: string]: unknown;
}

interface MemoryDocumentData {
  id: string;
  title: string;
  content: string;
  isCondensationSummary: boolean;
  sessionId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface CondensedResult {
  title: string;
  condensed: string;
}

/**
 * Condense raw content using Gemini AI
 * Preserves all factual details while removing noise
 */
async function condenseContent(
  rawContent: string,
  providedTitle?: string,
): Promise<CondensedResult> {
  const prompt = providedTitle ?
    `Title hint: ${providedTitle}\n\nContent:\n${rawContent.slice(0, 30_000)}` :
    `Content:\n${rawContent.slice(0, 30_000)}`;

  const result = await ai.generate({
    model: "vertexai/gemini-2.5-flash",
    system: CONDENSE_SYSTEM_PROMPT,
    prompt,
    output: { format: "json" },
  });

  const data = result.output as { title?: string; condensed?: string } | null;

  return {
    title: data?.title ?? providedTitle ?? "Memory Entry",
    condensed: data?.condensed ?? rawContent,
  };
}

/**
 * Get memory details by ID
 */
export async function getMemory(
  orgId: string,
  memoryId: string,
  apiKeyId: string,
): Promise<MemoryData> {
  const snap = await adminDb
    .doc(`organizations/${orgId}/memories/${memoryId}`)
    .get();

  if (!snap.exists) {
    throw new Error("Memory not found");
  }

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "get_memory",
    memoryId,
  });

  return { id: snap.id, ...snap.data() } as MemoryData;
}

/**
 * Add a document to a memory with automatic FIFO eviction at capacity
 * Condenses content before storing
 */
export async function addMemoryDocument(
  orgId: string,
  memoryId: string,
  apiKeyId: string,
  content: string,
  title?: string,
): Promise<MemoryDocumentData> {
  const memoryRef = adminDb.doc(`organizations/${orgId}/memories/${memoryId}`);
  const memorySnap = await memoryRef.get();

  if (!memorySnap.exists) {
    throw new Error("Memory not found");
  }

  const memory = memorySnap.data();
  if (!memory) {
    throw new Error("Memory not found");
  }

  const docsCol = adminDb.collection(
    `organizations/${orgId}/memories/${memoryId}/documents`,
  );

  // Condense content via Gemini before storing
  const { title: condensedTitle, condensed } = await condenseContent(
    content,
    title,
  );

  const docRef = docsCol.doc();
  const now = Timestamp.now();
  const document = {
    title: condensedTitle,
    content: condensed,
    isCondensationSummary: false,
    sessionId: `api:${apiKeyId}`,
    createdAt: now,
    updatedAt: now,
  };

  // Handle FIFO eviction if at capacity
  const currentCount = memory.documentCount as number;
  const capacity = memory.documentCapacity as number;

  const batch = adminDb.batch();

  if (currentCount >= capacity) {
    const oldestSnap = await docsCol.orderBy("createdAt", "asc").limit(1).get();

    if (oldestSnap.empty) {
      batch.set(docRef, document);
      batch.update(memoryRef, {
        documentCount: FieldValue.increment(1),
      });
    } else {
      batch.delete(oldestSnap.docs[0].ref);
      batch.set(docRef, document);
      // count stays the same: -1 evicted +1 created
    }
  } else {
    batch.set(docRef, document);
    batch.update(memoryRef, {
      documentCount: FieldValue.increment(1),
    });
  }

  await batch.commit();

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "create_memory_document",
    memoryId,
    documentId: docRef.id,
  });

  return { id: docRef.id, ...document };
}

/**
 * Create a new memory
 */
export async function createMemory(
  orgId: string,
  apiKeyId: string,
  options: {
    description?: string | null;
    documentCapacity?: number;
    condenseThresholdPercent?: number;
  } = {},
): Promise<MemoryData> {
  const ref = adminDb.collection(`organizations/${orgId}/memories`).doc();
  const now = Timestamp.now();
  const memoryData = {
    orgId,
    description: options.description ?? null,
    documentCapacity: options.documentCapacity ?? 100,
    condenseThresholdPercent: options.condenseThresholdPercent ?? 50,
    documentCount: 0,
    sessionId: `api:${apiKeyId}`,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(memoryData);

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "create_memory",
    memoryId: ref.id,
  });

  return { id: ref.id, ...memoryData };
}

/**
 * List documents in a memory (up to 25 most-recent)
 */
export async function getMemoryDocuments(
  orgId: string,
  memoryId: string,
  apiKeyId: string,
): Promise<{ items: MemoryDocumentData[]; hasNext: boolean; nextCursor: string | null }> {
  const pageSize = 25;
  const snap = await adminDb
    .collection(`organizations/${orgId}/memories/${memoryId}/documents`)
    .orderBy("createdAt", "desc")
    .limit(pageSize + 1)
    .get();

  const allItems = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now();
    const updatedAt =
      data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now();
    return {
      id: d.id,
      ...data,
      createdAt,
      updatedAt,
    } as MemoryDocumentData;
  });

  const hasNext = allItems.length > pageSize;
  const items = hasNext ? allItems.slice(0, pageSize) : allItems;
  const lastItem = items.at(-1);
  const nextCursor = hasNext && lastItem ?
    String((lastItem.createdAt as Timestamp).toMillis()) :
    null;

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "get_memory_documents",
    memoryId,
  });

  return { items, hasNext, nextCursor };
}
