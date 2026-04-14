# User & Organization Management Module — Complete Package

**Module**: `006-users-organizations-module`  
**Status**: ✅ Ready for Implementation (2026-04-14)  
**Owner**: [Team Name]

---

## 📚 Package Contents

This specification package includes everything needed to plan, implement, and launch the User & Organization Management module for the CosmoOps Knowledge Base platform.

### Core Documents

| Document | Purpose | Audience | Time to Read |
| ---- | ---- | ---- | ---- |
| **[plan.md](plan.md)** | High-level feature overview, business goals, design decisions, and roadmap | Product, Exec, Team Leads | 20 min |
| **[spec.md](spec.md)** | Comprehensive functional & non-functional requirements, user scenarios, API endpoints, edge cases | Engineering, Product | 60 min |
| **[data-model.md](data-model.md)** | Firestore collections, TypeScript models, indexes, and database schema | Backend Engineers | 40 min |
| **[tasks.md](tasks.md)** | Sprint-by-sprint breakdown: 20 implementation tasks with estimates, dependencies, acceptance criteria | Engineering Leads, QA | 45 min |
| **[quickstart.md](quickstart.md)** | Developer quick-start guide: 5-min overview, file structure, phase-by-phase implementation workflow, code examples | Backend/Frontend Engineers | 30 min |

### Checklists & Planning

| Document | Purpose | When to Use |
| ---- | ---- | ---- |
| **[pre-implementation.md](checklists/pre-implementation.md)** | Pre-sprint checklist: docs review, environment setup, testing strategy, security review | Before sprint kickoff |

---

## 🎯 Quick Navigator

### For Product Managers & Stakeholders
1. Start with [plan.md](plan.md) → Business goals and design decisions
2. Review user personas and use cases in [plan.md](plan.md)
3. Check success metrics in [plan.md](plan.md) and [tasks.md](tasks.md)
4. Skip the technical details; focus on "Key Design Decisions" section

### For Engineering Leads & Architects
1. Read [plan.md](plan.md) for context and roadmap
2. Deep-dive into [spec.md](spec.md) for all requirements
3. Review [data-model.md](data-model.md) for schema and design
4. Use [tasks.md](tasks.md) to plan sprints and allocate work
5. Reference [pre-implementation.md](checklists/pre-implementation.md) for pre-launch readiness

### For Backend Engineers
1. Start with [quickstart.md](quickstart.md) for 5-min overview
2. Read [data-model.md](data-model.md) for Firestore schema
3. Reference [spec.md](spec.md) API sections for endpoint contracts
4. Use code snippets in [quickstart.md](quickstart.md) as starting templates
5. Follow tasks in [tasks.md](tasks.md) Phase 2-4 (API, Cloud Functions)

### For Frontend Engineers
1. Start with [quickstart.md](quickstart.md) for 5-min overview
2. Review user scenarios in [spec.md](spec.md) (User Story 1, 3, 4)
3. Check UI requirements in [spec.md](spec.md) Functional Requirements (FR-001 – FR-009, FR-023 – FR-030)
4. Use component structure in [quickstart.md](quickstart.md) as reference
5. Follow tasks in [tasks.md](tasks.md) Phase 3 (UI Components)

### For QA & Testing Teams
1. Review all User Scenarios in [spec.md](spec.md)
2. Study Edge Cases section in [spec.md](spec.md)
3. Review acceptance criteria for each task in [tasks.md](tasks.md)
4. Follow testing strategy in [pre-implementation.md](checklists/pre-implementation.md)
5. Use spec.md success criteria for test case setup

### For Security & Compliance Teams
1. Read "Key Design Decisions" section in [plan.md](plan.md) — especially soft-delete strategy
2. Review Data Model sections in [data-model.md](data-model.md) — audit logs and immutability
3. Check Firestore Security Rules pseudocode in [data-model.md](data-model.md)
4. Review "Security & Compliance" section in [pre-implementation.md](checklists/pre-implementation.md)
5. Verify audit log retention policies meet compliance requirements

---

## 📋 Feature Summary

### What Does This Module Do?

The User & Organization Management module provides organization admins with tools to:

