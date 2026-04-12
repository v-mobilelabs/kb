import { z } from "zod";

export const GetSignedUploadUrlSchema = z.object({
  storeId: z.string().min(1),
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1).max(52_428_800), // 50 MB max
});

export type GetSignedUploadUrlInput = z.infer<typeof GetSignedUploadUrlSchema>;

export const DeleteDocumentSchema = z.object({
  storeId: z.string().min(1),
  docId: z.string().min(1),
});

export type DeleteDocumentInput = z.infer<typeof DeleteDocumentSchema>;
