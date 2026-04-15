"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListBox, ListBoxItem, Select } from "@heroui/react";
import type { MemberSortKey } from "@/data/organizations/schemas/member-schemas";

const SORT_OPTIONS: { value: MemberSortKey; label: string }[] = [
  { value: "joinedAt_desc", label: "Joined: newest first" },
  { value: "joinedAt_asc", label: "Joined: oldest first" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

interface MembersFiltersProps {
  search: string;
  sort: MemberSortKey;
  role: string;
}

export function MembersFilters({
  search: initialSearch,
  sort,
  role,
}: Readonly<MembersFiltersProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(initialSearch);

  const searchParamsRef = useRef(searchParams);
  useLayoutEffect(() => {
    searchParamsRef.current = searchParams;
  });

  const updateParams = useRef((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    params.delete("cursor");
    params.delete("history");
    router.replace(`${pathname}?${params.toString()}`);
  });

  useEffect(() => {
    const t = setTimeout(() => {
      updateParams.current({ search: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="flex gap-3 items-center">
      <input
        type="search"
        placeholder="Search by email…"
        className="flex-1 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        aria-label="Search members by email"
      />
      <Select.Root
        selectedKey={role}
        onSelectionChange={(key) => updateParams.current({ role: key as string || null })}
        aria-label="Filter by role"
      >
        <Select.Trigger className="min-w-32">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {ROLE_OPTIONS.map((o) => (
              <ListBoxItem key={o.value || "all"} id={o.value} textValue={o.label}>
                {o.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Select.Popover>
      </Select.Root>
      <Select.Root
        selectedKey={sort}
        onSelectionChange={(key) => updateParams.current({ sort: key as string })}
        aria-label="Sort members"
      >
        <Select.Trigger className="min-w-40">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {SORT_OPTIONS.map((o) => (
              <ListBoxItem key={o.value} id={o.value} textValue={o.label}>
                {o.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Select.Popover>
      </Select.Root>
    </div>
  );
}
