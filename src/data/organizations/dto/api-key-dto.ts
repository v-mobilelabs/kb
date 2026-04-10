import { z } from "zod";

export const ApiKeySchema = z.object({
  keyId: z.string().min(1),
});

export type ApiKeyDto = z.infer<typeof ApiKeySchema>;
