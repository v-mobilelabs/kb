# Research: Auth, Onboarding & Core Platform

**Feature**: `001-auth-onboarding-platform`  
**Date**: 2026-04-05  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Firebase Magic Link Authentication

**Decision**: Use Firebase Email Link (passwordless) via `sendSignInLinkToEmail` (client SDK) for link dispatch and `signInWithEmailLink` for redemption. Session persistence handled by Firebase Admin SDK Session Cookies (14-day HttpOnly cookie), not client-side ID tokens.

**Rationale**: Firebase Email Link is fully managed (rate-limiting, link expiry at 15 min built-in), avoids building a custom token issuance system, and the session-cookie approach is the only Firebase Auth pattern that is SSR-compatible with Next.js App Router — ID tokens expire in 1 hour and cannot be refreshed server-side without the client SDK.

**Implementation pattern**:

1. Client submits email → Server Action calls `sendSignInLinkToEmail` via Admin SDK (or client SDK with `actionCodeSettings`).
2. User clicks link → Next.js `/api/auth/callback` route receives the link, calls `signInWithEmailLink`, mints a session cookie via `Admin.auth().createSessionCookie(idToken)`, sets it as `HttpOnly; Secure; SameSite=Lax`.
3. All subsequent SSR requests read the cookie via `Admin.auth().verifySessionCookie()` in `WithContext`.

**Alternatives considered**: NextAuth.js (Email provider) — rejected because it adds abstraction over Firebase Auth and conflicts with the Firebase Admin session-cookie requirement. Custom JWT — rejected as unnecessary complexity.

---

## 2. AbstractFirebaseRepository Design

**Decision**: Generic abstract class `AbstractFirebaseRepository<T>` in `src/lib/abstractions/abstract-firebase-repository.ts`. Provides: `findById`, `findAll` (with optional `filter`/`sort`/`limit`/`startAfter` pagination cursor), `create`, `update`, `delete`, `count` (Firestore `getCountFromServer` aggregate query), `sum` (Firestore `getSumFromServer`). All methods are `protected` on the base; subclasses expose only what they need.

**Multi-tenancy scoping**: The base class accepts an `orgId` context (injected via `WithContext`) and automatically prefixes subcollection paths. Top-level collections (`/profiles`, `/organizations`) bypass org scoping; subcollections (`/organizations/{orgId}/apiKeys`) scope automatically.

**Rationale**: Centralizing Firestore document mapping, error normalization, and pagination cursor logic in one place eliminates copy-paste across repositories. Firestore `getCountFromServer` is server-side aggregation (no document reads billed) — mandated by constitution constraint "always use Firebase aggregate query".

**Key methods**:

```
findById(id: string): Promise<Result<T, AppError>>
findAll(options?: QueryOptions): Promise<Result<T[], AppError>>
create(data: Omit<T, 'id'>): Promise<Result<T, AppError>>
update(id: string, data: Partial<T>): Promise<Result<T, AppError>>
delete(id: string): Promise<Result<void, AppError>>
count(filter?: FilterOptions): Promise<Result<number, AppError>>
```

**Alternatives considered**: Separate helper functions per repo — rejected because it cannot enforce cross-cutting concerns (org scoping, error normalization) consistently.

---

## 3. BaseUseCase Design

**Decision**: Abstract class `BaseUseCase<TInput, TOutput>` in `src/lib/abstractions/base-use-case.ts`. Implements the template-method pattern: `execute(rawInput)` validates `rawInput` with the subclass-provided Zod schema, starts an OTel span named after the use case class, calls the abstract `handle(validatedInput)`, records span status, and returns `Result<TOutput, AppError>`. Subclasses implement only `handle`.

**Rationale**: Validation and tracing are cross-cutting concerns. Placing them in the abstract class means no use case can forget them — enforced at compile time by the abstract method contract, not by convention.

