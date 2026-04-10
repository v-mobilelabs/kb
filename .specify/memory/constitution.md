<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Modified principles:
  - III. Architecture & Domain Design — added CQRS Exception for read-only query functions
Added sections: N/A
Removed sections: N/A
Templates updated:
  - .specify/templates/plan-template.md ✅ (no structural changes required)
  - .specify/templates/spec-template.md ✅ (no structural changes required)
  - .specify/templates/tasks-template.md ✅ (no structural changes required)
Follow-up TODOs: None.
-->

# CosmoOps Constitution

## Core Principles

### I. Coding & Naming Standards

_Enforcing consistency to reduce cognitive load and enhance AI-assisted development._

- File names MUST use `kebab-case` with functional suffixes (e.g., `interview-repository.ts`, `auth-use-case.ts`).
- Function names MUST use `camelCase` with a verb-first convention (e.g., `generateInterviewReport`).
- Code MUST maintain zero deep nesting: maximum indentation level is **2**. Guard Clauses MUST be used to exit early and keep the happy path flat.
- Cyclomatic Complexity MUST NOT exceed **8** per function.
- Type Safety is absolute: `any`, `as`, and non-null assertion `!` are forbidden. All external data MUST be validated via **Zod DTOs** at the system boundary.

**Rationale**: Uniform naming and structural constraints reduce cognitive load, improve AI code-completion accuracy, and make code review deterministic and automatable.

---

### II. Tech Stack (2026 Standards)

_Utilizing the latest stable versions for high-performance AI orchestration._

- **Framework**: Next.js 16+ (App Router); React 19 with Server Actions and `useActionState`.
- **AI/Orchestration**:
  - LangGraph MUST be used for complex agentic workflows.
  - Vercel AI SDK MUST be used for streaming and tool calling.
  - Gemini 3.1 (Lite, Flash, Pro) via Vertex AI is the designated LLM provider.
  - **RAG Strategy**: Firestore Vector for metadata retrieval; Gemini File Search for document-heavy context.
- **UI/UX**: Hero UI v3+ with Tailwind CSS v4 (Container-first styling).
- **Data/Auth**: TanStack Query v5; Firebase Admin SDK (Session Cookies); Firebase Client SDK (Auth State).
- **Multi-Tenancy**: Firebase data model MUST enforce strict multi-tenant isolation at every layer.

**Rationale**: A fixed, versioned stack ensures reproducible builds, predictable AI behavior, and eliminates version drift across the team.

---

### III. Architecture & Domain Design

_A rigid Clean Architecture ensuring business logic is decoupled from infrastructure._

- **Source Root**: `/src/data/` organized by domain folders (e.g., `/data/knowledge`, `/data/agents`).
- **Domain Folder Structure**: Each domain folder MUST contain exactly these sub-directories:
  - `models/` — Domain entities and interfaces.
  - `repositories/` — Data access logic, extending `AbstractFirebaseRepository`.
  - `use-cases/` — Application-specific business rules, extending `BaseUseCase`.
  - `dto/` — Data Transfer Objects and Zod validation schemas.
- **Abstraction Rules**:
  - All Use Cases MUST extend `BaseUseCase` (provides Zod validation and OpenTelemetry tracing via the abstract class).
  - All Repositories MUST extend `AbstractFirebaseRepository` (provides CRUD operations and automatic multi-tenant scoping).
- **Data Flow**: `UI / Action / API` → `UseCase` → `Repository` → `DB / External Services`. No layer MAY be bypassed (see CQRS Exception below).
- **CQRS Exception**: Read-only query functions MAY reside in a `queries/` sub-directory within a domain folder, bypassing the UseCase layer. Query functions MUST NOT perform mutations, side-effects, or audit logging. They receive pre-validated parameters from route handlers or SSR pages. This exception exists because `BaseUseCase` is designed for commands (validation, audit, rate-limit) which are unnecessary overhead for cached reads.
- **File Handling**: Files MUST be uploaded to Firebase Storage and programmatically indexed into Gemini File Search for retrieval.

**Rationale**: Clean Architecture enforces unidirectional dependency flow, makes business logic independently testable, and ensures infrastructure details never bleed into domain logic.

---

### IV. Functional & Design Rules

_Ensuring a reliable, performant, and safe user experience._

- **Error Handling**: Use Cases MUST return a `Result<T, E>` object. Throwing business errors is forbidden; exceptions are reserved for catastrophic infrastructure failures only.
- **Global Middleware**: A `WithContext` HOC MUST wrap all API routes and Server Actions to inject Authentication, Workspace Scopes, and Global Error Handling.
- **SSR & Performance**: All pages are Server-Side Rendered (SSR) by default. A `loading.tsx` with skeletons matching the exact page layout MUST be provided per route to achieve Zero CLS (Cumulative Layout Shift).
- **Design System**:
  - Layout MUST follow the 60-30-10 color rule: 60% primary base, 30% secondary surface, 10% accent.
  - All UIs MUST be mobile-first with adaptive continuity across all screen sizes.
  - All spacing, radii, and theme tokens MUST reside in `lib/tokens.ts`. Inline overrides are forbidden.
- **Safety**: All destructive actions (Delete/Reset) MUST present a `ReusableConfirmModal` with the `danger` color intent before execution.

**Rationale**: Consistent error patterns, enforced middleware, and centralized design tokens reduce runtime failures, ensure visual consistency, and prevent accidental data loss.

---

## Governance

This constitution supersedes all prior conventions and style guides. Any deviation MUST be documented and approved before implementation begins. Amendments follow semantic versioning:

- **MAJOR**: Backward-incompatible principle removal or redefinition.
- **MINOR**: New principle or section added, or existing guidance materially expanded.
- **PATCH**: Clarifications, wording fixes, or non-semantic refinements.

All pull requests MUST include a Constitution Check verifying compliance with all four principles. Complexity violations MUST be justified in the plan's Complexity Tracking table. A compliance review MUST be performed before any feature branch is merged to `main`.

**Version**: 1.1.0 | **Ratified**: 2026-04-05 | **Last Amended**: 2026-04-07
