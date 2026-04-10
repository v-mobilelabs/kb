import { cookies } from "next/headers";
import { appError } from "@/lib/result";
import { VerifyTokenUseCase } from "@/data/auth/use-cases/verify-token-use-case";
import { UserProfileRepository } from "@/data/auth/repositories/user-profile-repository";

export interface AppContext {
  uid: string;
  orgId: string;
  email: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const profileRepo = new UserProfileRepository();

export async function withContext<T>(
  handler: (ctx: AppContext) => Promise<T>,
): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    throw new AuthError("No session cookie");
  }

  const uc = new VerifyTokenUseCase();
  const result = await uc.execute({ sessionCookie });

  if (!result.ok) {
    throw new AuthError(result.error.message);
  }

  const { uid, email, orgId: claimOrgId } = result.value;

  // Fast path: orgId was embedded in the session claim by CreateSessionTokenUseCase
  if (claimOrgId !== null) {
    return handler({ uid, orgId: claimOrgId, email });
  }

  // Fallback: profile lookup for sessions created before claim embedding
  const profileResult = await profileRepo.findById(uid);
  if (!profileResult.ok) {
    // New user — no profile yet; orgId will be empty until onboarding
    return handler({ uid, orgId: "", email });
  }

  const profile = profileResult.value;
  return handler({
    uid,
    orgId: profile.orgId ?? "",
    email: email || profile.email,
  });
}

/** Thin version used after onboarding is complete — throws if orgId is missing */
export async function withAuthenticatedContext<T>(
  handler: (ctx: Required<AppContext>) => Promise<T>,
): Promise<T> {
  return withContext(async (ctx) => {
    if (!ctx.orgId) {
      throw new AuthError("Onboarding not complete — no orgId");
    }
    return handler(ctx as Required<AppContext>);
  });
}

export function makeAppError() {
  return appError("UNAUTHENTICATED", "Not authenticated");
}
