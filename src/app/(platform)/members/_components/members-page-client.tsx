"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import type { MemberSortKey } from "@/data/organizations/schemas/member-schemas";
import type { BaseRole } from "@/data/organizations/models/org-membership.model";
import { MemberActionsProvider } from "./member-actions-provider";
import { MembersFilters } from "./members-filters";
import { InviteMemberModal } from "./invite-member-modal";

interface MembersPageClientProps {
  orgId: string;
  sort: MemberSortKey;
  role: BaseRole | "";
  search: string;
  tab: string;
  children?: React.ReactNode;
}

function handleInviteSuccess() {
  // Reload page to refresh data
  if (typeof globalThis !== "undefined" && globalThis.location?.reload) {
    globalThis.location.reload();
  }
}

export function MembersPageClient({
  orgId,
  sort,
  role,
  search,
  tab,
  children,
}: Readonly<MembersPageClientProps>) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <MemberActionsProvider orgId={orgId}>
      <InviteMemberModal
        orgId={orgId}
        isOpen={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onSuccess={handleInviteSuccess}
      />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Members</h1>
          {tab === "active" && (
            <Button onPress={() => setIsInviteOpen(true)}>
              Invite Member
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-foreground/10">
          <TabLink href={`/members`} active={tab === "active"} label="Active" />
          <TabLink href={`/members?tab=removed`} active={tab === "removed"} label="Removed" />
        </div>

        {tab === "active" && <MembersFilters search={search} sort={sort} role={role} />}

        {children}
      </div>
    </MemberActionsProvider>
  );
}

function TabLink({
  href,
  active,
  label,
}: Readonly<{
  href: string;
  active: boolean;
  label: string;
}>) {
  return (
    <a
      href={href}
      className={[
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-accent text-accent"
          : "border-transparent text-foreground/50 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </a>
  );
}
