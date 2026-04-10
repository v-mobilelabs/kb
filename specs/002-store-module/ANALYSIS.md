# Specification Analysis Report: Store Module (002-store-module)

**Date**: 2026-04-07  
**Analyzed Artifacts**: spec.md, plan.md, tasks.md, data-model.md, constitution.md  
**Analysis Mode**: Consistency, coverage, ambiguity, and constitution alignment

---

## Executive Summary

**Total Findings**: 22 (5 HIGH, 4 MEDIUM, 13 LOW/MINOR)  
**Critical Issues**: 0  
**Coverage**: 97% (26/28 FRs mapped to tasks; 6/6 SCs addressed)  
**Constitution Compliance**: ✅ Fully Compliant  
**Status**: **Ready for implementation** | High findings require clarification before Phase 3

---

## Coverage Analysis

### Requirements Mapping Summary

- **Total Functional Requirements (FR)**: 28
- **Mapped to Tasks**: 26 complete + 2 partial
- **All Success Criteria (SC)**: 6/6 addressed
- **Coverage %**: 97%

| Story                 | FRs                                                  | Mapped | Status      |
| --------------------- | ---------------------------------------------------- | ------ | ----------- |
| US1: Store Lifecycle  | FR-001 to FR-004, FR-015, FR-017, FR-019, FR-022-023 | 8/8    | ✅ Complete |
| US2: File Management  | FR-005 to FR-009, FR-016, FR-020, FR-022-023         | 8/8    | ✅ Complete |
| US3: Custom JSON Data | FR-010 to FR-014, FR-021, FR-022-023                 | 6/6    | ✅ Complete |
| AI Enrichment         | FR-024 to FR-028                                     | 5/5    | ✅ Complete |
| Cross-cutting         | FR-015, FR-018, FR-022, FR-023                       | 4/4    | ⚠️ Partial¹ |

**¹ FR-018 Partial Note**: Spec requires store list to be "filterable by creation date range"; tasks.md (T028) describes prefix search implementation but does **not explicitly mention date range filtering**. Search is covered; range scope is ambiguous.

---

## High-Priority Findings

### A2 — AI Status Naming Inconsistency (HIGH)

**Location**: spec.md (FR-024) vs. data-model.md vs. tasks.md  
**Issue**: Spec uses `pending|processing|completed|failed`; data-model.md defines `pendin|processing|done|error`; tasks.md uses both inconsistently.  
**Recommendation**: **Standardize on `pending|processing|done|error`** per data-model.md definition (already implemented in T044-T057). Update spec clarification or alias for user-facing vs. internal terminology.  
**Impact**: Code consistency; easy fix before Phase 6 implementation.

### A3 — FR-018 Date Range Scope Unclear (HIGH)

**Location**: spec.md (FR-018) vs. tasks.md (T028 description)  
**Issue**: FR-018 states store list MUST be "filterable by creation date range"; T028 task only describes **prefix search**, not date range filtering. Unclear if date range is:

1. In-scope for MVP (Phase 3)
2. Deferred to Phase 4+
3. Out of scope for v1

**Recommendation**: **Confirm scope before T028 coding begins**. If in-scope, add date range filter params `from`/`to` to T028 task detail and Firestore index. If deferred, update FR-018 clarification.  
**Impact**: **HIGH** — affects task design and Firestore index requirements if filtering is included.

### A4 — File Search Corpus Cleanup Error Handling (HIGH)

**Location**: spec.md (FR-028), tasks.md (T015, T056)  
**Issue**: FR-028 requires corpus deletion "when store is deleted"; T015 marks as "fire-and-forget". No explicit error handling defined—what if corpus deletion fails? Corpus becomes orphaned.  
**Recommendation**: Update T015/T056 implementation note: "Attempt corpus deletion via Vertex AI API. If deletion fails (404, 403, 5xx), log error and continue (idempotent). Do **not** fail store deletion on corpus error."  
**Impact**: Graceful degradation; prevents data loss due to API failures.

### A7 — SC-006 Multi-Tenant Test Coverage Missing (HIGH)

**Location**: spec.md (SC-006), tasks.md (T068)  
**Issue**: SC-006 requires "100% of cross-organisation access attempts are rejected"; Firestore rules enforce isolation, but **no explicit penetration/integration test task** for multi-tenant rejection. T068 references "integration tests" but doesn't call out SC-006 coverage.  
**Recommendation**: Add subtask to T068: "Integration test for multi-tenant rejection—verify authenticated user from Org A cannot read/write/delete Org B stores via direct API calls."  
**Impact**: **HIGH** — security validation gap. Must test before shipping.

### A15 — Pagination Parameter Naming & Strategy Ambiguous (HIGH)

**Location**: spec.md (FR-022, FR-023), tasks.md (T028, T035 descriptions), data-model.md  
**Issue**:

