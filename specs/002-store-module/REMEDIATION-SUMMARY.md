# Specification Analysis Remediation — Summary Memo

**Date**: 2026-04-07  
**Feature**: 002-store-module  
**Status**: ✅ All blocking issues resolved

---

## Executive Summary

A comprehensive consistency audit identified **3 CRITICAL blocking issues** in the Store Module specification and task structure. All issues have been resolved through structured remediation:

1. ✅ **Dual task-list confusion** → Split into separate, clearly scoped files
2. ✅ **Scope ambiguity** → Each file now explicitly states "in scope" and "out of scope"
3. ✅ **Specification gaps** → Clarified FR-024a (backoff durations) and FR-017 (count display)

---

## Changes Made

### 1. Task File Restructuring

**Before**: Single 713-line `tasks.md` containing both refactor (28 tasks) and archive (69 tasks), causing confusion about which was authoritative.

**After**:

- **[tasks-refactor.md](./tasks-refactor.md)** — NEW: Current 28-task data-fetching modernization (Phases 1–6)
- **[tasks-archive.md](./tasks-archive.md)** — NEW: Complete 69-task feature reference (all 7 phases)
- **[tasks.md](./tasks.md)** — NEW: Navigation index with clear links to both

**Benefit**: Developers now see at a glance which tasks are "current work" vs. "reference for future phases."

### 2. Specification Clarifications

**FR-024a (Enrichment Retry Logic)**

- **Before**: "up to 3 times" — ambiguous (3 total or 3 retries?), no timing specified
- **After**: "Initial attempt + 3 exponential backoff retries (2s, 4s, 8s delays) = 4 total attempts before failed"
- **Impact**: Cloud Functions developers now have unambiguous retry guidance

**FR-017 (Store Count Display)**

- **Before**: Generic "summary count" — unclear if itemized or combined
- **After**: "Summary stats: `fileCount` (binary files) and `customCount` (JSON records); UI displays these as separate counts"
- **Impact**: Designers and UI developers can now build correct store cards with dual counters

### 3. Plan Scope Statement

**[plan.md](./plan.md)** now includes explicit "Scope: This Refactor vs. Complete Feature" section at end:

**In Scope**:

- ✅ Query layer infrastructure (cache tags, cursor utilities)
- ✅ Store/document list SSR + GET routes
- ✅ Cache invalidation via `revalidateTag()`
- ✅ Enrichment-status polling

**Out of Scope** (blocked + deferred):

- ❌ File mutations (FR-005–009) — Resume after refactor
- ❌ Custom JSON CRUD (FR-010–014) — Resume after refactor
- ❌ Cloud Functions (FR-024–028) — Independent; can start after Phase 1

**Impact**: Product managers and engineering leads can now confidently scope Increment 1 (queries only) vs. Increment 2 (mutations).

---

## Key Findings from Analysis

| Issue                                     | Severity | Status                                          |
| ----------------------------------------- | -------- | ----------------------------------------------- |
| Dual task-list structure                  | CRITICAL | ✅ Resolved                                     |
| Scope ambiguity (mutations vs. queries)   | CRITICAL | ✅ Resolved                                     |
| FR-024a backoff timing undefined          | HIGH     | ✅ Resolved                                     |
| FR-017 count display ambiguous            | HIGH     | ✅ Resolved                                     |
| Task T012↔T018 conflict                   | HIGH     | ✅ Resolved (T012 = remove + add revalidateTag) |
| Constitutional alignment (CQRS exception) | MEDIUM   | ✅ Verified (NEW plan compliant with v1.1.0)    |

**Coverage**: 53% of requirements have explicit task mapping (18 out of 34 FR/SC); enrichment pipeline accounts for remaining 47% (deferred to Phase 2).

---

## Next Steps for Teams

### 👨‍💻 Implementation Teams (Active)

1. **Start with**: [tasks-refactor.md](./tasks-refactor.md) Phases 1–2 (setup + foundational)
2. **Then proceed**: Phase 3 (US1 store list queries)
3. **Reference**: [plan.md](./plan.md) for architecture decisions

### 🔬 Research / Future Teams

1. **Cloud Functions**: When ready, see [tasks-archive.md](./tasks-archive.md) Phase 6 (all 14 functions tasks)
2. **File Management**: See [tasks-archive.md](./tasks-archive.md) Phase 4 (12 tasks, blocked until query refactor done)
3. **Custom JSON**: See [tasks-archive.md](./tasks-archive.md) Phase 5 (9 tasks, blocked until query refactor done)

