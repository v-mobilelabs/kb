import { ai } from "../../lib/genkit.js";
import {
  QueryInputSchema,
  QueryOutputSchema,
  type QueryOutput,
} from "./query-rag-schema.js";
import { retrieveDocuments, retrievalCtx } from "./query-rag-retrieve.js";
import { judgeRagResult } from "./query-rag-judge.js";

// ── Genkit Flow ───────────────────────────────────────────────────────────────

export const queryRagFlow = ai.defineFlow(
  {
    name: "query-rag",
    inputSchema: QueryInputSchema,
    outputSchema: QueryOutputSchema,
  },
  async (input): Promise<QueryOutput> => {
    const collection = `organizations/${input.orgId}/stores/${input.storeId}/documents`;

    return retrievalCtx.run({ collection }, async () => {
      const docs = await retrieveDocuments({
        query: input.query,
        limit: input.topK,
        filters: input.filters,
      });

      const sources: QueryOutput["sources"] = docs;

      const judgment = input.enableRagEvaluation
        ? await judgeRagResult(input.query, sources)
        : undefined;

      // Judge is the sole authority: relevant → return all, not relevant → return none
      const filteredSources =
        judgment && judgment.relevant ? sources : judgment ? [] : sources;

      const queryResult: QueryOutput = {
        answer:
          judgment?.answer ||
          `Retrieved ${filteredSources.length} relevant documents.`,
        sources: filteredSources,
        retrievedCount: filteredSources.length,
        judgment,
      };

      return queryResult;
    });
  },
);

// ── Re-export public API ────────────────────────────────────────────────────

export type { QueryInput, QueryOutput } from "./query-rag-schema.js";
export { QueryInputSchema, QueryOutputSchema } from "./query-rag-schema.js";
