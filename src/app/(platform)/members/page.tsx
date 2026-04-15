import { Suspense } from "react";
import { getServerContext } from "@/lib/server-context";
import type { MemberSortKey } from "@/data/organizations/schemas/member-schemas";
import type { BaseRole } from "@/data/organizations/models/org-membership.model";
import { MembersPageClient } from "./_components/members-page-client";
import { MembersTableServer } from "./_components/members-table-server";
import { RemovedMembersTableServer } from "./_components/removed-members-table-server";
import MembersLoading from "./loading";

interface Props {
  searchParams: Promise<{
    sort?: string;
    role?: string;
    search?: string;
    cursor?: string;
    tab?: string;
  }>;
}

export default async function MembersPage({ searchParams }: Readonly<Props>) {
  const { orgId, uid } = await getServerContext();
  const params = await searchParams;

  const sort = (params.sort ?? "joinedAt_desc") as MemberSortKey;
  const role = (params.role ?? "") as BaseRole | "";
  const search = params.search ?? "";
  const cursor = params.cursor;
  const tab = params.tab ?? "active";

  return (
    <MembersPageClient
      orgId={orgId ?? ""}
      sort={sort}
      role={role}
      search={search}
      tab={tab}
    >
      {tab === "active" ? (
        <Suspense fallback={<MembersLoading />}>
          <MembersTableServer
            orgId={orgId ?? ""}
            currentUid={uid}
            sort={sort}
            filterRole={role || undefined}
            search={search || undefined}
            cursor={cursor}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<MembersLoading />}>
          <RemovedMembersTableServer orgId={orgId ?? ""} />
        </Suspense>
      )}
    </MembersPageClient>
  );
}
