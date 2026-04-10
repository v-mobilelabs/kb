import { z } from "zod";

export const SendMagicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  captchaToken: z.string().optional().default(""),
});

export type SendMagicLinkDto = z.infer<typeof SendMagicLinkSchema>;
