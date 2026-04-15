import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok, err, appError } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  RestoreOrgMemberSchema,
  type RestoreOrgMemberInput,
} from "@/data/organizations/schemas/member-schemas";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import { DeletionTaskRepository } from "@/data/organizations/repositories/deletion-task-repository";
import { OrgAuditRepository } from "@/data/audit/repositories/org-audit-repository";
import { adminDb } from "@/lib/firebase/admin";
import { clearSessionRevocation } from "@/lib/auth/session-revocation";

export class RestoreOrgMemberUseCase extends BaseUseCase<
  RestoreOrgMemberInput,
  { restored: true }
> {
  protected schema = RestoreOrgMemberSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "ORG_MEMBER_RESTORED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(
    input: z.infer<typeof RestoreOrgMemberSchema>,
  ): Promise<Result<{ restored: true }, AppError>> {
    const { orgId, userId } = input;

    if (orgId !== this.ctx.orgId) {
      return err(
        appError(
          "FORBIDDEN",
          "You can only manage members of your own organization",
        ),
      );
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
        appError("FORBIDDEN", "Only org admins or owners can restore members"),
      );
    }

    // Fetch soft-deleted membership
    const memberResult = await repo.findById(userId);
    if (!memberResult.ok) {
      return err(
        appError("NOT_FOUND", "Member not found in this organization"),
      );
    }
    const member = memberResult.value;
    if (member.deletedAt === null) {
      return err(
        appError(
          "CONFLICT",
          "Member is already active and has not been removed",
        ),
      );
    }

    // Restore: clear deletedAt and reset joinedAt
    await adminDb
      .collection(`organizations/${orgId}/memberships`)
      .doc(userId)
      .update({
        deletedAt: null,
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Cancel any pending deletion task
    const deletionRepo = new DeletionTaskRepository();
    const taskResult = await deletionRepo.findActivePendingByUser(
      orgId,
      userId,
    );
    if (taskResult.ok && taskResult.value !== null) {
      await deletionRepo.cancel(taskResult.value.id);
    }

    // Clear any active session revocation so the user can log in again
    void clearSessionRevocation(userId).catch(() => void 0);

    // Write org-scoped audit entry
    const auditRepo = new OrgAuditRepository(orgId);
    await auditRepo.append({
      orgId,
      eventType: "ORG_MEMBER_RESTORED",
      actorId: this.ctx.uid,
      actorEmail: this.ctx.email,
      affectedUserId: userId,
      affectedUserEmail: member.email,
      outcome: "success",
      reason: null,
      errorMessage: null,
      timestamp: new Date(),
    });

    return ok({ restored: true });
  }
}
