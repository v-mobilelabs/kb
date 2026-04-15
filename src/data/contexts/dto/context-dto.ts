import { z } from "zod";

// ── Context DTOs ──────────────────────────────────────────────────────────────

export const CreateContextSchema = z.object({
  name: z.string().trim().min(1).max(100),
  windowSize: z.number().int().positive().nullable().optional(),
});
export type CreateContextInput = z.infer<typeof CreateContextSchema>;

export const UpdateContextSchema = z.object({
  contextId: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  windowSize: z.number().int().positive().nullable().optional(),
  /** Client-read snapshot of name for conflict detection (FR-019) */
  currentName: z.string().optional(),
});
export type UpdateContextInput = z.infer<typeof UpdateContextSchema>;

export const DeleteContextSchema = z.object({
  contextId: z.string().min(1),
});
export type DeleteContextInput = z.infer<typeof DeleteContextSchema>;

export const GetContextSchema = z.object({
  contextId: z.string().min(1),
});
export type GetContextInput = z.infer<typeof GetContextSchema>;

export type ContextSortKey =
  | "updatedAt_desc"
  | "updatedAt_asc"
  | "createdAt_desc"
  | "createdAt_asc"
  | "name_asc"
  | "name_desc";

export const ListContextsSchema = z.object({
  sort: z
    .enum([
      "updatedAt_desc",
      "updatedAt_asc",
      "createdAt_desc",
      "createdAt_asc",
      "name_asc",
      "name_desc",
    ])
    .default("updatedAt_desc"),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(25),
});
export type ListContextsInput = z.infer<typeof ListContextsSchema>;

// ── Document DTOs ─────────────────────────────────────────────────────────────

export const CreateDocumentSchema = z.object({
  orgId: z.string().min(1),
  contextId: z.string().min(1),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(z.unknown()),
  metadata: z.unknown().optional(),
});
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export const UpdateDocumentSchema = z.object({
  orgId: z.string().min(1),
  contextId: z.string().min(1),
  docId: z.string().min(1),
  role: z.enum(["system", "user", "assistant"]).optional(),
  parts: z.array(z.unknown()).optional(),
  metadata: z.unknown().optional(),
});
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;

export const DeleteDocumentSchema = z.object({
  orgId: z.string().min(1),
  contextId: z.string().min(1),
  docId: z.string().min(1),
});
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentSchema>;

export const GetDocumentSchema = z.object({
  orgId: z.string().min(1),
  contextId: z.string().min(1),
  docId: z.string().min(1),
});
export type GetDocumentInput = z.infer<typeof GetDocumentSchema>;

export type DocumentSortKey = "id_asc" | "id_desc" | "role_asc" | "role_desc";

export const ListDocumentsSchema = z.object({
  orgId: z.string().min(1),
  contextId: z.string().min(1),
  sort: z
    .enum(["id_asc", "id_desc", "role_asc", "role_desc"])
    .default("id_desc"),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(25),
  filterId: z.string().optional(),
});
export type ListDocumentsInput = z.infer<typeof ListDocumentsSchema>;
