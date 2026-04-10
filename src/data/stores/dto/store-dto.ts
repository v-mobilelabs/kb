import { z } from "zod";

export const CreateStoreSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  enableRagEvaluation: z.boolean().default(true),
});

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;

export const UpdateStoreSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  enableRagEvaluation: z.boolean().optional(),
});

export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;

export const DeleteStoreSchema = z.object({
  storeId: z.string().min(1),
});

export type DeleteStoreInput = z.infer<typeof DeleteStoreSchema>;