**OTel integration**: Use `@opentelemetry/api` `trace.getTracer('cosmoops').startActiveSpan(...)`. Compatible with Vercel's built-in OTel support in Next.js 16+.

**Alternatives considered**: Middleware-style function wrappers — rejected because they don't give strong TypeScript types coupling input schema to handler input.

---

## 4. WithContext HOC

**Decision**: Server-side function `withContext<T>(handler: (ctx: AppContext) => Promise<T>): Promise<T>` in `src/lib/middleware/with-context.ts`. Reads `cookies()` from `next/headers`, calls `Admin.auth().verifySessionCookie()`, resolves the user's organization from `/profiles/{uid}`, and injects `AppContext { user, orgId, uid }` into the handler. Throws `AuthError` (caught by Next.js error boundary / `error.tsx`) if unauthenticated or if org record is missing.

**Usage in Server Actions**:

```ts
export async function updateDisplayNameAction(input: unknown) {
  return withContext(async (ctx) => {
    const uc = new UpdateDisplayNameUseCase(ctx);
    return uc.execute(input);
  });
}
```

**Usage in API routes**: Same pattern, but the handler returns a `NextResponse`.

**Rationale**: A single HOC ensures authentication + org-scope injection is never accidentally omitted. Constitution mandates this pattern for all actions/routes.

**Alternatives considered**: Next.js middleware (`middleware.ts`) for auth redirect — retained only for redirecting unauthenticated users away from protected pages (thin check), not for injecting context into actions.

---

## 5. TanStack Query + Optimistic Updates

**Decision**: Use `@tanstack/react-query` v5 with Server Actions as mutation functions. For mutations (update display name, update org name, create API key, revoke API key): use `useMutation` with `onMutate` to apply optimistic cache update, `onError` to roll back, and `onSettled` to invalidate the relevant query key (triggering a background refetch). Visual optimistic feedback: the optimistically updated value renders immediately with a subtle loading indicator (spinner or opacity reduction on the affected element) that resolves when the server confirms.

**Query key conventions**:

```
['profile', uid]            → user profile
['organization', orgId]     → org details
['api-keys', orgId]         → api key list
['dashboard-metrics', orgId] → KPI + chart data
```

**Rationale**: TanStack Query v5 is mandated by constitution. Optimistic mutations are explicitly required in the user's brief. The "shown once" behaviour of new API key creation (key revealed in the mutation response, not refetched) fits naturally into `onSuccess` data injection.

**Alternatives considered**: `useActionState` alone (no optimistic updates, no cache) — adequate for form submission but lacks the real-time optimistic feedback requirement.

---

## 6. Recharts Bar Charts

**Decision**: Use Recharts `BarChart` + `Bar` + `XAxis` + `YAxis` + `Tooltip` + `ResponsiveContainer`. Two chart components: `KeyActivityChart` (requests per day, last 30 days) and `ErrorActivityChart` (failed requests per day, last 30 days). Data shape: `{ date: string; count: number }[]`. Data is fetched server-side in `GetDashboardMetricsUseCase` using Firestore aggregate queries (count of `auditLog` entries per day grouped by `eventType`), then passed to the Client Component as a prop.

**Rationale**: Recharts is the most widely maintained React charting library; no additional render-server needed. Driving charts from aggregated audit log data reuses the FR-024 infrastructure without a separate analytics table.

**Empty state**: When `data` is empty or all counts are zero, render a `div` with a centered descriptive placeholder text matching the skeleton layout dimensions.

**Alternatives considered**: Chart.js / react-chartjs-2 — more configuration overhead, no native TypeScript generics. Victory — less maintained. Tremor — opinionated styling that conflicts with Hero UI + Tailwind v4.

---

## 7. API Key Generation

**Decision**: Generate keys as `cmo_` + 32 cryptographically random alphanumeric characters using `crypto.getRandomValues` (Web Crypto API, available in Next.js edge and Node runtimes). Stored in plaintext in Firestore (deliberate; see spec Clarifications). Masked display: concatenate prefix + `...` + last 4 chars (e.g., `cmo_...ab3z`).

