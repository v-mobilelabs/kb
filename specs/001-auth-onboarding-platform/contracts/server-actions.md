# Contracts: Server Actions

**Feature**: `001-auth-onboarding-platform`  
**Date**: 2026-04-05  
**Pattern**: All Server Actions are wrapped in `withContext(...)`. They return `Result<TOutput, AppError>`. Client-side callers use TanStack Query `useMutation` or `useActionState`.

---

## `src/actions/auth-actions.ts`

### `sendMagicLinkAction`

Dispatches a Firebase magic link email to the provided address. **Pre-auth** — no `withContext` wrapper (user is not yet authenticated).

**Input**

```ts
{
  email: string;
} // validated by SendMagicLinkSchema (Zod)
```

**Output**

```ts
Result<{ sent: true }, AppError>;
```

**Rate limit**: Max 5 calls per email per hour (enforced in use case via Firestore audit log count query).  
**Side effect**: Writes an `auditLog` entry (`MAGIC_LINK_REQUEST`, outcome: `success | failure`).  
**Error cases**:

- `VALIDATION_ERROR` — malformed email
- `RATE_LIMIT_EXCEEDED` — > 5 requests/hour for this email
- `INTERNAL_ERROR` — Firebase dispatch failure

---

### `completeOnboardingAction`

Creates the user profile and organization on first sign-in. Wrapped in `withContext` (session cookie must be valid but `onboardingCompletedAt` may be null).

**Input**

```ts
{
  displayName: string; // min 2, max 100
  orgName: string; // min 1, max 200
  orgSize: OrgSize; // '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'
}
```

**Output**

```ts
Result<{ profile: UserProfile; org: Organization }, AppError>;
```

**Side effects**: Creates `/profiles/{uid}` + `/organizations/{orgId}`, sets `onboardingCompletedAt`.  
**Error cases**:

- `VALIDATION_ERROR` — any field fails schema
- `CONFLICT` — profile already exists (idempotency guard)
- `INTERNAL_ERROR` — Firestore write failure

---

## `src/actions/profile-actions.ts`

### `updateDisplayNameAction`

Updates the authenticated user's display name. Wrapped in `withContext`.

**Input**

```ts
{
  displayName: string;
} // min 2, max 100
```

**Output**

```ts
Result<{ displayName: string }, AppError>;
```

**Optimistic update**: TanStack Query key `['profile', uid]` — mutate cache immediately, roll back on error.  
**Error cases**:

- `VALIDATION_ERROR` — name too short / too long
- `NOT_FOUND` — profile document missing
- `INTERNAL_ERROR`

---

### `deleteAccountAction`

Permanently deletes the authenticated user's account, organization, and all API keys in a batched write. Wrapped in `withContext`. **Requires prior `ReusableConfirmModal` confirmation on the client.**

**Input**: None (actor identity from `withContext`).  
**Output**:

```ts
Result<{ deleted: true }, AppError>;
```

**Side effects (atomic batch)**:

1. Delete all `/organizations/{orgId}/apiKeys/*`
2. Delete `/organizations/{orgId}`
3. Delete `/profiles/{uid}`
4. `Admin.auth().deleteUser(uid)` _(post-batch; not atomic)_
5. Clear session cookie

**Audit log**: Writes `ACCOUNT_DELETED` entry before batch (so it survives if profile is deleted).  
**Error cases**:

- `INTERNAL_ERROR` — Firestore batch failure (rolled back automatically)

---

## `src/actions/organization-actions.ts`

### `updateOrganizationAction`

Updates the name of the authenticated user's organization. Wrapped in `withContext`.

**Input**

```ts
{
  name: string;
} // min 1, max 200
```

**Output**

```ts
Result<{ name: string }, AppError>;
```

**Optimistic update**: TanStack Query key `['organization', orgId]`.  
**Authorization**: `withContext` ensures `ctx.orgId` matches the org being updated; users can only update their own org.  
**Error cases**:

- `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`

---

### `createApiKeyAction`

Generates and stores a new API key scoped to the authenticated user's organization. Wrapped in `withContext`.

**Input**

```ts
{
  name: string;
} // user label, min 1, max 100
```

**Output**

```ts
Result<
  {
    id: string;
    name: string;
    key: string; // FULL plaintext key — shown ONCE to client, never re-fetched
    maskedKey: string;
    createdAt: string; // ISO 8601
  },
  AppError
>;
```

**Key generation**: `cmo_` + 32 cryptographically random alphanumeric chars via Web Crypto API.  
**Storage**: Full `key` stored in plaintext in Firestore (deliberate; see spec Clarifications).  
**Optimistic update**: Append masked representation to TanStack Query key `['api-keys', orgId]`; full key available only from mutation `data` on `onSuccess`.  
**Audit log**: Writes `API_KEY_CREATED`.  
**Error cases**:

- `VALIDATION_ERROR`, `INTERNAL_ERROR`

---

### `revokeApiKeyAction`

Marks an API key as revoked. Wrapped in `withContext`. **Requires prior `ReusableConfirmModal` confirmation on the client.**

**Input**

```ts
{
  keyId: string;
}
```

**Output**

```ts
Result<{ revoked: true }, AppError>;
```

**Authorization**: Verifies the key's `orgId` matches `ctx.orgId` before revoking. Rejects cross-org access.  
**Optimistic update**: Set `isRevoked: true` on the key in TanStack Query key `['api-keys', orgId]`; roll back on error.  
**Audit log**: Writes `API_KEY_REVOKED`.  
**Effect**: Key remains in Firestore (for audit); excluded from active list and KPI count.  
**Error cases**:

- `NOT_FOUND` — key doesn't exist or belongs to a different org (`FORBIDDEN`)
- `ALREADY_REVOKED` — idempotency guard (returns success)
- `INTERNAL_ERROR`

---

## Read Operations

> **Data-fetching strategy**: Profile and organization data are SSR-prefetched in the `(platform)` layout via `WithContext` and passed as props to pages. TanStack Query hydrates these on the client for cache consistency. The API key list requires an explicit query action below.

### `listApiKeysAction`

Returns all active (non-revoked) API keys for the authenticated user's organization in masked format. Wrapped in `withContext`.

**Input**: None (org scoped via `withContext`).

**Output**

```ts
Result<
  {
    keys: Array<{
      id: string;
      name: string;
      maskedKey: string;
      createdAt: string; // ISO 8601
    }>;
  },
  AppError
>;
```

**Query key**: `['api-keys', orgId]` — used by `ApiKeyList` component via `useQuery`.
**Error cases**:

- `INTERNAL_ERROR` — Firestore read failure
