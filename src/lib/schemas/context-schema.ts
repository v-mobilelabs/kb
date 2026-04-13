import { z } from 'zod';

/**
 * Context input validation schema
 * Used for creating and updating contexts
 */
export const contextInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Context name is required')
    .max(100, 'Context name must be 100 characters or less'),
  windowSize: z
    .number()
    .positive('Window size must be a positive integer')
    .int('Window size must be an integer')
    .optional()
    .nullable(),
});

export type ContextInput = z.infer<typeof contextInputSchema>;

/**
 * Context object schema (database representation)
 */
export const contextSchema = contextInputSchema.extend({
  id: z.string().uuid('Invalid context ID'),
  orgId: z.string().min(1, 'Organization ID is required'),
  documentCount: z.number().int().nonnegative('Document count must be non-negative'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().min(1, 'Creator ID is required'),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
    })
    .optional(),
});

export type Context = z.infer<typeof contextSchema>;

/**
 * Document input validation schema
 * Used for creating and updating documents
 */
export const documentInputSchema = z.object({
  name: z.string().min(1, 'Document name is required').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;

/**
 * Document object schema (database representation)
 */
export const documentSchema = documentInputSchema.extend({
  id: z.string().uuid('Invalid document ID'),
  contextId: z.string().uuid('Invalid context ID'),
  createdAt: z.number().int().positive('createdAt must be a positive Unix timestamp'),
  updatedAt: z.number().int().positive('updatedAt must be a positive Unix timestamp'),
  createdBy: z.string().min(1, 'Creator ID is required'),
});

export type Document = z.infer<typeof documentSchema>;

/**
 * List filters validation schema for contexts
 */
export const contextListFiltersSchema = z.object({
  sort: z.enum(['name', 'createdAt']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().default(25),
});

export type ContextListFilters = z.infer<typeof contextListFiltersSchema>;

/**
 * List filters validation schema for documents
 */
export const documentListFiltersSchema = z.object({
  sort: z.enum(['id', 'name', 'createdAt', 'updatedAt']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().default(25),
  filterId: z.string().uuid().optional(), // For exact ID match filtering
});

export type DocumentListFilters = z.infer<typeof documentListFiltersSchema>;

/**
 * List result schema for contexts
 */
export const contextListResultSchema = z.object({
  items: z.array(contextSchema),
  hasNext: z.boolean(),
  cursor: z.string().optional(),
});

export type ContextListResult = z.infer<typeof contextListResultSchema>;

/**
 * List result schema for documents
 */
export const documentListResultSchema = z.object({
  items: z.array(documentSchema),
  hasNext: z.boolean(),
  cursor: z.string().optional(),
});

export type DocumentListResult = z.infer<typeof documentListResultSchema>;
