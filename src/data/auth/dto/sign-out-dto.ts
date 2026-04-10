import { z } from "zod";

export const SignOutSchema = z.object({
  sessionCookie: z.string().optional(),
});

export type SignOutDto = z.infer<typeof SignOutSchema>;
