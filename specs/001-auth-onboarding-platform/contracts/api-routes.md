# Contracts: API Routes

**Feature**: `001-auth-onboarding-platform`  
**Date**: 2026-04-05  
**Pattern**: API routes use `withContext(...)` HOC (same as Server Actions) except the magic-link callback which is pre-auth. All routes return `NextResponse` with structured JSON bodies.

---

## `GET /api/auth/callback`

Firebase magic-link redemption endpoint. **Pre-auth** — no `withContext` (user has no session yet).

**Query params**

```
?oobCode=<firebase_action_code>&email=<email>
```

**Flow**

1. Verify `oobCode` is a valid email-link sign-in code via Firebase Admin or client `signInWithEmailLink`.
2. Exchange for an ID token.
3. Mint an `HttpOnly; Secure; SameSite=Lax` session cookie via `Admin.auth().createSessionCookie(idToken, { expiresIn: 14days })`.
4. Check if `/profiles/{uid}` exists and `onboardingCompletedAt` is set.
5. Redirect:
   - New user (no profile) → `302 /dashboard` (onboarding modal will appear client-side)
   - Returning user → `302 /dashboard`

**Success response**: `302 Redirect` (no JSON body).

**Error responses**

| Status | Body                          | Condition                                         |
| ------ | ----------------------------- | ------------------------------------------------- |
| `400`  | `{ error: 'INVALID_CODE' }`   | `oobCode` missing or malformed                    |
| `401`  | `{ error: 'EXPIRED_LINK' }`   | Firebase reports expired or already-used code     |
| `500`  | `{ error: 'INTERNAL_ERROR' }` | Session cookie creation or Firestore read failure |

**Audit log**: Writes `MAGIC_LINK_REDEEMED` (success or failure) after attempt.

---

## `GET /api/dashboard/metrics`

Returns aggregated KPI data for the authenticated user's organization. Wrapped in `withContext`.

**Auth**: Session cookie required.  
**Query params**: None (org scoped via `withContext`).

**Success response** `200`

```ts
{
  totalActiveKeys: number; // Firestore aggregate count (isRevoked == false)
  keyActivity: Array<{
    date: string; // 'YYYY-MM-DD'
    count: number; // total API key requests on that day
  }>;
  errors: Array<{
    date: string; // 'YYYY-MM-DD'
    count: number; // failed requests on that day
  }>;
}
```

**Time range**: Last 30 calendar days.  
**Data source**: `auditLog` collection, filtered by `orgId` and `eventType`, aggregated into daily buckets.

**Error responses**

| Status | Body                           | Condition                         |
| ------ | ------------------------------ | --------------------------------- |
| `401`  | `{ error: 'UNAUTHENTICATED' }` | No valid session cookie           |
| `500`  | `{ error: 'INTERNAL_ERROR' }`  | Firestore aggregate query failure |

> **Note**: This route serves the Recharts data in `KeyActivityChart` and `ErrorActivityChart`. Called via TanStack Query key `['dashboard-metrics', orgId]`. SSR prefetch can be optionally added to the Dashboard page's `generateMetadata` or route segment to avoid waterfall on first load.