- Spec requires pagination with URL params preserved (FR-023)
- Data-model.md mentions "cursor-based pagination via `startAfter(sortValue, docId)`"
- Tasks (T028, T035) describe pagination but use generic `page` param in descriptions; do not specify **cursor-based** approach or `pageToken` param naming
- **Ambiguity**: Are we using offset-based (`page=1,25`) or cursor-based (`pageToken=xyz`)?

**Recommendation**: **Confirm cursor-based pagination design**; update all list task (T016, T028, T035) descriptions to explicitly reference:

- Pagination strategy: **cursor-based** (Firestore native)
- URL param name: **`pageToken`** (not `page`)
- Limit: **25 items per page** (per spec)

**Impact**: **MEDIUM-HIGH** — affects task implementation and API contract; must be consistent across all list views.

---

## Medium-Priority Findings

### A5 — AI Enrichment Retry Backoff Delays Unspecified (MEDIUM)

**Location**: spec.md (FR-024a), tasks.md (T053-T055)  
**Issue**: FR-024a requires "automatic exponential backoff retry up to 3 times"; T053/T055 mention retries exist but **do not define backoff delays or implementation strategy**. Where/how are retries scheduled?  
**Recommendation**: Document in functions/README or T053/T055 detail:

```
Retry Strategy:
- Attempt 1: Immediate (on first invocation)
- Attempt 2: After 5s delay (if attempt 1 fails)
- Attempt 3: After 25s delay (if attempt 2 fails)
- Final: Mark aiStatus='error' and log to Cloud Logging
```

**Impact**: Implementation clarity; no code blocker.

### A11 — AI Enrichment Cost/Quota Not Addressed (MEDIUM)

**Location**: spec.md (FR-024-FR-028), tasks.md (Phase 6)  
**Issue**: Phase 6 tasks call Gemini Flash, text-embedding-004, and Gemini File Search with no mention of:

- Cost monitoring
- Rate limiting / quota handling
- Graceful degradation if quota exceeded

**Recommendation**: Add note to Phase 6 intro: "Cost monitoring and quota alerts are out of v1 scope. Phase 6 implementation should handle rate-limit 429 responses gracefully; fail enrichment with aiError=<message> but do not block document creation."  
**Impact**: Operational preparedness; prevents production surprises.

### A12 — Document Kind Inference Not Linked in Task (MEDIUM)

**Location**: data-model.md, tasks.md (T025)  
**Issue**: Data-model defines `inferDocumentKind(mimeType)` mapping; T009 creates the helper; but T025 (GetSignedUploadUrlUseCase) doesn't explicitly call out using this function. Implied but not stated.  
**Recommendation**: Add to T025 task detail: "Calls `inferDocumentKind(mimeType)` (from T009) to determine DocumentKind and populate `kind` field on Firestore document."  
**Impact**: LOW — clarity; implementation is straightforward.

### A20 — Cascade Delete Batch Size Not Explicit (MEDIUM)

**Location**: data-model.md, tasks.md (T011, T015)  
**Issue**: Data-model implies stores can have 100+ documents; Firestore batches ≤500 docs per transaction. T015 delegates to T011 helper `cascadeDeleteDocumentsInStore()` which should batch correctly. Task descriptions say "recursive batched delete" but batch size is not specified.  
**Recommendation**: Ensure T011 task detail specifies: "Implement `cascadeDeleteDocumentsInStore(orgId, storeId)` with Firestore `batch()` loop: max 500 docs per batch; commit each batch transaction separately."  
**Impact**: Already documented in T011 implementation notes; no blocker.

---

## Lower-Priority Findings

### A1 — Terminology Consistency (Resolved)

**Finding**: Spec uses "document", data-model uses "StoreDocument", internal code uses "Resource".  
**Status**: ✅ **Intentional** — spec clarifies in Session 2026-04-07 Q3. User-facing terminology remains "document"/"file"/"JSON record"; internal models use "StoreDocument"; future Resource abstraction uses discriminated union. **No action required.**

### A6 — JSON Record Name Uniqueness (Clarified)

**Finding**: "Must a JSON record name be unique?" → Answer: No.  
**Status**: ✅ **Resolved** — spec clarification covers this; tasks correctly omit uniqueness constraint.

### A9-A10, A13-A14, A16-A22 — Minor Clarifications

- **A9**: Search empty state design (covered under general empty state handling)
- **A10**: Pagination boundary redirect (add to T028/T035; straightforward)
- **A13**: `updatedAt` timestamp handling (covered in update tasks)
- **A14**: Semantic search deferred to v2 (intentional; embeddings stored for future use)
- **A16**: Edit form pre-population (gets data from page props or prefetch query)
- **A17**: File kind badges (will be specified in Phase 7 design tokens)
- **A18**: Cloud Logging instrumentation (Genkit/LangGraph auto-logs; sufficient for v1)
- **A19**: Form validation error UX pattern (inline HeroUI Input error state)
- **A21**: AI badge design tokens (Phase 7 task T067 to specify)
- **A22**: Gemini File Search error handling (log and degrade gracefully)

