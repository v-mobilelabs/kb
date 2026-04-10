# Data Model: Auth, Onboarding & Core Platform

**Feature**: `001-auth-onboarding-platform`  
**Date**: 2026-04-05

---

## Firestore Collections

### `/profiles/{userId}`

Top-level collection. One document per authenticated user. `userId` = Firebase Auth UID.

| Field                   | Type                | Required | Notes                                                        |
| ----------------------- | ------------------- | -------- | ------------------------------------------------------------ |
| `id`                    | `string`            | ✅       | Firebase Auth UID (same as document ID)                      |
| `email`                 | `string`            | ✅       | From Firebase Auth; validated email format                   |
| `displayName`           | `string`            | ✅       | ≥ 2 characters; set during onboarding, editable on Profile   |
| `orgId`                 | `string`            | ✅       | Reference to `/organizations/{orgId}` — set after onboarding |
| `onboardingCompletedAt` | `Timestamp \| null` | ✅       | `null` until onboarding modal submitted; used as gate        |
| `createdAt`             | `Timestamp`         | ✅       | Server-set on document creation                              |
| `updatedAt`             | `Timestamp`         | ✅       | Server-set on every write                                    |

**Indexes**: Default (no composite index needed — looked up by document ID).

---

### `/organizations/{orgId}`

Top-level collection. One document per organization. `orgId` = auto-generated Firestore document ID.

| Field       | Type             | Required | Notes                                                  |
| ----------- | ---------------- | -------- | ------------------------------------------------------ |
| `id`        | `string`         | ✅       | Firestore auto-generated document ID                   |
| `name`      | `string`         | ✅       | Required; editable from Settings                       |
| `size`      | `OrgSize` (enum) | ✅       | One of: `1-10`, `11-50`, `51-200`, `201-1000`, `1000+` |
| `ownerUid`  | `string`         | ✅       | Firebase Auth UID of the creating user                 |
| `createdAt` | `Timestamp`      | ✅       | Server-set                                             |
| `updatedAt` | `Timestamp`      | ✅       | Server-set on every write                              |

**Indexes**: None beyond default.

---

### `/organizations/{orgId}/apiKeys/{keyId}`

Subcollection on each organization. One document per API key.

| Field       | Type                | Required | Notes                                                                                               |
| ----------- | ------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `id`        | `string`            | ✅       | Firestore auto-generated document ID                                                                |
| `orgId`     | `string`            | ✅       | Denormalized for `collectionGroup` queries                                                          |
| `name`      | `string`            | ✅       | User-provided label (e.g., "Production key") — collected on creation                                |
| `key`       | `string`            | ✅       | Full plaintext key `cmo_<32 alphanumeric>`. Deliberate plaintext storage (see spec Clarifications). |
| `maskedKey` | `string`            | ✅       | Computed on creation: `cmo_...` + last 4 chars of `key`. Used in list views.                        |
| `isRevoked` | `boolean`           | ✅       | `false` on creation; set to `true` on revocation. Never deleted — retained for audit trail.         |
| `revokedAt` | `Timestamp \| null` | ✅       | `null` until revoked                                                                                |
| `createdAt` | `Timestamp`         | ✅       | Server-set                                                                                          |

**Indexes**: Composite index on `(isRevoked ASC, createdAt DESC)` for list queries.

> **Dashboard KPI**: Total active keys uses `getCountFromServer` on this subcollection filtered by `isRevoked == false`.

---

### `/auditLog/{logId}`

Top-level collection. Append-only. One document per security event (FR-024).

| Field        | Type                     | Required | Notes                                                                                                                                                  |
| ------------ | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | `string`                 | ✅       | Firestore auto-generated document ID                                                                                                                   |
| `eventType`  | `AuditEventType` (enum)  | ✅       | `MAGIC_LINK_REQUEST`, `MAGIC_LINK_REDEEMED`, `API_KEY_CREATED`, `API_KEY_REVOKED`, `ACCOUNT_DELETED`, `API_KEY_USAGE_SUCCESS`, `API_KEY_USAGE_FAILURE` |
| `actorUid`   | `string \| null`         | ✅       | Firebase Auth UID of the actor; `null` for pre-auth events (e.g., magic link request before UID exists)                                                |
| `actorEmail` | `string \| null`         | ✅       | Email address of the actor; populated for pre-auth events where `actorUid` is unavailable                                                              |
| `orgId`      | `string \| null`         | ✅       | `null` for pre-auth events (magic link request); org ID otherwise                                                                                      |
| `outcome`    | `'success' \| 'failure'` | ✅       | Result of the event                                                                                                                                    |
| `reason`     | `string \| null`         | ✅       | Populated on `failure`; null on `success`                                                                                                              |
| `timestamp`  | `Timestamp`              | ✅       | Server-set; used for chart time-bucketing                                                                                                              |

**Indexes**: Composite index on `(orgId ASC, eventType ASC, timestamp ASC)` — required for dashboard metric queries (activity + error bar charts).

---

## TypeScript Domain Models

### `UserProfile` (`src/data/auth/models/user-profile.model.ts`)

```ts
export type OrgSize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  orgId: string;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `Organization` (`src/data/organizations/models/organization.model.ts`)

```ts
import type { OrgSize } from "../../auth/models/user-profile.model";

