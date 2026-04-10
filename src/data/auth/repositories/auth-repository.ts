import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";

/**
 * NOT a Firestore repository. Does not extend AbstractFirebaseRepository.
 * Wraps Firebase Auth Admin SDK and external HTTP APIs (reCAPTCHA, Identity Toolkit).
 */
export class AuthHttpRepository {
  /** Verify a Firebase session cookie with revocation check. */
  async verifyToken(
    sessionCookie: string,
  ): Promise<Result<DecodedIdToken, AppError>> {
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);
    if (!decoded) {
      return err(
        appError("UNAUTHENTICATED", "Invalid or expired session cookie"),
      );
    }
    return ok(decoded);
  }

  /**
   * Decode a Firebase session cookie without revocation check.
   * Use for operations (e.g. sign-out) where the token may already be revoked.
   */
  async decodeToken(
    sessionCookie: string,
  ): Promise<Result<DecodedIdToken, AppError>> {
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, false)
      .catch(() => null);
    if (!decoded) {
      return err(appError("UNAUTHENTICATED", "Invalid session token"));
    }
    return ok(decoded);
  }

  /** Verify a Firebase ID token (used when exchanging a magic-link for a session). */
  async verifyIdToken(
    idToken: string,
  ): Promise<Result<DecodedIdToken, AppError>> {
    const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return err(appError("UNAUTHENTICATED", "Invalid or expired ID token"));
    }
    return ok(decoded);
  }

  /**
   * Mint a Firebase session cookie from an ID token.
   * Optionally sets `orgId` as a custom user claim so subsequent token
   * verifications can read it from the claim without a Firestore round-trip.
   */
  async createSessionToken(
    uid: string,
    idToken: string,
    expiresInMs: number,
    orgId?: string | null,
  ): Promise<Result<string, AppError>> {
    if (orgId) {
      await adminAuth.setCustomUserClaims(uid, { orgId }).catch(() => null);
    }

    const sessionCookie = await adminAuth
      .createSessionCookie(idToken, { expiresIn: expiresInMs })
      .catch(() => null);

    if (!sessionCookie) {
      return err(appError("INTERNAL_ERROR", "Failed to create session cookie"));
    }

    return ok(sessionCookie);
  }

  /** Revoke all refresh tokens for a user, immediately invalidating existing sessions. */
  async signOut(uid: string): Promise<Result<void, AppError>> {
    await adminAuth.revokeRefreshTokens(uid).catch(() => null);
    return ok(undefined);
  }

  /** Delete a Firebase Auth account. */
  async deleteAccount(uid: string): Promise<Result<void, AppError>> {
    await adminAuth.deleteUser(uid).catch((cause: unknown) => {
      throw appError(
        "INTERNAL_ERROR",
        "Failed to delete Firebase Auth user",
        cause,
      );
    });
    return ok(undefined);
  }
  /** Verify a reCAPTCHA v3 token. Returns ok(score) or err on failure/low score. */
  async verifyCaptcha(
    token: string,
    minScore = 0.5,
  ): Promise<Result<number, AppError>> {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    // Skip verification when secret key or token is absent (e.g. local dev)
    if (!secret || !token) return ok(1);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY ?? "",
        response: token,
      }),
    });

    const data = (await res.json()) as {
      success: boolean;
      score?: number;
    };

    if (!data.success || (data.score ?? 0) < minScore) {
      return err(appError("FORBIDDEN", "reCAPTCHA verification failed"));
    }

    return ok(data.score ?? 1);
  }

  /** Send a Firebase magic link email via the Identity Toolkit REST API. */
  async sendMagicLink(
    email: string,
    continueUrl: string,
  ): Promise<Result<void, AppError>> {
    // continueUrl must point to the client-side /auth/verify page which reads
    // the email from localStorage and calls the session-creation API.
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "EMAIL_SIGNIN",
          email,
          continueUrl,
          canHandleCodeInApp: true,
        }),
      },
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return err(
        appError(
          "INTERNAL_ERROR",
          body.error?.message ?? "Failed to send magic link",
        ),
      );
    }

    return ok(undefined);
  }
}
