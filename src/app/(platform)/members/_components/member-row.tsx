"use client";

import { Button, TableRow, TableCell, Chip } from "@heroui/react";
import type { OrgMembership, BaseRole } from "@/data/organizations/models/org-membership.model";
import { useMemberActions } from "./member-actions-provider";

interface MemberRowProps {
  member: OrgMembership;
  currentUid: string;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d));
}

const roleColors: Record<BaseRole, "warning" | "accent" | "default"> = {
  owner: "warning",
  admin: "accent",
  member: "default",
};

export function MemberRow({ member, currentUid }: Readonly<MemberRowProps>) {
  const { openRemove, openChangeRole } = useMemberActions();
  const isSelf = member.userId === currentUid;
  const isOwner = member.baseRole === "owner";

  return (
    <TableRow id={member.id}>
      <TableCell>
        <span className="text-sm font-medium truncate block">{member.email}</span>
      </TableCell>
      <TableCell>
        <Chip color={roleColors[member.baseRole]} size="sm" variant="soft">
          {member.baseRole}
        </Chip>
      </TableCell>
      <TableCell>
        <span className="text-xs text-foreground/50 whitespace-nowrap">
          {formatDate(member.joinedAt)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-foreground/50 whitespace-nowrap">
          {formatDate(member.lastActiveAt)}
        </span>
      </TableCell>
      <TableCell>
        {!isSelf && !isOwner && (
          <div className="flex gap-1 justify-end">
            {member.baseRole === "member" ? (
              <Button
                size="sm"
                variant="outline"
                onPress={() => openChangeRole(member, "admin")}
              >
                Promote
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onPress={() => openChangeRole(member, "member")}
              >
                Demote
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onPress={() => openRemove(member)}
            >
              Remove
            </Button>
          </div>
        )}
        {(isSelf || isOwner) && (
          <span className="text-xs text-foreground/30 text-right block">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
