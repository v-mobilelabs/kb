/**
 * Query parameter validation schemas for store and document list endpoints
 * Per contracts: get-stores.md, get-documents.md
 */

import { z } from "zod";

/**
 * Valid sort keys for store list queries
 */
export const StoreSortKeySchema = z.enum([
  "createdAt_desc",
  "createdAt_asc",
  "name_asc",
  "name_desc",
]);

export type StoreSortKey = z.infer<typeof StoreSortKeySchema>;

/**
 * Store list query parameters schema
 * Validates query params for GET /api/stores
 */
export const StoreListQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sort: StoreSortKeySchema.optional().default("createdAt_desc"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type StoreListQuery = z.infer<typeof StoreListQuerySchema>;

/**
 * Valid sort keys for document list queries
 */
export const DocumentSortKeySchema = z.enum([
  "createdAt_desc",
  "createdAt_asc",
  "name_asc",
  "name_desc",
  "updatedAt_desc",
]);

export type DocumentSortKey = z.infer<typeof DocumentSortKeySchema>;

/**
 * Valid document kinds for filtering
 * Corresponds to DocumentKind union in data model
 */
export const DocumentKindSchema = z.enum(["file", "data"]).optional();

export type DocumentKindFilter = z.infer<typeof DocumentKindSchema>;

export const FileTypeFilterSchema = z
  .enum(["image", "pdf", "doc", "csv"])
  .optional();

export type FileTypeFilter = z.infer<typeof FileTypeFilterSchema>;

/**
 * Document list query parameters schema
 * Validates query params for GET /api/stores/[storeId]/documents
 */
export const DocumentListQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sort: DocumentSortKeySchema.optional().default("createdAt_desc"),
  kind: DocumentKindSchema,
  fileType: FileTypeFilterSchema,
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;
