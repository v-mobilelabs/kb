import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CreateSessionTokenUseCase } from "@/data/auth/use-cases/create-session-token-use-case";

const SESSION_MAX_AGE_MS =
  Number(process.env.SESSION_COOKIE_MAX_AGE ?? 1209600) * 1000; // 14 days

/**
 * POST /api/auth/callback
 * Body: { idToken: string; email: string }
 *
 * Called by the client-side /auth/verify page after it has exchanged the
 * magic-link oobCode for a Firebase ID token using the Client SDK.
 * Delegates to CreateSessionTokenUseCase which verifies the token, mints an
 * HttpOnly session cookie, embeds orgId in the claim, and writes the audit log.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    idToken?: string;
    email?: string;
  } | null;

  if (!body?.idToken || !body?.email) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const uc = new CreateSessionTokenUseCase();
  const result = await uc.execute({ idToken: body.idToken, email: body.email });

  if (!result.ok) {
    const status = result.error.code === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: result.error.code }, { status });
  }

  const cookieStore = await cookies();
  cookieStore.set("session", result.value.sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