1. **View Organization Members** → Searchable, sortable, paginated list of all users in organization
2. **Remove Members** → Soft-delete with 30-day grace period for recovery; cascade delete all org-scoped data
3. **Support Multi-Org** → Users can belong to multiple organizations and switch between them
4. **Manage Roles** → Promote/demote users to/from admin; granular permissions
5. **Audit & Compliance** → Immutable audit log of all user management actions

### Key Capabilities

- ✅ Immediate removal (soft-delete) + delayed hard-delete (grace period recovery)
- ✅ Cascade deletion of stores, API keys, custom data, files
- ✅ Session invalidation for removed users within 5 minutes
- ✅ Multi-organization membership with primary org preference
- ✅ Role-based access control (admin vs member)
- ✅ Immutable audit logging for compliance (SOC 2, GDPR)
- ✅ Scheduled background job for hard-delete cleanup
- ✅ Email notifications (offboarding, promotion, demotion)

### Problem It Solves

| Before | After |
| ---- | ---- |
| Admins have no visibility into org membership | Admins see complete member list with roles, join dates, activity |
| No way to remove users (risky to keep departed users) | Admins can safely remove users; 30-day recovery window provided |
| No support for multi-org workflows | Users can join multiple orgs and switch contexts seamlessly |
| No audit trail of who did what | Immutable audit log for compliance & investigations |
| Manual data cleanup required | Background job automatically hard-deletes after grace period |

---

## 🏗️ Architecture Overview

### High-Level Flow: User Removal

```
Admin clicks "Remove User"
    ↓
Confirmation modal: "2 stores, 1 API key will be deleted"
    ↓
Admin confirms
    ↓
[Atomic Transaction]
  1. Set deletedAt on membership
  2. Revoke all API keys (isRevoked=true)
  3. Soft-delete all stores (deletedAt set)
  4. Update org counts (memberCount--, adminCount--)
  5. Create audit log entry
  6. Create deletion task (scheduled for 30 days later)
    ↓
[Immediate Effects]
  1. User removed from list
  2. User's sessions invalidated
  3. Offboarding email sent (async)
    ↓
[After Grace Period (30 days)]
  Scheduled Cloud Function runs:
  1. Query deletion tasks due for hard-delete
  2. Hard-delete Firestore documents (stores, keys, data)
  3. Hard-delete Cloud Storage files
  4. Delete Gemini File Search indexes
  5. Mark deletion task as completed

[If User Re-Added Within Grace Period]
  1. Cancel deletion task
  2. Un-mark soft-deleted data (deletedAt → null)
  3. User's data recovered

[If User Removed by Mistake]
  1. Admin (via support) contacts team
  2. Team restores user: deletedAt → null, cancel deletion task
  3. All data intact, user regains access
```

### Data Model Highlights

**New Firestore Collections**:
- `organizations/{orgId}/memberships/{userId}` — tracks user-org relationships (role, join date, soft-delete status)
- `deletionTasks/{taskId}` — tracks scheduled hard-delete operations
- `organizations/{orgId}/auditLogs/{logId}` — immutable audit trail

**Modified Existing Collections**:
- `profiles/{userId}` — added concept of primary org
- `organizations/{orgId}` — added memberCount, adminCount, gracePeriodDays, notificationsEnabled

**Key Design Pattern**: Soft-delete first (immediate safety) → hard-delete later (recovery window)

---

## 📊 Metrics & Success Criteria

### Performance Targets
- User list query (10k members): < 500 ms
- User removal action: < 2 s
- Session invalidation: < 5 min
- Deletion job completion: < 24 h
- Audit log query: < 1 s

### Adoption Targets
- Admin adoption rate: > 80% of orgs
- Data recovery success (grace period): > 95%
- Accidental removal rate: < 1% (prevented by confirmation modal)

### Quality Targets
- Test coverage: 80%+ new code
- Integration test suite: all user stories covered
- Production error rate: < 0.1% for Cloud Functions

---

## 🗓️ Implementation Timeline

### Phase 1: Foundation (Week 1) — 2 days
- Set up Firestore collections, indexes, security rules
- Create TypeScript models and Zod schemas
- Backfill membership data from existing users
- **Deliverable**: Firestore schema ready; tests passing

