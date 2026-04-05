import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (sessionCookie) {
    // Verify without revocation check so we can still extract the UID
    // even when the session was already revoked by another device.
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, false)
      .catch(() => null);

    if (decoded) {
      // Revoke all refresh tokens for this user so any existing session
      // cookies (on other devices) become invalid immediately.
      await adminAuth.revokeRefreshTokens(decoded.uid).catch(() => null);
    }
  }

  cookieStore.delete("session");
  return NextResponse.json({ ok: true });
}
