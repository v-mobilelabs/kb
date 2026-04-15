import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, err, appError } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  ListOrgMembersSchema,
  type ListOrgMembersInput,
} from "@/data/organizations/schemas/member-schemas";
import {
  OrgMembershipRepository,
  type MemberListPage,
} from "@/data/organizations/repositories/org-membership-repository";
import type { BaseRole } from "@/data/organizations/models/org-membership.model";

export class ListOrgMembersUseCase extends BaseUseCase<
  ListOrgMembersInput,
  MemberListPage
> {
  protected schema = ListOrgMembersSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof ListOrgMembersSchema>,
  ): Promise<Result<MemberListPage, AppError>> {
    if (input.orgId !== this.ctx.orgId) {
      return err(
        appError(
          "FORBIDDEN",
          "You can only list members of your own organization",
        ),
      );
    }

    const repo = new OrgMembershipRepository(input.orgId);

    if (input.includeDeleted) {
      return repo.findDeleted({ limit: input.limit, cursor: input.cursor });
    }

    return repo.findActive({
      sort: input.sort,
      searchEmail: input.searchEmail,
      filterBaseRole: input.filterBaseRole as BaseRole | undefined,
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}
