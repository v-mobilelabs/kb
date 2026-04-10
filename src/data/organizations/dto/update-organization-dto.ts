import { z } from "zod";

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(200),
});

export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;
