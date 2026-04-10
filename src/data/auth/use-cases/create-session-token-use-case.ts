import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { AuthHttpRepository } from "@/data/auth/repositories/auth-repository";
import { UserProfileRepository } from "@/data/auth/repositories/user-profile-repository";
import { CreateSessionTokenSchema } from "@/data/auth/dto/create-session-token-dto";

const SESSION_MAX_AGE_MS =
  Number(process.env.SESSION_COOKIE_MAX_AGE ?? 1209600) * 1000; // default 14 days

export class CreateSessionTokenUseCase extends BaseUseCase<
  z.infer<typeof CreateSessionTokenSchema>,
  { sessionCookie: string; uid: string; orgId: string | null }
> {
  protected schema = CreateSessionTokenSchema;
  private readonly authRepo = new AuthHttpRepository();
  private readonly profileRepo = new UserProfileRepository();

  protected auditDescriptor(
    input: z.infer<typeof CreateSessionTokenSchema>,
    result: Result<
      { sessionCookie: string; uid: string; orgId: string | null },
      AppError
    >,
  ): AuditDescriptor {
    return {
      eventType: "MAGIC_LINK_REDEEMED",
      actorUid: result.ok ? result.value.uid : null,
      actorEmail: input.email,
      orgId: result.ok ? result.value.orgId : null,
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof CreateSessionTokenSchema>,
  ): Promise<
    Result<
      { sessionCookie: string; uid: string; orgId: string | null },
      AppError
    >
  > {
    const { idToken, email: _email } = input;

    // Verify the ID token to get the uid
    const decodedResult = await this.authRepo.verifyIdToken(idToken);
    if (!decodedResult.ok) return decodedResult;

    const uid = decodedResult.value.uid;

    // Look up orgId from the user profile (null for users before onboarding)
    const profileResult = await this.profileRepo.findById(uid);
    const orgId = profileResult.ok ? profileResult.value.orgId : null;

    // Mint session cookie, embedding orgId as a custom claim for future verifications
    const sessionCookieResult = await this.authRepo.createSessionToken(
      uid,
      idToken,
      SESSION_MAX_AGE_MS,
      orgId,
    );
    if (!sessionCookieResult.ok) return sessionCookieResult;

    return ok({ sessionCookie: sessionCookieResult.value, uid, orgId });
  }
}
