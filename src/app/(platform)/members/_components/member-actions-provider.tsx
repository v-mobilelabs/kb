"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { OrgMembership } from "@/data/organizations/models/org-membership.model";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import {
  removeOrgMemberAction,
  changeMemberBaseRoleAction,
  restoreOrgMemberAction,
} from "@/actions/org-member-actions";

interface MemberActionsContextValue {
  openRemove: (member: OrgMembership) => void;
  openChangeRole: (member: OrgMembership, newRole: "admin" | "member") => void;
  openRestore: (member: OrgMembership) => void;
}

const MemberActionsContext = createContext<MemberActionsContextValue>({
  openRemove: () => { },
  openChangeRole: () => { },
  openRestore: () => { },
});

export function useMemberActions() {
  return useContext(MemberActionsContext);
}

interface MemberActionsProviderProps {
  orgId: string;
  children: React.ReactNode;
}

export function MemberActionsProvider({
  orgId,
  children,
}: Readonly<MemberActionsProviderProps>) {
  const router = useRouter();
  const [memberToRemove, setMemberToRemove] = useState<OrgMembership | null>(null);
  const [memberToRestore, setMemberToRestore] = useState<OrgMembership | null>(null);
  const [roleChange, setRoleChange] = useState<{
    member: OrgMembership;
    newRole: "admin" | "member";
  } | null>(null);

  const removeMutation = useMutation({
    mutationFn: (member: OrgMembership) =>
      removeOrgMemberAction({ orgId, userId: member.userId }),
    onSuccess: (result) => {
      if (!result.ok) return;
      setMemberToRemove(null);
      router.refresh();
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({
      userId,
      newBaseRole,
    }: {
      userId: string;
      newBaseRole: "admin" | "member";
    }) => changeMemberBaseRoleAction({ orgId, userId, newBaseRole }),
    onSuccess: (result) => {
      if (!result.ok) return;
      setRoleChange(null);
      router.refresh();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (member: OrgMembership) =>
      restoreOrgMemberAction({ orgId, userId: member.userId }),
    onSuccess: (result) => {
      if (!result.ok) return;
      setMemberToRestore(null);
      router.refresh();
    },
  });

  const contextValue = useMemo(
    () => ({
      openRemove: setMemberToRemove,
      openChangeRole: (member: OrgMembership, newRole: "admin" | "member") =>
        setRoleChange({ member, newRole }),
      openRestore: setMemberToRestore,
    }),
    [],
  );

  return (
    <MemberActionsContext.Provider value={contextValue}>
      {children}

      <ReusableConfirmModal
        isOpen={!!memberToRemove}
        title="Remove member"
        message={`Remove ${memberToRemove?.email} from this organization? Their data will be scheduled for deletion after a 30-day grace period.`}
        confirmLabel="Remove"
        isPending={removeMutation.isPending}
        onConfirm={() =>
          memberToRemove && removeMutation.mutate(memberToRemove)
        }
        onDismiss={() => setMemberToRemove(null)}
      />

      <ReusableConfirmModal
        isOpen={!!roleChange}
        title={
          roleChange?.newRole === "admin" ? "Promote to Admin" : "Demote to Member"
        }
        message={
          roleChange?.newRole === "admin"
            ? `Promote ${roleChange?.member.email} to Admin? They will be able to manage members and API keys.`
            : `Demote ${roleChange?.member.email} to Member? They will lose admin privileges.`
        }
        confirmLabel={roleChange?.newRole === "admin" ? "Promote" : "Demote"}
        isPending={roleChangeMutation.isPending}
        onConfirm={() =>
          roleChange &&
          roleChangeMutation.mutate({
            userId: roleChange.member.userId,
            newBaseRole: roleChange.newRole,
          })
        }
        onDismiss={() => setRoleChange(null)}
      />

      <ReusableConfirmModal
        isOpen={!!memberToRestore}
        title="Restore member"
        message={`Restore ${memberToRestore?.email}? This will cancel their scheduled data deletion and re-activate their membership.`}
        confirmLabel="Restore"
        isPending={restoreMutation.isPending}
        onConfirm={() =>
          memberToRestore && restoreMutation.mutate(memberToRestore)
        }
        onDismiss={() => setMemberToRestore(null)}
      />
    </MemberActionsContext.Provider>
  );
}
