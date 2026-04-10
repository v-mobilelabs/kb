/**
 * Genkit RAG infrastructure for Store Documents.
 *
 * Exports:
 *  - storeDocRetriever  — Firestore vector retriever via @genkit-ai/firebase
 *  - storeDocIndexer    — Genkit indexer that embeds + writes FieldValue.vector()
 *  - indexDocumentEmbedding() — convenience wrapper around ai.index()
 */

import { defineFirestoreRetriever } from "@genkit-ai/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { Document } from "genkit/retriever";
import { ai } from "./genkit.js";
import { adminDb } from "./admin-firestore.js";

// ── Firestore retriever ───────────────────────────────────────────────────────
// The `collection` field is a placeholder — it is always overridden per-query
// via `options.collection` to point to the correct org/store subcollection.
export const storeDocRetriever = defineFirestoreRetriever(ai, {
  name: "storeDocRetriever",
  firestore: adminDb,
  collection: "organizations/_/stores/_/documents",
  contentField: "summary",
  vectorField: "embedding",
  embedder: "vertexai/text-embedding-004",
  distanceMeasure: "COSINE",
});

// ── Indexer ───────────────────────────────────────────────────────────────────
// Each Document fed to this indexer must carry { orgId, storeId, docId } in
// its metadata. The indexer embeds doc.text() and writes FieldValue.vector()
// to the corresponding Firestore document so findNearest() can query it.
export const storeDocIndexer = ai.defineIndexer(
  { name: "store-document-indexer" },
  async (docs: Document[]) => {
    for (const doc of docs) {
      const { orgId, storeId, docId } = doc.metadata as {
        orgId: string;
        storeId: string;
        docId: string;
      };

      const ref = adminDb.doc(
        `organizations/${orgId}/stores/${storeId}/documents/${docId}`,
      );

      const [embResult] = await ai.embed({
        embedder: "vertexai/text-embedding-004",
        content: doc.text.slice(0, 8000),
      });

      await ref.update({
        embedding: FieldValue.vector(embResult.embedding),
      });
    }
  },
);