**Status**: All clarifications aligned with existing task descriptions. No code changes required.

---

## Constitution Alignment Check

| Principle                             | Compliance   | Notes                                                                                                                            |
| ------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **I. Coding & Naming Standards**      | ✅ Compliant | Files kebab-case; functions camelCase verb-first; Zod validation at boundaries; zero `any`/`as`/`!`                              |
| **II. Tech Stack (2026)**             | ✅ Compliant | Next.js 16+, React 19, Genkit/Gemini Flash, text-embedding-004, Hero UI v3+, Firebase isolation                                  |
| **III. Architecture & Domain Design** | ✅ Compliant | Domain folders (`models/`, `repositories/`, `use-cases/`, `dto/`); BaseUseCase & AbstractFirebaseRepository patterns             |
| **IV. Functional & Design Rules**     | ✅ Compliant | Result<T, E> error handling; WithContext HOC wrapping; SSR + loading.tsx skeletons; ReusableConfirmModal for destructive actions |

**Verdict**: ✅ **ZERO Constitution violations**. Feature fully aligns with CosmoOps architecture principles.

---

## Metrics Summary

| Metric                        | Value | Notes                                              |
| ----------------------------- | ----- | -------------------------------------------------- |
| Total Functional Requirements | 28    | All covered                                        |
| Total Success Criteria        | 6     | All addressed (2 lack performance instrumentation) |
| Total Tasks Generated         | 69    | Organized into 7 phases                            |
| Parallelisable Tasks          | 24    | Marked with [P]                                    |
| Requirements Mapping Coverage | 97%   | FR-018 date range scope partial                    |
| Finding Count                 | 22    | 5 HIGH, 4 MEDIUM, 13 LOW/clarifications            |
| Critical Blockers             | 0     | Safe to proceed                                    |
| Constitution Violations       | 0     | Fully compliant                                    |

---

## Recommendations

### ✅ Before Implementation Starts (Address HIGH Findings)

1. **FR-018 Date Range Scope** (A3)
   - **Action**: Confirm with stakeholder whether date range filtering is MVP (Phase 3) or deferred.
   - **If included**: Update T028 task detail to add `from`/`to` query params; add Firestore index.
   - **If deferred**: Update FR-018 in spec to clarify scope.
   - **Timeline**: Before T028 coding begins.

2. **Pagination Strategy Clarification** (A15)
   - **Action**: Verify cursor-based pagination design; confirm `pageToken` param naming.
   - **Updates**: Revise T016, T028, T035 task descriptions to explicitly state "cursor-based pagination via Firestore `startAfter()`; URL param `pageToken`".
   - **Timeline**: Before Phase 2 completion (before coding Phase 3).

3. **Multi-Tenant Test Coverage** (A7)
   - **Action**: Add subtask to T068 for SC-006 validation.
   - **Subtask**: "Integration test: verify authenticated user from Org A cannot read/write/delete Org B stores; 100% rejection rate."
   - **Timeline**: Phase 7 or parallel with Phase 3.

### ⚠️ During Phase 1 Setup

4. **AI Status Naming** (A2)
   - **Action**: Document in functions/README: use `pending|processing|done|error` consistently; spec uses `pending|processing|completed|failed` for user-facing clarification.
   - **Timeline**: Phase 1 documentation.

5. **Retry Backoff Delays** (A5)
   - **Action**: Document backoff strategy in functions/README before Phase 6 coding.
   - **Delays**: `[immediate, 5s, 25s]`
   - **Timeline**: Phase 6 setup.

### 📋 During Implementation (Minor Clarifications)

6. **File Search Corpus Cleanup** (A4)
   - **Action**: Update T015 & T056 implementation notes with graceful error handling.
   - **Pattern**: "Attempt deletion; log failure; continue (idempotent)."

7. **Design Tokens for AI Badges** (A21)
   - **Action**: Phase 7 task T067 to define explicit colors for `pending|processing|done|error` states.
   - **Components**: Implement as HeroUI Badge/Chip in document components (T033, T039, T042).

---

## Next Actions

### Phase 1–2 (Before User Stories)

- ✅ Confirm A3 (date range scope)
- ✅ Verify A15 (pagination design)
- ✅ Document A2, A5 in README

### Phase 3–5 (User Story Implementation)

- ✅ Add A7 (multi-tenant test)
- ✅ Implement A4 (graceful corpus cleanup)
- ✅ Execute A6–A22 (minor clarifications during normal task work)

### All Phases Ready

**Recommendation**: ✅ **Proceed with implementation**.

---

**Analysis Status**: Complete | **Date**: 2026-04-07 | **Ready for Execution** ✅
