import { z } from "genkit";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const QueryInputSchema = z.object({
  storeId: z.string(),
  orgId: z.string(),
  query: z.string().min(1),
  filters: z.record(z.string(), z.string()).optional(),
  topK: z.number().int().min(1).max(50).default(10),
  enableRagEvaluation: z.boolean().default(true),
});

export const QueryOutputSchema = z.object({
  answer: z.string(),
  sources: z.array(
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
  retrievedCount: z.number(),
  judgment: z
    .object({
      relevant: z.boolean(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
      answer: z.string(),
    })
    .optional(),
});

export type QueryInput = z.infer<typeof QueryInputSchema>;
export type QueryOutput = z.infer<typeof QueryOutputSchema>;
