import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, appError } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  ListOrgAuditSchema,
  type ListOrgAuditInput,
} from "@/data/organizations/schemas/member-schemas";
import {
  OrgAuditRepository,
  type OrgAuditPage,
} from "@/data/audit/repositories/org-audit-repository";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import type { OrgAuditEventType } from "@/data/audit/models/audit-log-entry.model";

export class ListOrgAuditUseCase extends BaseUseCase<
  ListOrgAuditInput,
  OrgAuditPage
> {
  protected schema = ListOrgAuditSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof ListOrgAuditSchema>,
  ): Promise<Result<OrgAuditPage, AppError>> {
    if (input.orgId !== this.ctx.orgId) {
      return err(
        appError(
          "FORBIDDEN",
          "You can only view audit logs for your own organization",
        ),
      );
    }

    // Verify actor is admin or owner (audit:read permission)
    const memberRepo = new OrgMembershipRepository(input.orgId);
    const actorResult = await memberRepo.findById(this.ctx.uid);
    if (!actorResult.ok || actorResult.value.deletedAt !== null) {
      return err(
        appError("FORBIDDEN", "You are not a member of this organization"),
      );
    }
    if (actorResult.value.baseRole === "member") {
      return err(
        appError(
          "FORBIDDEN",
          "Only org admins or owners can view the audit log",
        ),
      );
    }

    const auditRepo = new OrgAuditRepository(input.orgId);
    return auditRepo.findPaginated({
      sort: input.sort,
      filterEventType: input.filterEventType as OrgAuditEventType | undefined,
      filterActorId: input.filterActorId,
      filterAffectedUserId: input.filterAffectedUserId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}