export interface Organization {
  id: string;
  name: string;
  size: OrgSize;
  ownerUid: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### `ApiKey` (`src/data/organizations/models/api-key.model.ts`)

```ts
export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  key: string; // plaintext; see spec Clarifications
  maskedKey: string; // cmo_...XXXX
  isRevoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
}
```

### `AuditLogEntry` (`src/data/organizations/models/audit-log-entry.model.ts`)

```ts
export type AuditEventType =
  | "MAGIC_LINK_REQUEST"
  | "MAGIC_LINK_REDEEMED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "ACCOUNT_DELETED"
  | "API_KEY_USAGE_SUCCESS"
  | "API_KEY_USAGE_FAILURE";

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  actorUid: string | null;
  actorEmail: string | null;
  orgId: string | null;
  outcome: "success" | "failure";
  reason: string | null;
  timestamp: Date;
}
```

---

## Zod DTOs

### `CompleteOnboardingDto` (`src/data/auth/dto/complete-onboarding-dto.ts`)

```ts
export const CompleteOnboardingSchema = z.object({
  displayName: z.string().min(2).max(100),
  orgName: z.string().min(1).max(200),
  orgSize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
});
export type CompleteOnboardingDto = z.infer<typeof CompleteOnboardingSchema>;
```

### `UpdateDisplayNameDto` (`src/data/auth/dto/update-display-name-dto.ts`)

```ts
export const UpdateDisplayNameSchema = z.object({
  displayName: z.string().min(2).max(100),
});
export type UpdateDisplayNameDto = z.infer<typeof UpdateDisplayNameSchema>;
```

### `DeleteAccountDto` (`src/data/auth/dto/delete-account-dto.ts`)

```ts
// No input fields needed — actor identity comes from WithContext
export const DeleteAccountSchema = z.object({});
export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;
```

### `UpdateOrganizationDto` (`src/data/organizations/dto/update-organization-dto.ts`)

```ts
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
});
export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;
```

### `CreateApiKeyDto` (`src/data/organizations/dto/create-api-key-dto.ts`)

```ts
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateApiKeyDto = z.infer<typeof CreateApiKeySchema>;
```

### `SendMagicLinkDto` (`src/data/auth/dto/send-magic-link-dto.ts`)

```ts
export const SendMagicLinkSchema = z.object({
  email: z.string().email(),
});
export type SendMagicLinkDto = z.infer<typeof SendMagicLinkSchema>;
```

### `GetDashboardMetricsDto` (`src/data/organizations/dto/dashboard-metrics-dto.ts`)

```ts
// No input fields needed — org context comes from WithContext
export const GetDashboardMetricsSchema = z.object({});
export type GetDashboardMetricsDto = z.infer<typeof GetDashboardMetricsSchema>;
```

### `ApiKeyDto` / `RevokeApiKeyDto` (`src/data/organizations/dto/api-key-dto.ts`)

```ts
export const ApiKeySchema = z.object({
  keyId: z.string().min(1),
});
export type ApiKeyDto = z.infer<typeof ApiKeySchema>;
```

### `RevokeApiKeyDto` (`src/data/organizations/dto/api-key-dto.ts`)

```ts
export const RevokeApiKeySchema = z.object({
  keyId: z.string().min(1),
});
export type RevokeApiKeyDto = z.infer<typeof RevokeApiKeySchema>;
```

---

## State Transitions

### UserProfile — Onboarding Gate

```
[Firebase Auth created]
       │
       ▼
 onboardingCompletedAt = null
       │
       │  CompleteOnboardingUseCase succeeds
       ▼
 onboardingCompletedAt = <Timestamp>  ──► all platform routes accessible
```

### ApiKey — Lifecycle

```
[CreateApiKeyUseCase]
       │
       ▼
  isRevoked = false  ──► appears in list (masked), counted in KPI
       │
       │  RevokeApiKeyUseCase succeeds
       ▼
  isRevoked = true, revokedAt = <Timestamp>
       │        ──► excluded from list and KPI count
       │        ──► key string still present for audit trail
       │        ──► API requests using this key are rejected
```

### AuditLog

Append-only. No state transitions. Documents are never updated or deleted.

---

## Validation Rules Summary

| Entity       | Field         | Rule                                        |
| ------------ | ------------- | ------------------------------------------- |
| UserProfile  | `displayName` | min 2, max 100 chars                        |
| UserProfile  | `email`       | valid email format (Firebase Auth enforces) |
| Organization | `name`        | min 1, max 200 chars                        |
| Organization | `size`        | must be one of the 5 defined enum values    |
| ApiKey       | `name`        | min 1, max 100 chars                        |
| ApiKey       | `key`         | system-generated; not user-supplied         |
| AuditLog     | all fields    | system-written; never user-supplied         |

---

## Required Firestore Indexes (to deploy)

| Collection                      | Fields                            | Order         |
| ------------------------------- | --------------------------------- | ------------- |
| `auditLog`                      | `orgId`, `eventType`, `timestamp` | ASC, ASC, ASC |
| `organizations/{orgId}/apiKeys` | `isRevoked`, `createdAt`          | ASC, DESC     |