### Phase 2: Core API (Week 1-2) — 3 days
- Implement server actions (list, remove, promote, demote, switch orgs)
- Add session invalidation on user removal
- Write integration tests
- **Deliverable**: All API endpoints working; tests passing

### Phase 3: UI Components (Week 2) — 3 days
- Build User Management page (table, filters, pagination)
- Create Remove User modal
- Build org switcher and role management UI
- **Deliverable**: UI fully functional; styled with HeroUI

### Phase 4: Cloud Functions & Background Jobs (Week 2-3) — 2 days
- Create scheduled deletion Cloud Function
- Implement email notifications
- Set up session invalidation broadcast
- **Deliverable**: Background jobs working; emails sending

### Phase 5: Testing & Launch (Week 3) — 2 days
- Integration tests (all workflows)
- Load testing (10k member orgs)
- Performance optimization if needed
- Feature flag setup and rollout plan
- **Deliverable**: Feature tested, ready for staged rollout

### **Total Effort**: ~12 days of development + 2-3 days of testing/QA

---

## 🚀 Rollout Strategy

1. **Feature Flag**: Start with `user_management_beta` disabled
2. **Week 1**: Deploy to staging; team tests all workflows
3. **Week 2**: Enable flag for 10% of orgs (beta users); monitor for errors
4. **Week 3**: Increase to 50%; gather feedback
5. **Week 4**: Increase to 100%; remove feature flag
6. **Ongoing**: Support & iterate on feedback

---

## ❓ Frequently Asked Questions

### Q: What happens to the user's global profile when they're removed from an org?
**A**: Their global profile remains unchanged. They can still access their auth account and join other organizations. Only org-specific data (stores, keys, access) is removed.

### Q: Can a user recover data within the grace period?
**A**: Yes! If the user is re-added to the org within 30 days (default), all soft-deleted data is restored and the hard-delete task is cancelled.

### Q: What if the last admin is removed by mistake?
**A**: The action is blocked by the system. You cannot remove the last admin from an org. Another member must be promoted to admin first.

### Q: Are audit logs ever deleted?
**A**: No. Audit logs are immutable and retained indefinitely for compliance. After 1 year, they may be archived to cold storage but are never hard-deleted.

### Q: How does multi-org membership work?
**A**: Users have a primary org (used for login landing). They can additionally belong to other orgs and switch between them via an org switcher. Switching org changes the app context but does NOT change their primary org.

### Q: What if the deletion job fails?
**A**: The task is retried up to 3 times with exponential backoff (1 min, 5 min, 30 min). If all retries fail, the task is marked as failed and surfaced to admins for manual investigation.

### Q: Can admins do bulk operations (remove multiple users at once)?
**A**: Not in v1. Bulk operations are deferred to v1.1 for safety (avoid mass removal mistakes).

### Q: What about SSO or directory sync?
**A**: Out of scope for v1. Users are currently added via admin action or magic link + org code. SSO/LDAP integration is a future feature.

---

## 🔗 Related Modules & Dependencies

This module is built on top of:

- **001-auth-onboarding-platform** (completed): Magic link auth, user profiles, organizations
- **002-store-module** (completed): Store schema; removal cascades to stores

This module is independent of:

- **003-memory-module**: User management doesn't interact with memories
- **004-files-module**: File management within stores (separate feature)
- **005-context-module**: Context management (separate feature; but cascaded deleted when user removed)

---

## 📞 Support & Questions

### Before Development Starts
- Have questions about requirements? → Review [spec.md](spec.md) Clarifications section
- Unclear about data model? → Review [data-model.md](data-model.md) with diagrams
- Need implementation examples? → Check [quickstart.md](quickstart.md) code snippets

### During Development
- Blocked on Firestore indexes? → Check Firebase Console; create indexes if missing
- Not sure about API contract? → Review [spec.md](spec.md) API sections
- Need debugging help? → Check [quickstart.md](quickstart.md) Troubleshooting section

