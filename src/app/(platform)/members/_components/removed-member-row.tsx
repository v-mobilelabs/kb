"use client";

import { Button, TableRow, TableCell, Chip } from "@heroui/react";
import type { OrgMembership } from "@/data/organizations/models/org-membership.model";
import { useMemberActions } from "./member-actions-provider";

interface RemovedMemberRowProps {
  member: OrgMembership;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d));
}

export function RemovedMemberRow({ member }: Readonly<RemovedMemberRowProps>) {
  const { openRestore } = useMemberActions();

  return (
    <TableRow id={member.id}>
      <TableCell>
        <span className="text-sm font-medium text-foreground/60 truncate block">{member.email}</span>
      </TableCell>
      <TableCell>
        <Chip color="danger" size="sm" variant="soft">
          removed
        </Chip>
      </TableCell>
      <TableCell>
        <span className="text-xs text-foreground/50 whitespace-nowrap">
          {formatDate(member.deletedAt)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onPress={() => openRestore(member)}>
            Restore
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
