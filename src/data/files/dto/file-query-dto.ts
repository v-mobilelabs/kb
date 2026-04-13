/**
 * Zod validation schemas for all file API boundaries
 */

import { z } from "zod";

export const FileKindSchema = z.enum([
  "image",
  "pdf",
  "doc",
  "sheet",
  "video",
  "audio",
  "text",
  "other",
]);

/**
 * File list query parameters schema
 * Validates query params for GET /api/files
 */
export const FileListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  sort: z.enum(["name", "createdAt", "size"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  kinds: z.string().optional(), // comma-separated FileKind values
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type FileListQuery = z.infer<typeof FileListQuerySchema>;

/**
 * File upload metadata validation schema
 * (fields extracted from multipart form metadata before storage upload)
 */
export const FileUploadSchema = z.object({
  originalName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive(),
});

export type FileUploadInput = z.infer<typeof FileUploadSchema>;

/**
 * Parse the `kinds` query param (comma-separated string) into an array of FileKind values.
 * Unrecognised values are silently dropped.
 */
export function parseKindsParam(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const valid = new Set(FileKindSchema.options);
  const parsed = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => valid.has(k as never));
  return parsed.length > 0 ? parsed : undefined;
}