### Pre-Launch
- Not ready for launch? → Check [pre-implementation.md](checklists/pre-implementation.md) for sign-off criteria
- Issues in staging? → Run through rollback checklist
- Need monitoring help? → Review monitoring section in [pre-implementation.md](checklists/pre-implementation.md)

---

## 📈 Metrics Dashboard (Template for Team)

Post-launch, track these metrics in a shared dashboard:

```
User Management Health Dashboard
├── Performance Metrics
│   ├── User list query latency (p50, p95, p99) → Target: < 500 ms
│   ├── User removal latency (p50, p95, p99) → Target: < 2 s
│   ├── Deletion job completion time → Target: < 24 h
│   └── Audit log query latency → Target: < 1 s
│
├── Reliability Metrics
│   ├── Cloud Function error rate → Target: < 0.1%
│   ├── Session invalidation success rate → Target: > 99%
│   ├── Deletion task completion rate → Target: > 95%
│   └── Email delivery success rate → Target: > 98%
│
├── Adoption & Usage
│   ├── % of orgs using user management → Target: > 80%
│   ├── % of orgs with > 1 removal → Target: > 50%
│   ├── Avg removals per org per month → Informational
│   └── Avg active admins per org → Informational
│
└── Quality & Incidents
    ├── Critical incidents → Target: 0
    ├── Data recovery incidents → Target: < 5 total
    ├── Accidental removals reported → Informational
    └── Support tickets related to this feature → Informational
```

---

## ✅ Implementation Readiness Checklist

Before kicking off development:

- [ ] All stakeholders read and agreed on [spec.md](spec.md)
- [ ] Team has Firebase project access and rights
- [ ] Firestore emulator running locally
- [ ] Cloud Functions, Cloud Scheduler enabled in project
- [ ] Email service(s) configured (SendGrid or similar)
- [ ] Feature flag infrastructure ready
- [ ] Monitoring & tracking configured
- [ ] Team trained on data model & architecture
- [ ] Sprint board populated with tasks from [tasks.md](tasks.md)
- [ ] Resource allocation complete (who owns which phase)
- [ ] Pre-implementation checklist reviewed: [pre-implementation.md](checklists/pre-implementation.md)

---

## 📄 Document Versions & History

| Version | Date | Author | Status |
| ---- | ---- | ---- | ---- |
| 1.0 | 2026-04-14 | [AI Assistant] | 📋 Final Draft → Ready for Review |

---

## 🎉 Next Steps

### For Product & Leadership
1. **Review & Approve** [plan.md](plan.md) (20 min)
2. **Confirm Success Metrics** align with product roadmap
3. **Approve Timeline** (5 weeks total: 3 dev + 2 QA/launch)
4. **Sign Off** on pre-implementation checklist

### For Engineering
1. **Review Complete Specification** ([spec.md](spec.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md))
2. **Populate Sprint Board** with tasks from [tasks.md](tasks.md)
3. **Assign Owners** to each phase (backend, frontend, QA, DevOps)
4. **Run Pre-Implementation Checklist** ([pre-implementation.md](checklists/pre-implementation.md))
5. **Kick Off Phase 1** (Firestore setup)

### For QA & Operations
1. **Understand Test Strategy** from [spec.md](spec.md) Edge Cases & Success Criteria
2. **Draft Test Plan** based on acceptance criteria in [tasks.md](tasks.md)
3. **Set Up Monitoring & Dashboards** (template at end of this document)
4. **Prepare Runbooks** for common operational issues (reference [pre-implementation.md](checklists/pre-implementation.md))
5. **Plan Feature Flag Rollout** (staging → 10% → 50% → 100%)

---

## 🏁 Summary

You now have everything needed to implement the User & Organization Management module:

✅ **Clear vision** (why we're building this)  
✅ **Detailed requirements** (what to build)  
✅ **Data model** (how data is structured)  
✅ **Implementation plan** (how to build it)  
✅ **Code examples** (where to start coding)  
✅ **Testing strategy** (how to verify it works)  
✅ **Launch plan** (how to roll out safely)  
✅ **Operational runbooks** (how to support it)  

**Ready to build? Start with [quickstart.md](quickstart.md) for developers or [pre-implementation.md](checklists/pre-implementation.md) for team leads. 🚀**
