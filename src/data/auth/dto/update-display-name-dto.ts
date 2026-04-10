import { z } from "zod";

export const UpdateDisplayNameSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100),
});

export type UpdateDisplayNameDto = z.infer<typeof UpdateDisplayNameSchema>;
