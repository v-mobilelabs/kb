import { getAuth } from "firebase-admin/auth";
import { adminDb } from "../lib/admin-firestore.js";

// Define Result and AppError types locally for functions (not using @/ paths)
export interface AppError {
  code: string;
  message: string;
  cause?: unknown;
}

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

function appError(code: string, message: string, cause?: unknown): AppError {
  return { code, message, cause };
}

const auth = getAuth();

/**
 * Get the Firebase API key for Identity Toolkit operations.
 * In Cloud Functions, this is passed via environment variables.
 * The value must match the Firebase project's public API key.
 */
function getFirebaseApiKey(): string {
  // Check multiple sources for the API key
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyAZKtJ1PhEl_zrz1QcAO0UN8sXNPBWT1Vg"; // Fallback to project's public API key

  if (!apiKey) {
    throw new Error("Firebase API key is not configured");
  }

  return apiKey;
}

/**
 * Verify a reCAPTCHA v3 token using the reCAPTCHA verification API.
 * Uses the server-side secret key from environment.
 */
export async function verifyCaptchaToken(
  token: string,
  minScore = 0.5,
): Promise<Result<number, AppError>> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Skip verification if secret is not available (e.g., local development)
  if (!secret || !token) {
    return ok(1);
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      },
    );

    if (!response.ok) {
      return err(
        appError("INTERNAL_ERROR", "Failed to verify reCAPTCHA token"),
      );
    }

    const data = (await response.json()) as {
      success: boolean;
      score?: number;
      challenge_ts?: string;
      hostname?: string;
      error_codes?: string[];
    };

    if (!data.success || (data.score ?? 0) < minScore) {
      const errorMsg = data.error_codes?.join(", ") || "Low score";
      return err(
        appError("FORBIDDEN", `reCAPTCHA verification failed: ${errorMsg}`),
      );
    }

    return ok(data.score ?? 1);
  } catch (cause) {
    return err(
      appError("INTERNAL_ERROR", "Error verifying reCAPTCHA token", cause),
    );
  }
}

/**
 * Send a Firebase magic link email via the Identity Toolkit REST API.
 * Includes the organization ID in the continueUrl for reference.
 */
export async function sendOrgMagicLink(
  email: string,
  orgId: string,
): Promise<Result<void, AppError>> {
  const apiKey = getFirebaseApiKey();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/";
  // Include orgId as a query parameter so the client can use it during callback
  const continueUrl = `${baseUrl}auth/verify?orgId=${encodeURIComponent(orgId)}`;

  try {
    const response = await fetch(
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

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
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
  } catch (cause) {
    return err(appError("INTERNAL_ERROR", "Error sending magic link", cause));
  }
}

/**
 * Verify a Firebase ID token and extract user information.
 * ID tokens are returned by the Firebase SDK after the user clicks the magic link.
 */
export async function verifyIdToken(
  idToken: string,
): Promise<Result<{ uid: string; email: string }, AppError>> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return ok({
      uid: decodedToken.uid,
      email: decodedToken.email || "",
    });
  } catch (cause) {
    return err(
      appError("UNAUTHENTICATED", "Invalid or expired ID token", cause),
    );
  }
}

/**
 * Mint a Firebase session cookie from an ID token.
 * Sets the organization ID and user role as custom user claims.
 */
export async function createSessionCookie(
  uid: string,
  idToken: string,
  orgId?: string,
  role?: string,
  expiresInMs = 1209600000, // 14 days
): Promise<Result<string, AppError>> {
  try {
    // Set orgId and role as custom claims
    const customClaims: Record<string, string> = {};
    if (orgId) {
      customClaims.orgId = orgId;
    }
    if (role) {
      customClaims.role = role;
    }

    if (Object.keys(customClaims).length > 0) {
      await auth.setCustomUserClaims(uid, customClaims);
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });

    return ok(sessionCookie);
  } catch (cause) {
    return err(
      appError("INTERNAL_ERROR", "Failed to create session cookie", cause),
    );
  }
}

/**
 * Check if a user is a member of an organization.
 * Returns the membership details if found.
 */
export async function getOrgMembership(
  orgId: string,
  userId: string,
): Promise<
  Result<
    { userId: string; email: string; baseRole: string; deletedAt?: unknown },
    AppError
  >
> {
  try {
    const membershipDoc = await adminDb
      .collection(`organizations/${orgId}/memberships`)
      .doc(userId)
      .get();

    if (!membershipDoc.exists) {
      return err(
        appError("NOT_FOUND", "User is not a member of this organization"),
      );
    }

    const data = membershipDoc.data() as {
      userId: string;
      email: string;
      baseRole: string;
      deletedAt?: unknown;
    };

    // Check if membership is soft-deleted
    if (data.deletedAt !== undefined && data.deletedAt !== null) {
      return err(
        appError(
          "FORBIDDEN",
          "User membership has been removed from this organization",
        ),
      );
    }

    return ok(data);
  } catch (cause) {
    return err(
      appError(
        "INTERNAL_ERROR",
        "Failed to check organization membership",
        cause,
      ),
    );
  }
}

/**
 * Get user profile from Firestore.
 */
export async function getUserProfile(userId: string): Promise<
  Result<
    {
      uid: string;
      email: string;
      displayName?: string;
      photoURL?: string;
      createdAt: unknown;
    },
    AppError
  >
> {
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return err(appError("NOT_FOUND", "User profile not found"));
    }

    const data = userDoc.data() as {
      uid: string;
      email: string;
      displayName?: string;
      photoURL?: string;
      createdAt: unknown;
    };

    return ok(data);
  } catch (cause) {
    return err(
      appError("INTERNAL_ERROR", "Failed to retrieve user profile", cause),
    );
  }
}

/**
 * Update user profile in Firestore.
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    photoURL?: string;
  },
): Promise<Result<void, AppError>> {
  try {
    const userRef = adminDb.collection("users").doc(userId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      ...updates,
    };

    await userRef.update(updateData);
    return ok(undefined);
  } catch (cause) {
    return err(
      appError("INTERNAL_ERROR", "Failed to update user profile", cause),
    );
  }
}

/**
 * Delete user account and associated organization data.
 * Schedules account deletion and removes the organization.
 */
export async function deleteUserAccount(
  userId: string,
): Promise<Result<void, AppError>> {
  try {
    // Get user's organizations where they are the owner
    const orgsSnapshot = await adminDb
      .collection("organizations")
      .where("ownerId", "==", userId)
      .get();

    // Delete all organizations owned by this user
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;

      // Delete organization documents (stores, memories, files, etc.)
      // This would be handled by cascading deletes or a scheduled function
      // For now, mark organization as deleted
      await adminDb.collection("organizations").doc(orgId).update({
        deletedAt: new Date().toISOString(),
        status: "deleted",
      });
    }

    // Delete the user from Firestore
    await adminDb.collection("users").doc(userId).update({
      deletedAt: new Date().toISOString(),
      status: "deleted",
    });

    // Schedule Firebase Auth deletion (this happens via a scheduled Cloud Function)
    // For now, just mark the account for deletion
    return ok(undefined);
  } catch (cause) {
    return err(
      appError("INTERNAL_ERROR", "Failed to delete user account", cause),
    );
  }
}
