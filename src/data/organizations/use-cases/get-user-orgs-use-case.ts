import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  GetUserOrgsSchema,
  type GetUserOrgsInput,
} from "@/data/organizations/schemas/member-schemas";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import type { OrgMembership } from "@/data/organizations/models/org-membership.model";

export class GetUserOrgsUseCase extends BaseUseCase<
  GetUserOrgsInput,
  OrgMembership[]
> {
  protected schema = GetUserOrgsSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    _input: z.infer<typeof GetUserOrgsSchema>,
  ): Promise<Result<OrgMembership[], AppError>> {
    return OrgMembershipRepository.findByUser(this.ctx.uid);
  }
}
