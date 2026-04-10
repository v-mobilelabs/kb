import { z } from "zod";

export const DeleteDocumentSchema = z.object({
  storeId: z.string().min(1),
  docId: z.string().min(1),
});

export type DeleteDocumentInput = z.infer<typeof DeleteDocumentSchema>;
