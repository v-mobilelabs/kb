import {
  Table,
  TableScrollContainer,
  TableContent,
  TableHeader,
  TableBody,
  TableColumn,
} from "@heroui/react";
import { listOrgMembersQuery } from "@/data/organizations/queries/list-members-query";
import { RemovedMemberRow } from "./removed-member-row";

interface RemovedMembersTableServerProps {
  orgId: string;
}

export async function RemovedMembersTableServer({
  orgId,
}: Readonly<RemovedMembersTableServerProps>) {
  const result = await listOrgMembersQuery(orgId, { includeDeleted: true, limit: 50 });
  const members = result.ok ? result.value.items : [];

  if (members.length === 0) {
    return (
      <div className="text-center py-16 text-foreground/40 text-sm">
        No removed members during grace period.
      </div>
    );
  }

  return (
    <Table>
      <TableScrollContainer>
        <TableContent aria-label="Removed members" selectionMode="none">
          <TableHeader>
            <TableColumn id="email" isRowHeader>Email</TableColumn>
            <TableColumn id="status" className="w-28">Status</TableColumn>
            <TableColumn id="removed" className="w-32">Removed</TableColumn>
            <TableColumn id="actions" className="w-28 text-right">Actions</TableColumn>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <RemovedMemberRow key={member.id} member={member} />
            ))}
          </TableBody>
        </TableContent>
      </TableScrollContainer>
    </Table>
  );
}