**Rationale**: Web Crypto API is available natively in all target runtimes; no extra dependency needed. The `cmo_` prefix makes keys identifiable in logs and secret-scanning tools (GitHub, Doppler, etc.).

**Alternatives considered**: UUID v4 — no prefix, harder to identify in logs. `nanoid` — extra dependency for the same result.

---

## 8. Firestore Data Model for Dashboard Metrics

**Decision**: Derive chart data from the `auditLog` top-level collection (created by FR-024). Each document stores `{ eventType, actorUid, actorEmail, orgId, timestamp, outcome }`. `GetDashboardMetricsUseCase` issues:

- `getCountFromServer` on `/auditLog` where `orgId == ctx.orgId` AND `eventType == 'API_KEY_USAGE_SUCCESS'` AND `timestamp >= 30daysAgo` → key activity per day (requires a composite index on `orgId + eventType + timestamp`).
- Same query with `eventType == 'API_KEY_USAGE_FAILURE'` → error count per day.
- `getCountFromServer` on `/organizations/{orgId}/apiKeys` where `isRevoked == false` → total active key KPI.

> **Note**: `API_KEY_USAGE_SUCCESS` and `API_KEY_USAGE_FAILURE` events are emitted by an external API gateway or consumer service. This feature defines the event schema and chart rendering; the external producer is out of scope.

**Rationale**: Reuses audit log data per research decision #6. Firestore `getCountFromServer` is billed as a single read regardless of matching document count — cost-efficient for dashboard queries. No secondary analytics table needed in v1.

**Index requirements**: Composite index on `auditLog`: `(orgId ASC, eventType ASC, timestamp ASC)`. Must be deployed before dashboard metrics queries work.

**Alternatives considered**: Storing per-day counters in a separate `metrics` subcollection (increment on each API call) — more write complexity and requires Cloud Functions or middleware; deferred to v2.

---

## 9. Onboarding Detection & Gate

**Decision**: After session cookie verification in `WithContext` (or in the platform layout), check if a `/profiles/{uid}` document exists AND has `onboardingCompletedAt` set. If not, render `OnboardingModal` on top of the requested page with `pointer-events-none` on the background. The modal cannot be closed via keyboard (ESC disabled) or backdrop click while `onboardingCompletedAt` is null. On successful submission of `CompleteOnboardingUseCase`, the profile is updated and the modal unmounts.

**Rationale**: Checking a single field on an existing document is one Firestore read (already fetched by `WithContext`). No additional round-trip or middleware needed.

**Alternatives considered**: Separate `/onboarding` route with redirect — creates a "flash" if the user navigates directly to `/dashboard`; modal approach is invisible to routing and works from any page.

---

## 10. Account Deletion Cascade

**Decision**: `DeleteAccountUseCase` performs a Firestore batched write (or transaction if > 500 ops) atomically:

1. Delete all documents in `/organizations/{orgId}/apiKeys/`.
2. Delete `/organizations/{orgId}`.
3. Delete `/profiles/{uid}`.
4. Call `Admin.auth().deleteUser(uid)`.
5. Clear session cookie.

If any step fails, the write rolls back (Firestore batch atomicity). Auth deletion is performed last because it is not part of the Firestore transaction — if Firestore batch succeeds but `deleteUser` fails, the profile/org data is gone but the Firebase Auth record remains; this is an acceptable inconsistency in v1 (the user cannot log back in because `WithContext` will find no profile, presenting the onboarding modal — effectively a soft-blocked state). A v2 cleanup job can resolve orphaned Auth records.

**Rationale**: Batched write is the most cost-efficient cascade approach in Firestore. The "auth last" ordering maximises data removal even in partial failure.

**Alternatives considered**: Cloud Function triggered by profile deletion — adds infrastructure complexity; deferred to v2.
