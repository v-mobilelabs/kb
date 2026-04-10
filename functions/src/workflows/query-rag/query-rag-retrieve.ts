import { z } from "genkit";
import { Document } from "genkit/retriever";
import { AsyncLocalStorage } from "node:async_hooks";
import { ai } from "../../lib/genkit.js";
import { storeDocRetriever } from "../../lib/store-rag.js";
import { formatResults } from "./query-rag-filter.js";
import { rerankDocs } from "./query-rag-rerank.js";

// ── Request-scoped context (avoids re-registering the tool per request) ───────

export interface RetrievalContext {
  collection: string;
}

export const retrievalCtx = new AsyncLocalStorage<RetrievalContext>();

// ── Vector retrieve ──────────────────────────────────────────────────────────

async function vectorRetrieve(
  query: string,
  collection: string,
  fetchLimit: number,
  filters?: Record<string, string>,
): Promise<Document[]> {
  return ai.retrieve({
    retriever: storeDocRetriever,
    query,
    options: { limit: fetchLimit, collection, where: filters },
  });
}

// ── Module-level tool definition (registered once) ───────────────────────────

export const retrieveDocuments = ai.defineTool(
  {
    name: "retrieveDocuments",
    description:
      "Search for relevant documents in the knowledge base using semantic similarity. " +
      "Call this tool with the user query (or a refined version) to find supporting context. " +
      "You may call it multiple times with different phrasings.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant documents"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Number of documents to retrieve"),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Optional filters to apply to the retrieval, as key-value pairs",
        ),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        data: z
          .record(z.string(), z.unknown())
          .or(z.string())
          .nullable()
          .optional(),
        source: z
          .object({ id: z.string(), collection: z.string() })
          .nullable()
          .optional(),
        summary: z.string().nullable().optional(),
        updatedAt: z.string().nullable().optional(),
        score: z.number().optional(),
      }),
    ),
  },
  async ({ query, limit, filters }) => {
    const ctx = retrievalCtx.getStore();
    if (!ctx) {
      return [];
    }

    const filtered = await ai.run("Retrieve vector documents", async () => {
      const { collection } = ctx;
      const fetchLimit = (limit ?? 10) * 3;

      const rawDocs = await vectorRetrieve(
        query,
        collection,
        fetchLimit,
        filters,
      );

      return rawDocs;
    });

    const reranked = await ai.run("Rerank retrieved documents", async () => {
      const docsForRanking = filtered.map((doc) =>
        Document.fromText(doc.text, doc.metadata),
      );

      const reranked = await rerankDocs(query, docsForRanking);
      return reranked;
    });

    return formatResults(reranked.slice(0, limit ?? 10));
  },
);
