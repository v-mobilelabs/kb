import { type Document } from "genkit/retriever";
import { ai } from "../../lib/genkit.js";

export async function rerankDocs(
  query: string,
  docs: Document[],
): Promise<Document[]> {
  // Skip reranking if no documents to rerank
  if (docs.length === 0) {
    return [];
  }

  return ai.rerank({
    reranker: "vertex-rerankers/semantic-ranker-fast-004",
    query,
    documents: docs,
  });
}
