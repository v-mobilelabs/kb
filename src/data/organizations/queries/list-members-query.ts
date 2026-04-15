"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { orgMembersCacheTag } from "@/lib/cache-tags";
import { OrgMembershipRepository } from "@/data/organizations/repositories/org-membership-repository";
import type { MemberListPage } from "@/data/organizations/repositories/org-membership-repository";
import type { MemberSortKey } from "@/data/organizations/schemas/member-schemas";
import type { BaseRole } from "@/data/organizations/models/org-membership.model";
import type { AppError, Result } from "@/lib/result";
import { err, appError } from "@/lib/result";

export async function listOrgMembersQuery(
  orgId: string,
  options: {
    sort?: MemberSortKey;
    filterBaseRole?: BaseRole;
    searchEmail?: string;
    limit?: number;
    cursor?: string;
    includeDeleted?: boolean;
  } = {},
): Promise<Result<MemberListPage, AppError>> {
  "use cache";
  cacheTag(orgMembersCacheTag(orgId));
  cacheLife("minutes");

  try {
    const repo = new OrgMembershipRepository(orgId);
    if (options.includeDeleted) {
      return repo.findDeleted({ limit: options.limit, cursor: options.cursor });
    }
    return repo.findActive({
      sort: options.sort ?? "joinedAt_desc",
      filterBaseRole: options.filterBaseRole,
      searchEmail: options.searchEmail,
      limit: options.limit ?? 25,
      cursor: options.cursor,
    });
  } catch (e) {
    return err(appError("INTERNAL_ERROR", (e as Error).message));
  }
}
