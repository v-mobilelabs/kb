import { z } from "zod";

// ── Memory DTOs ───────────────────────────────────────────────────

export const CreateMemorySchema = z.object({
  description: z.string().max(1000).nullable().default(null),
  documentCapacity: z.number().int().min(1).default(100),
  condenseThresholdPercent: z.number().int().min(1).max(100).default(50),
});

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

export const UpdateMemorySchema = z.object({
  memoryId: z.string().min(1),
  description: z.string().max(1000).nullable().optional(),
  documentCapacity: z.number().int().min(1).optional(),
  condenseThresholdPercent: z.number().int().min(1).max(100).optional(),
});

export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;

export const DeleteMemorySchema = z.object({
  memoryId: z.string().min(1),
});

export type DeleteMemoryInput = z.infer<typeof DeleteMemorySchema>;

// ── Memory Document DTOs ──────────────────────────────────────────

export const CreateMemoryDocumentSchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.string().max(10_000).optional().default(""),
});

export type CreateMemoryDocumentInput = z.infer<
  typeof CreateMemoryDocumentSchema
>;

export const UpdateMemoryDocumentSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().trim().min(1).max(500).optional(),
  content: z.string().max(10_000).optional(),
});

export type UpdateMemoryDocumentInput = z.infer<
  typeof UpdateMemoryDocumentSchema
>;

export const DeleteMemoryDocumentSchema = z.object({
  documentId: z.string().min(1),
});

export type DeleteMemoryDocumentInput = z.infer<
  typeof DeleteMemoryDocumentSchema
>;

// ── Query DTOs ────────────────────────────────────────────────────

export const MemorySortKeySchema = z.enum(["createdAt_desc", "createdAt_asc"]);

export type MemorySortKey = z.infer<typeof MemorySortKeySchema>;

export const MemoryListQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sort: MemorySortKeySchema.optional().default("createdAt_desc"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type MemoryListQuery = z.infer<typeof MemoryListQuerySchema>;

export const MemoryDocumentSortKeySchema = z.enum([
  "createdAt_desc",
  "createdAt_asc",
  "title_asc",
  "title_desc",
  "updatedAt_desc",
  "updatedAt_asc",
]);

export type MemoryDocumentSortKey = z.infer<typeof MemoryDocumentSortKeySchema>;

export const MemoryDocumentListQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sort: MemoryDocumentSortKeySchema.optional().default("createdAt_desc"),
  includeCondensed: z.coerce.boolean().optional().default(true),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type MemoryDocumentListQuery = z.infer<
  typeof MemoryDocumentListQuerySchema
>;
