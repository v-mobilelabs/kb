import { z } from "zod";

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// ── Source shape ──────────────────────────────────────────────────────────
export const SourceSchema = z.object({
  id: z.string().min(1, "source.id is required"),
  collection: z.string().min(1, "source.collection is required"),
});

// ── Context shape (read-only, populated by enrichment) ───────────────────
export const ContextSchema = z.object({
  embedding: z.array(z.number()).nullable().optional(),
  content: z
    .object({
      summary: z.string().nullable().optional(),
    })
    .optional(),
});

// ── Create ───────────────────────────────────────────────────────────────
export const CreateCustomDocumentSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  kind: z.enum(["data", "file", "node"]).default("data"),
  source: SourceSchema,
  data: z.string().refine(isValidJson, { message: "Invalid JSON syntax" }),
  keywords: z.array(z.string().max(50)).max(50).optional(),
});

export type CreateCustomDocumentInput = z.infer<
  typeof CreateCustomDocumentSchema
>;

// ── Update ───────────────────────────────────────────────────────────────
export const UpdateCustomDocumentSchema = z.object({
  storeId: z.string().min(1),
  docId: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  source: SourceSchema.optional(),
  data: z
    .string()
    .refine(isValidJson, { message: "Invalid JSON syntax" })
    .optional(),
  keywords: z.array(z.string().max(50)).max(50).optional(),
});

export type UpdateCustomDocumentInput = z.infer<
  typeof UpdateCustomDocumentSchema
>;
