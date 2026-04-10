import { z } from "zod";

export const CompleteOnboardingSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100),
  orgName: z.string().min(1, "Organization name is required").max(200),
  orgSize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"], {
    message: "Please select an organization size",
  }),
});

export type CompleteOnboardingDto = z.infer<typeof CompleteOnboardingSchema>;
