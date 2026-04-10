# Implementation Plan: Auth, Onboarding & Core Platform

**Branch**: `001-auth-onboarding-platform` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-auth-onboarding-platform/spec.md`

## Summary

Build the foundational CosmoOps platform: magic-link authentication via Firebase, a mandatory onboarding modal that creates a User profile (`/profiles/{id}`) and an Organization (`/organizations/{id}`), a Dashboard with KPI metrics (total active keys, key activity bar chart, error bar chart via Recharts), a Profile page (update display name, delete account with cascade), and a Settings page (update org name, manage org-scoped API keys with masked list + plaintext storage). All data access flows through `AbstractFirebaseRepository` → `BaseUseCase` → Server Actions / API routes wrapped in `WithContext`. Client state managed by TanStack Query with optimistic updates.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Framework**: Next.js 16+ (App Router), React 19 (Server Actions, `useActionState`)  
**Primary Dependencies**: Firebase Admin SDK (Session Cookies, Firestore, Auth — magic link), Firebase Client SDK (Auth state); TanStack Query v5; Hero UI v3+; Tailwind CSS v4; Recharts (activity + error bar charts); Zod (DTO validation); OpenTelemetry SDK (tracing via `BaseUseCase`)  
**Storage**: Cloud Firestore — `/profiles/{userId}` (top-level), `/organizations/{orgId}` (top-level), `/organizations/{orgId}/apiKeys/{keyId}` (subcollection); Firebase Auth (identity)  
**Charting**: Recharts — bar charts for key activity and errors over time; driven by Firestore aggregate queries  
**Testing**: Jest + React Testing Library (unit); Playwright (e2e auth flow)  
**Target Platform**: Web (modern browsers); mobile-first responsive  
**Project Type**: Web application (Next.js full-stack — SSR pages + Server Actions + API routes)  
**Performance Goals**: Dashboard primary content < 2 s; magic link email dispatch < 60 s p95; API key revocation effect < 1 s  
**Constraints**: Zero CLS (skeleton per route); max nesting level 2; cyclomatic complexity ≤ 8; no `any`/`as`/`!`; Firestore aggregate queries (count/sum) only — no client-side aggregation  
**Scale/Scope**: Single-tenant-per-user v1 (one org per user); API keys capped by Firestore subcollection limits (practical limit: hundreds per org)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Coding & Naming Standards**: All files use `kebab-case` with functional suffixes; functions use `camelCase` verb-first; max nesting level 2; cyclomatic complexity ≤ 8; no `any`/`as`/`!`; all external data validated via Zod DTOs at the boundary.
- [x] **II. Tech Stack**: Next.js 16+ App Router, React 19 Server Actions, Hero UI v3+, Tailwind v4, TanStack Query v5, Firebase Admin + Client SDK; strict multi-tenant Firestore isolation via `AbstractFirebaseRepository`. _(AI/Orchestration stack — LangGraph, Vercel AI SDK, Gemini — are not needed for this feature; no violation.)_
- [x] **III. Architecture & Domain Design**: Two domain folders — `/src/data/auth/` and `/src/data/organizations/` — each with `models/`, `repositories/`, `use-cases/`, `dto/`. All Use Cases extend `BaseUseCase`; all Repositories extend `AbstractFirebaseRepository`; data flow strictly `UI/Action → UseCase → Repository → Firestore`.
- [x] **IV. Functional & Design Rules**: Use Cases return `Result<T, E>`; all Server Actions and API routes wrapped in `WithContext` HOC; every route has a `loading.tsx` skeleton; design tokens in `lib/tokens.ts`; account deletion and API key revocation use `ReusableConfirmModal` with `danger` intent.

> No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-onboarding-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── server-actions.md
│   └── api-routes.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # Root layout (HTML, TanStack Query provider)
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx                  # Magic link login page (SSR)
│   │   │   └── loading.tsx               # Skeleton
│   │   └── error.tsx                     # Auth route group error boundary
│   ├── (platform)/                       # Authenticated layout group
│   │   ├── layout.tsx                    # Auth guard + WithContext provider
│   │   ├── error.tsx                     # Platform route group error boundary
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Dashboard (SSR)
│   │   │   └── loading.tsx               # Skeleton (KPI tiles + charts)
│   │   ├── profile/
│   │   │   ├── page.tsx                  # Profile page (SSR)
│   │   │   └── loading.tsx               # Skeleton
│   │   └── settings/
│   │       ├── page.tsx                  # Settings page (SSR)
│   │       └── loading.tsx               # Skeleton
│   └── api/
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts              # Magic link callback handler
│       └── dashboard/
│           └── metrics/
│               └── route.ts              # Dashboard KPI metrics endpoint
│
├── data/                                 # Clean Architecture domain layer
│   ├── auth/
│   │   ├── models/
│   │   │   └── user-profile.model.ts
│   │   ├── repositories/
│   │   │   └── user-profile-repository.ts
│   │   ├── use-cases/
│   │   │   ├── send-magic-link-use-case.ts
│   │   │   ├── complete-onboarding-use-case.ts
│   │   │   ├── update-display-name-use-case.ts
│   │   │   └── delete-account-use-case.ts
│   │   └── dto/
│   │       ├── send-magic-link-dto.ts
│   │       ├── complete-onboarding-dto.ts
│   │       ├── update-display-name-dto.ts
│   │       └── delete-account-dto.ts
│   │
│   └── organizations/
│       ├── models/
│       │   ├── organization.model.ts
│       │   ├── api-key.model.ts
│       │   └── audit-log-entry.model.ts
│       ├── repositories/
│       │   ├── organization-repository.ts
│       │   ├── api-key-repository.ts
│       │   └── audit-log-repository.ts
│       ├── use-cases/
│       │   ├── update-organization-use-case.ts
│       │   ├── create-api-key-use-case.ts
│       │   ├── list-api-keys-use-case.ts
│       │   ├── revoke-api-key-use-case.ts
│       │   └── get-dashboard-metrics-use-case.ts
│       └── dto/
│           ├── update-organization-dto.ts
│           ├── create-api-key-dto.ts
│           ├── api-key-dto.ts
│           └── dashboard-metrics-dto.ts
│
├── lib/
│   ├── abstractions/
│   │   ├── abstract-firebase-repository.ts   # CRUD + filter/sort/search/pagination + aggregate
│   │   └── base-use-case.ts                  # Zod validation + OTel tracing
│   ├── firebase/
│   │   ├── admin.ts                          # Firebase Admin SDK singleton
│   │   └── client.ts                         # Firebase Client SDK singleton
│   ├── middleware/
│   │   └── with-context.ts                   # HOC: auth check + workspace scope injection
│   ├── result.ts                             # Result<T, E> type
│   └── tokens.ts                             # Design tokens (spacing, radii, theme)
│
├── components/
│   ├── onboarding/
│   │   └── onboarding-modal.tsx
│   ├── dashboard/
│   │   ├── kpi-tile.tsx
│   │   ├── key-activity-chart.tsx            # Recharts bar chart
│   │   └── error-activity-chart.tsx          # Recharts bar chart
│   ├── settings/
│   │   ├── api-key-list.tsx
│   │   └── api-key-create-form.tsx
│   └── shared/
│       └── reusable-confirm-modal.tsx
│
└── actions/                              # React 19 Server Actions
    ├── auth-actions.ts                   # sendMagicLink, completeOnboarding
    ├── profile-actions.ts                # updateDisplayName, deleteAccount
    └── organization-actions.ts           # updateOrgName, createApiKey, revokeApiKey, listApiKeys
```

```text
src/middleware.ts                             # Next.js route guard (cookie presence check)
```

**Structure Decision**: Next.js full-stack App Router. Two domain folders (`auth`, `organizations`) under `/src/data/`. Shared abstractions (`AbstractFirebaseRepository`, `BaseUseCase`, `WithContext`, `Result<T,E>`) in `/src/lib/`. Server Actions in `/src/actions/` as the sole entry-point from UI to domain. API routes for the Firebase magic-link callback (`/api/auth/callback`) and dashboard metrics (`/api/dashboard/metrics`).

## Complexity Tracking

> No violations. No entries required.
