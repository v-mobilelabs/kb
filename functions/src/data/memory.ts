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
  'Return ONLY a JSON object: { "title": ' +
    '"<short descriptive title, max 80 chars>", "condensed": ' +
    '"<condensed content>" }',
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
  const prompt = providedTitle
    ? `Title hint: ${providedTitle}\n\nContent:\n${rawContent.slice(0, 30_000)}`
    : `Content:\n${rawContent.slice(0, 30_000)}`;

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
