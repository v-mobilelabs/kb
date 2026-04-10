import { z } from "zod";

export const CreateSessionTokenSchema = z.object({
  idToken: z.string().min(1),
  email: z.string().email(),
});

export type CreateSessionTokenDto = z.infer<typeof CreateSessionTokenSchema>;