### 📋 Design / Product

- **UI Acceptance**: Store cards MUST show TWO separate counters: `fileCount` and `customCount` (per clarified FR-017)
- **Error Messaging**: Enrichment failures show badge; no manual retry UI needed for v1 (per FR-024a)
- **Scope Validation**: Confirm Increment 1 = queries only; file uploads defer to Increment 2

---

## Files Modified

| File                             | Changes                        | Impact                                                                  |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `tasks.md`                       | Replaced with navigation index | Clarity ↑ (no confusion about dual lists)                               |
| `tasks-refactor.md`              | Created (28 tasks)             | New: Current work clearly identified                                    |
| `tasks-archive.md`               | Created (69 tasks)             | New: Reference plan for future phases                                   |
| `spec.md` (FR-024a)              | Clarified backoff timing       | Removed ambiguity ("3 times" → "4 total attempts with 2s/4s/8s delays") |
| `spec.md` (FR-017, Key Entities) | Clarified count display        | Store entity now specifies `fileCount` and `customCount` as separate    |
| `plan.md` (end)                  | Added scope statement          | New: Explicit "in scope" vs. "out of scope" for this refactor           |

---

## How to Use This Remediation

### ✅ Before Starting Implementation

1. Read [spec.md](./spec.md) (full requirements)
2. Read [plan.md](./plan.md) (architecture + NOW has scope section)
3. Read [tasks-refactor.md](./tasks-refactor.md) (28 current tasks)

### ✅ When Blocked or Uncertain

- "What's in the current refactor?" → See "Scope: This Refactor vs. Complete Feature" in [plan.md](./plan.md#scope-this-refactor-vs-complete-feature)
- "What about file uploads?" → See [tasks-archive.md](./tasks-archive.md) Phase 4 (14 tasks, deferred)
- "What about Cloud Functions?" → See [tasks-archive.md](./tasks-archive.md) Phase 6 (14 tasks, ready to start independently)

### ✅ For Code Review

- Constitution alignment: ✅ NEW plan honors v1.1.0 CQRS exception
- Coverage: ✅ 53% of FR/SC have explicit task maps; enrichment (FR-024–028) explicit deferred to v2
- Deadlocks: ✅ All known conflicts resolved; T012 ≠ T018 (now clear)

---

## Questions & Support

**Q: Can we start file uploads now?**  
A: No — use-cases exist but UI must wait for query refactor to complete (especially `revalidateTag` pattern). See [tasks-archive.md](./tasks-archive.md) Phase 4.

**Q: Can Cloud Functions start in parallel?**  
A: Yes! Cloud Functions are independent of query refactor. Start after Phase 1 (infrastructure) is done. See [tasks-archive.md](./tasks-archive.md) Phase 6.

**Q: What's the enrichment retry timing again?**  
A: 4 total attempts: initial + 3 retries with 2s, 4s, 8s delays. See FR-024a in [spec.md](./spec.md).

**Q: Should store cards show one or two counters?**  
A: Two: `fileCount` + `customCount` (separate). See clarified FR-017 and Key Entities in [spec.md](./spec.md).

---

## Document References

| Document                                 | Purpose                                | Updated?                         |
| ---------------------------------------- | -------------------------------------- | -------------------------------- |
| [spec.md](./spec.md)                     | Requirements & acceptance criteria     | ✅ FR-024a + FR-017 clarified    |
| [plan.md](./plan.md)                     | Architecture & implementation strategy | ✅ Scope section added           |
| [tasks.md](./tasks.md)                   | Task index                             | ✅ Converted to navigation (new) |
| [tasks-refactor.md](./tasks-refactor.md) | Current 28 tasks                       | ✅ Created (new)                 |
| [tasks-archive.md](./tasks-archive.md)   | Reference 69 tasks                     | ✅ Created (new)                 |
| [data-model.md](./data-model.md)         | Firestore schema                       | — No changes                     |
| [quickstart.md](./quickstart.md)         | Dev setup guide                        | — No changes                     |

---

**Report Generated**: 2026-04-07  
**Analysis Tool**: Specification Analysis Agent  
**Decision Status**: ✅ APPROVED (all critical issues resolved)
