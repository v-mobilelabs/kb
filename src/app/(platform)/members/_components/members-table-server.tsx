import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableBody,
    TableColumn,
} from "@heroui/react";
import { listOrgMembersQuery } from "@/data/organizations/queries/list-members-query";
import type { MemberSortKey } from "@/data/organizations/schemas/member-schemas";
import type { BaseRole } from "@/data/organizations/models/org-membership.model";
import { MemberRow } from "./member-row";
import { MemberPagination } from "./member-pagination";

interface MembersTableServerProps {
    orgId: string;
    currentUid: string;
    sort: MemberSortKey;
    filterRole?: BaseRole;
    search?: string;
    cursor?: string;
}

export async function MembersTableServer({
    orgId,
    currentUid,
    sort,
    filterRole,
    search,
    cursor,
}: Readonly<MembersTableServerProps>) {
    const result = await listOrgMembersQuery(orgId, {
        sort,
        filterBaseRole: filterRole,
        searchEmail: search,
        limit: 25,
        cursor,
    });

    const members = result.ok ? result.value.items : [];
    const nextCursor = result.ok ? result.value.nextCursor : null;

    if (members.length === 0) {
        return (
            <div className="text-center py-16 text-foreground/40 text-sm">
                No members found.
            </div>
        );
    }

    return (
        <>
            <Table>
                <TableScrollContainer>
                    <TableContent aria-label="Organization members" selectionMode="none">
                        <TableHeader>
                            <TableColumn id="email" isRowHeader>Email</TableColumn>
                            <TableColumn id="role" className="w-28">Role</TableColumn>
                            <TableColumn id="joined" className="w-32">Joined</TableColumn>
                            <TableColumn id="last-active" className="w-32">Last Active</TableColumn>
                            <TableColumn id="actions" className="w-44 text-right">Actions</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {members.map((member) => (
                                <MemberRow key={member.id} member={member} currentUid={currentUid} />
                            ))}
                        </TableBody>
                    </TableContent>
                </TableScrollContainer>
            </Table>
            <MemberPagination currentCursor={cursor ?? null} nextCursor={nextCursor} count={members.length} />
        </>
    );
}
