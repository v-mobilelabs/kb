"use server";

import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { ListOrgMembersUseCase } from "@/data/organizations/use-cases/list-org-members-use-case";
import { AddOrgMemberUseCase } from "@/data/organizations/use-cases/add-org-member-use-case";
import { RemoveOrgMemberUseCase } from "@/data/organizations/use-cases/remove-org-member-use-case";
import { ChangeMemberBaseRoleUseCase } from "@/data/organizations/use-cases/change-member-base-role-use-case";
import { RestoreOrgMemberUseCase } from "@/data/organizations/use-cases/restore-org-member-use-case";
import { GetUserOrgsUseCase } from "@/data/organizations/use-cases/get-user-orgs-use-case";
import { ListOrgAuditUseCase } from "@/data/organizations/use-cases/list-org-audit-use-case";
import { orgMembersCacheTag, userOrgsCacheTag } from "@/lib/cache-tags";
import type { Result, AppError } from "@/lib/result";
import type { MemberListPage } from "@/data/organizations/repositories/org-membership-repository";
import type { OrgAuditPage } from "@/data/audit/repositories/org-audit-repository";
import type { OrgMembership } from "@/data/organizations/models/org-membership.model";

export async function listOrgMembersAction(
  rawInput: unknown,
): Promise<Result<MemberListPage, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ListOrgMembersUseCase(ctx);
    return uc.execute(rawInput);
  });
}

export async function addOrgMemberAction(
  rawInput: unknown,
): Promise<
  Result<{ userId: string; email: string; baseRole: string }, AppError>
> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new AddOrgMemberUseCase(ctx);
    const result = await uc.execute(rawInput);

    if (result.ok) {
      revalidateTag(orgMembersCacheTag(ctx.orgId), "max");
    }

    return result;
  });
}

export async function removeOrgMemberAction(
  rawInput: unknown,
): Promise<Result<{ removed: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new RemoveOrgMemberUseCase(ctx);
    const result = await uc.execute(rawInput);

    if (result.ok) {
      revalidateTag(orgMembersCacheTag(ctx.orgId), "max");
      revalidateTag(userOrgsCacheTag(ctx.uid), "max");
    }

    return result;
  });
}

export async function changeMemberBaseRoleAction(
  rawInput: unknown,
): Promise<Result<{ updated: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ChangeMemberBaseRoleUseCase(ctx);
    const result = await uc.execute(rawInput);

    if (result.ok) {
      revalidateTag(orgMembersCacheTag(ctx.orgId), "max");
    }

    return result;
  });
}

export async function restoreOrgMemberAction(
  rawInput: unknown,
): Promise<Result<{ restored: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new RestoreOrgMemberUseCase(ctx);
    const result = await uc.execute(rawInput);

    if (result.ok) {
      revalidateTag(orgMembersCacheTag(ctx.orgId), "max");
      revalidateTag(userOrgsCacheTag(ctx.uid), "max");
    }

    return result;
  });
}

export async function getUserOrgsAction(
  rawInput: unknown,
): Promise<Result<OrgMembership[], AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new GetUserOrgsUseCase(ctx);
    return uc.execute(rawInput);
  });
}

export async function listOrgAuditAction(
  rawInput: unknown,
): Promise<Result<OrgAuditPage, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ListOrgAuditUseCase(ctx);
    return uc.execute(rawInput);
  });
}
