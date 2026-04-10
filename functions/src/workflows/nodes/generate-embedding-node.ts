import { Document } from "genkit/retriever";
import { ai } from "../../lib/genkit.js";
import { storeDocIndexer } from "../../lib/store-rag.js";

interface GenerateEmbeddingInput {
  orgId: string;
  storeId: string;
  docId: string;
  keywords: string[];
  summary: string | null;
}

interface GenerateEmbeddingOutput {
  indexed: boolean;
}

export async function generateEmbeddingNode(
  state: GenerateEmbeddingInput,
): Promise<GenerateEmbeddingOutput> {
  const parts = [
    state.summary,
    state.keywords.length > 0 ? state.keywords.join(", ") : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!parts) {
    console.warn("[generate-embedding] No text available for embedding");
    return { indexed: false };
  }

  try {
    // Use Genkit indexer to embed + write FieldValue.vector() atomically
    await ai.index({
      indexer: storeDocIndexer,
      documents: [
        Document.fromText(parts.slice(0, 8000), {
          orgId: state.orgId,
          storeId: state.storeId,
          docId: state.docId,
        }),
      ],
    });
    return { indexed: true };
  } catch (e) {
    console.error(
      `[generate-embedding] Failed to index embedding: ${e instanceof Error ? e.message : String(e)}`,
    );
    throw new Error(
      `Failed to index embedding: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
