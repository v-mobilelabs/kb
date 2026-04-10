import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth routes: unauthenticated-only pages.
 * Used to redirect authenticated users away (e.g. back to dashboard).
 * Note: /auth/* routes are intentionally excluded — they handle functional
 * flows (magic link verify, callback, signout) that must work regardless
 * of session state.
 */
const AUTH_ROUTES = ["/login"];

/**
 * Lightweight JWT expiry check that runs in the Edge Runtime.
 * Does NOT verify the signature — the platform layout and withContext
 * both call adminAuth.verifySessionCookie(cookie, true) for that.
 * This is intentionally a thin UX gate (research.md §4).
 */
function isSessionNotExpired(sessionCookie: string): boolean {
  try {
    const payload = sessionCookie.split(".")[1];
    if (!payload) return false;
    // atob is available in Edge Runtime (Web API)
    const decoded = JSON.parse(
      atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
    ) as { exp?: unknown };
    return typeof decoded.exp === "number" && decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session")?.value;
  const hasValidSession = !!sessionCookie && isSessionNotExpired(sessionCookie);

  const isPlatformRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/stores");

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Unauthenticated (or expired-cookie) users hitting platform routes → login
  if (isPlatformRoute && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users hitting auth routes → dashboard
  if (isAuthRoute && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/stores/:path*",
    "/login",
    "/auth/:path*",
  ],
};
