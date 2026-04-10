import { z } from "zod";

export const VerifyTokenSchema = z.object({
  sessionCookie: z.string().min(1),
});

export type VerifyTokenDto = z.infer<typeof VerifyTokenSchema>;
