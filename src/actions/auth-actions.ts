"use server";

import { SendMagicLinkUseCase } from "@/data/auth/use-cases/send-magic-link-use-case";
import { CompleteOnboardingUseCase } from "@/data/auth/use-cases/complete-onboarding-use-case";
import { withContext } from "@/lib/middleware/with-context";
import type { Result, AppError } from "@/lib/result";
import type { UserProfile } from "@/data/auth/models/user-profile.model";
import type { Organization } from "@/data/organizations/models/organization.model";

/** Pre-auth — no withContext wrapper */
export async function sendMagicLinkAction(
  rawInput: unknown,
): Promise<Result<{ sent: true }, AppError>> {
  const uc = new SendMagicLinkUseCase();
  return uc.execute(rawInput);
}

export async function completeOnboardingAction(
  rawInput: unknown,
): Promise<Result<{ profile: UserProfile; org: Organization }, AppError>> {
  return withContext(async (ctx) => {
    const uc = new CompleteOnboardingUseCase(ctx);
    return uc.execute(rawInput);
  });
}
