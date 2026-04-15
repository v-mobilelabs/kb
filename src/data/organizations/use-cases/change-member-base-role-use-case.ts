import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok, err, appError } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  ChangeMemberBaseRoleSchema,
  type ChangeMemberBaseRoleInput,
} from "@/data/organizations/schemas/member-schemas";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import { OrgAuditRepository } from "@/data/audit/repositories/org-audit-repository";
import { adminDb } from "@/lib/firebase/admin";

export class ChangeMemberBaseRoleUseCase extends BaseUseCase<
  ChangeMemberBaseRoleInput,
  { updated: true }
> {
  protected schema = ChangeMemberBaseRoleSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "ORG_MEMBER_BASE_ROLE_CHANGED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(
    input: z.infer<typeof ChangeMemberBaseRoleSchema>,
  ): Promise<Result<{ updated: true }, AppError>> {
    const { orgId, userId, newBaseRole } = input;

    if (orgId !== this.ctx.orgId) {
      return err(
        appError(
          "FORBIDDEN",
          "You can only manage members of your own organization",
        ),
      );
    }

    // Actor cannot change their own role
    if (userId === this.ctx.uid) {
      return err(appError("FORBIDDEN", "You cannot change your own role"));
    }

    const repo = new OrgMembershipRepository(orgId);

    // Validate actor is owner or admin
    const actorResult = await repo.findById(this.ctx.uid);
    if (!actorResult.ok || actorResult.value.deletedAt !== null) {
      return err(
        appError("FORBIDDEN", "You are not a member of this organization"),
      );
    }
    if (actorResult.value.baseRole === "member") {
      return err(
        appError(
          "FORBIDDEN",
          "Only org admins or owners can change member roles",
        ),
      );
    }

    // Fetch target membership
    const targetResult = await repo.findById(userId);
    if (!targetResult.ok || targetResult.value.deletedAt !== null) {
      return err(
        appError("NOT_FOUND", "Member not found in this organization"),
      );
    }
    const target = targetResult.value;

    // Cannot change owner's role
    if (target.baseRole === "owner") {
      return err(
        appError(
          "FORBIDDEN",
          "The organization owner's role cannot be changed",
        ),
      );
    }

    // No-op if role unchanged
    if (target.baseRole === newBaseRole) {
      return ok({ updated: true });
    }

    // If demoting the only admin, block
    if (target.baseRole === "admin" && newBaseRole === "member") {
      const ownerCount = await repo.countActiveByRole("owner");
      const adminCount = await repo.countActiveByRole("admin");
      if (adminCount <= 1 && ownerCount === 0) {
        return err(
          appError(
            "CONFLICT",
            "Cannot demote the last admin when there is no owner",
          ),
        );
      }
    }

    // Apply change
    await adminDb
      .collection(`organizations/${orgId}/memberships`)
      .doc(userId)
      .update({
        baseRole: newBaseRole,
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Write org-scoped audit entry
    const auditRepo = new OrgAuditRepository(orgId);
    await auditRepo.append({
      orgId,
      eventType: "ORG_MEMBER_BASE_ROLE_CHANGED",
      actorId: this.ctx.uid,
      actorEmail: this.ctx.email,
      affectedUserId: userId,
      affectedUserEmail: target.email,
      outcome: "success",
      reason: null,
      previousBaseRole: target.baseRole,
      newBaseRole,
      errorMessage: null,
      timestamp: new Date(),
    });

    return ok({ updated: true });
  }
}
