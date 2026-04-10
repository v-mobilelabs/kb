import { z } from "zod";

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, "Key name is required").max(100),
});

export type CreateApiKeyDto = z.infer<typeof CreateApiKeySchema>;
