import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok, err, appError } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  AddOrgMemberSchema,
  type AddOrgMemberInput,
} from "@/data/organizations/schemas/member-schemas";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import { OrgAuditRepository } from "@/data/audit/repositories/org-audit-repository";
import { adminAuth } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";

export class AddOrgMemberUseCase extends BaseUseCase<
  AddOrgMemberInput,
  { userId: string; email: string; baseRole: string }
> {
  protected schema = AddOrgMemberSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "ORG_MEMBER_ADDED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(
    input: z.infer<typeof AddOrgMemberSchema>,
  ): Promise<
    Result<{ userId: string; email: string; baseRole: string }, AppError>
  > {
    const { orgId, email, baseRole } = input;

    if (orgId !== this.ctx.orgId) {
      return err(
        appError(
          "FORBIDDEN",
          "You can only manage members of your own organization",
        ),
      );
    }

    // Validate actor is admin or owner
    const repo = new OrgMembershipRepository(orgId);
    const actorResult = await repo.findById(this.ctx.uid);
    if (!actorResult.ok || actorResult.value.deletedAt !== null) {
      return err(
        appError("FORBIDDEN", "You are not a member of this organization"),
      );
    }
    const actor = actorResult.value;
    if (actor.baseRole === "member") {
      return err(
        appError("FORBIDDEN", "Only org admins or owners can add members"),
      );
    }

    // Lookup user by email in Firebase Auth
    let userId: string;
    let userEmail: string;
    try {
      const user = await adminAuth.getUserByEmail(email);
      userId = user.uid;
      userEmail = user.email || email;

      // Check if user is already a member
      const existingMember = await repo.findById(userId);
      if (existingMember.ok && existingMember.value.deletedAt === null) {
        return err(
          appError(
            "CONFLICT",
            `${email} is already a member of this organization`,
          ),
        );
      }

      // If user was previously deleted, prevent re-adding during grace period
      if (existingMember.ok && existingMember.value.deletedAt !== null) {
        return err(
          appError(
            "CONFLICT",
            `${email} is in the recovery period and cannot be re-added yet. Try again after the 30-day period.`,
          ),
        );
      }
    } catch (authError) {
      return err(
        appError(
          "NOT_FOUND",
          `User with email ${email} not found in this workspace`,
        ),
      );
    }

    // Create membership document
    try {
      await adminDb
        .collection(`organizations/${orgId}/memberships`)
        .doc(userId)
        .set({
          id: userId,
          orgId,
          userId,
          email: userEmail,
          baseRole,
          roleIds: [],
          joinedAt: Timestamp.now(),
          lastActiveAt: null,
          deletedAt: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    } catch (dbError) {
      return err(appError("INTERNAL_ERROR", (dbError as Error).message));
    }

    // Write org-scoped audit entry
    const auditRepo = new OrgAuditRepository(orgId);
    await auditRepo.append({
      orgId,
      eventType: "ORG_MEMBER_ADDED",
      actorId: this.ctx.uid,
      actorEmail: this.ctx.email,
      affectedUserId: userId,
      affectedUserEmail: userEmail,
      outcome: "success",
      reason: null,
      errorMessage: null,
      timestamp: new Date(),
    });

    return ok({ userId, email: userEmail, baseRole });
  }
}
