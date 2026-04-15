/**
 * Session Revocation via Firebase RTDB
 *
 * When a user is removed from an org, their active sessions must be invalidated.
 * We write a revocation timestamp to RTDB at `/revoked/{userId}`.
 * The auth middleware checks this node on each request; if the session was
 * issued before the revocation time, the request is rejected with 401.
 *
 * RTDB path: /revoked/{userId}  →  Unix timestamp (ms) of revocation
 */

import { adminRtdb } from "@/lib/firebase/admin";

const REVOKED_ROOT = "revoked";

/**
 * Write a revocation entry for the given user.
 * Any session issued before `Date.now()` will be rejected by middleware.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const ref = adminRtdb.ref(`${REVOKED_ROOT}/${userId}`);
  await ref.set(Date.now());
}

/**
 * Clear a revocation entry (e.g. when restoring a removed member).
 * Sessions will no longer be blocked after this call.
 */
export async function clearSessionRevocation(userId: string): Promise<void> {
  const ref = adminRtdb.ref(`${REVOKED_ROOT}/${userId}`);
  await ref.remove();
}

/**
 * Check whether a session (identified by its `issuedAt` timestamp in ms)
 * has been revoked for the given user.
 *
 * Returns `true` if the session should be rejected.
 */
export async function isSessionRevoked(
  userId: string,
  sessionIssuedAtMs: number,
): Promise<boolean> {
  const ref = adminRtdb.ref(`${REVOKED_ROOT}/${userId}`);
  const snap = await ref.get();
  if (!snap.exists()) return false;
  const revokedAtMs = snap.val() as number;
  // Session is revoked if it was issued before the revocation timestamp
  return sessionIssuedAtMs < revokedAtMs;
}
