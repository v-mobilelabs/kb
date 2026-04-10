import { ai } from "../../lib/genkit.js";
import { setProcessingNode } from "../nodes/set-processing-node.js";
import { generateEmbeddingNode } from "../nodes/generate-embedding-node.js";
import { writeEnrichmentNode } from "../nodes/write-enrichment-node.js";
import { extractKeywordsAndSummary } from "./enrich-llm-node.js";

export interface CustomEnrichmentState {
  orgId: string;
  storeId: string;
  docId: string;
  name: string;
  data: unknown;
  summary: string | null;
  keywords: string[];
  error: string | null;
}

export const customEnrichmentFlow = ai.defineFlow(
  { name: "Data Enrichment" },
  async (input: CustomEnrichmentState): Promise<CustomEnrichmentState> => {
    // Step 1: Mark status as processing
    await setProcessingNode(input);

    // Step 2: Extract keywords and summary via LLM
    const extractedText = JSON.stringify(input.data, null, 2);
    const { keywords, summary } = await extractKeywordsAndSummary(
      input.name,
      extractedText,
    );

    // Step 3: Generate and index embedding via Genkit indexer
    await generateEmbeddingNode({
      orgId: input.orgId,
      storeId: input.storeId,
      docId: input.docId,
      keywords,
      summary,
    });

    // Step 4: Write enrichment results
    await writeEnrichmentNode({
      orgId: input.orgId,
      storeId: input.storeId,
      docId: input.docId,
      keywords,
      summary,
    });

    return { ...input, keywords, summary, error: null };
  },
);
