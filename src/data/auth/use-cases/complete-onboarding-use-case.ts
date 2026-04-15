import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CompleteOnboardingSchema } from "@/data/auth/dto/complete-onboarding-dto";
import { UserProfileRepository } from "@/data/auth/repositories/user-profile-repository";
import { OrganizationRepository } from "@/data/organizations/repositories/organization-repository";
import type { UserProfile } from "@/data/auth/models/user-profile.model";
import type { Organization } from "@/data/organizations/models/organization.model";
import { adminDb } from "@/lib/firebase/admin";

export class CompleteOnboardingUseCase extends BaseUseCase<
  z.infer<typeof CompleteOnboardingSchema>,
  { profile: UserProfile; org: Organization }
> {
  protected schema = CompleteOnboardingSchema;
  private profileRepo = new UserProfileRepository();
  private orgRepo = new OrganizationRepository();

  constructor(private ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof CompleteOnboardingSchema>,
  ): Promise<Result<{ profile: UserProfile; org: Organization }, AppError>> {
    const { uid, email } = this.ctx;

    // Idempotency guard — if profile already exists and onboarding is done, return it
    const existing = await this.profileRepo.findById(uid);
    if (existing.ok && existing.value.onboardingCompletedAt !== null) {
      const existingOrg = await this.orgRepo.findById(existing.value.orgId);
      if (!existingOrg.ok) {
        return err(
          appError("INTERNAL_ERROR", "Org not found after onboarding"),
        );
      }
      return ok({ profile: existing.value, org: existingOrg.value });
    }

    const now = new Date();
    const orgRef = adminDb.collection("organizations").doc();
    const orgId = orgRef.id;

    // Batch write: create profile + create org + add user as owner member atomically
    const batch = adminDb.batch();

    const profileData = {
      email,
      displayName: input.displayName,
      orgId,
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(adminDb.collection("profiles").doc(uid), {
      ...profileData,
      id: uid,
    });

    const orgData = {
      name: input.orgName,
      size: input.orgSize,
      ownerUid: uid,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(orgRef, { ...orgData, id: orgId });

    // Add current user as organization member with owner role
    const membershipData = {
      id: uid,
      orgId,
      userId: uid,
      email,
      baseRole: "owner",
      roleIds: [],
      joinedAt: now,
      lastActiveAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(
      adminDb.collection(`organizations/${orgId}/memberships`).doc(uid),
      membershipData,
    );

    await batch.commit().catch((cause: unknown) => {
      throw appError("INTERNAL_ERROR", "Failed to save onboarding data", cause);
    });

    const profile: UserProfile = { id: uid, ...profileData };
    const org: Organization = { id: orgId, ...orgData };

    return ok({ profile, org });
  }
}
