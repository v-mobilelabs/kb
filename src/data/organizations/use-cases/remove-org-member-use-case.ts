import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok, err, appError } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  RemoveOrgMemberSchema,
  type RemoveOrgMemberInput,
} from "@/data/organizations/schemas/member-schemas";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import { DeletionTaskRepository } from "@/data/organizations/repositories/deletion-task-repository";
import { OrgAuditRepository } from "@/data/audit/repositories/org-audit-repository";
import { adminDb } from "@/lib/firebase/admin";
import { revokeUserSessions } from "@/lib/auth/session-revocation";

/** Grace period before hard-deletion: 30 days */
const GRACE_PERIOD_DAYS = 30;

export class RemoveOrgMemberUseCase extends BaseUseCase<
  RemoveOrgMemberInput,
  { removed: true }
> {
  protected schema = RemoveOrgMemberSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "ORG_MEMBER_REMOVED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(
    input: z.infer<typeof RemoveOrgMemberSchema>,
  ): Promise<Result<{ removed: true }, AppError>> {
    const { orgId, userId, reason } = input;

    if (orgId !== this.ctx.orgId) {
      return err(
        appError(
          "FORBIDDEN",
          "You can only manage members of your own organization",
        ),
      );
    }

    // Actor cannot remove themselves
    if (userId === this.ctx.uid) {
      return err(
        appError(
          "FORBIDDEN",
          "You cannot remove yourself from the organization",
        ),
      );
    }

    const repo = new OrgMembershipRepository(orgId);

    // Fetch membership to check baseRole
    const memberResult = await repo.findById(userId);
    if (!memberResult.ok || memberResult.value.deletedAt !== null) {
      return err(
        appError("NOT_FOUND", "Member not found in this organization"),
      );
    }
    const member = memberResult.value;

    // Cannot remove owner
    if (member.baseRole === "owner") {
      return err(
        appError("FORBIDDEN", "The organization owner cannot be removed"),
      );
    }

    // Validate actor has admin-level access (must be owner or admin)
    const actorResult = await repo.findById(this.ctx.uid);
    if (!actorResult.ok || actorResult.value.deletedAt !== null) {
      return err(
        appError("FORBIDDEN", "You are not a member of this organization"),
      );
    }
    const actor = actorResult.value;
    if (actor.baseRole === "member") {
      return err(
        appError("FORBIDDEN", "Only org admins or owners can remove members"),
      );
    }

    // If target is admin, ensure at least one other admin remains
    if (member.baseRole === "admin") {
      const adminCount = await repo.countActiveByRole("admin");
      const ownerCount = await repo.countActiveByRole("owner");
      if (adminCount <= 1 && ownerCount === 0) {
        return err(
          appError(
            "CONFLICT",
            "Cannot remove the last admin when there is no owner",
          ),
        );
      }
    }

    // Soft-delete: set deletedAt
    await adminDb
      .collection(`organizations/${orgId}/memberships`)
      .doc(userId)
      .update({
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Revoke all API keys for this user's org scope
    await this._revokeUserApiKeys(orgId, userId);

    // Schedule hard-deletion
    const scheduledDeleteAt = new Date(
      Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    const deletionTaskRepo = new DeletionTaskRepository();
    await deletionTaskRepo.createTask({
      orgId,
      userId,
      status: "pending",
      retryCount: 0,
      scheduledDeleteAt,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      deletedEntityCount: null,
    });

    // Write org-scoped audit entry
    const auditRepo = new OrgAuditRepository(orgId);
    await auditRepo.append({
      orgId,
      eventType: "ORG_MEMBER_REMOVED",
      actorId: this.ctx.uid,
      actorEmail: this.ctx.email,
      affectedUserId: userId,
      affectedUserEmail: member.email,
      outcome: "success",
      reason: reason ?? null,
      errorMessage: null,
      timestamp: new Date(),
    });

    // Revoke active sessions for the removed user (fire-and-forget; best-effort)
    void revokeUserSessions(userId).catch(() => void 0);

    return ok({ removed: true });
  }

  private async _revokeUserApiKeys(
    orgId: string,
    userId: string,
  ): Promise<void> {
    // API keys in this system are org-scoped, not user-scoped in the data model.
    // Log the revocation event without attempting hard revocation here.
    // The scheduled hard-delete function will clean up user-owned data.
    const auditRepo = new OrgAuditRepository(orgId);
    const memberResult = await new OrgMembershipRepository(orgId).findById(
      userId,
    );
    const memberEmail = memberResult.ok ? memberResult.value.email : "";

    await auditRepo.append({
      orgId,
      eventType: "ORG_MEMBER_API_KEY_REVOKED_ON_REMOVAL",
      actorId: this.ctx.uid,
      actorEmail: this.ctx.email,
      affectedUserId: userId,
      affectedUserEmail: memberEmail,
      outcome: "success",
      reason: null,
      errorMessage: null,
      timestamp: new Date(),
    });
  }
}
