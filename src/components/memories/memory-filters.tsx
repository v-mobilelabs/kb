"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListBox, ListBoxItem, Select } from "@heroui/react";
import type { MemorySortKey } from "@/data/memories/schemas";

const SORT_OPTIONS: { value: MemorySortKey; label: string }[] = [
    { value: "createdAt_desc", label: "Newest first" },
    { value: "createdAt_asc", label: "Oldest first" },
];

export function MemoryFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const sort = (searchParams.get("sort") ?? "createdAt_desc") as MemorySortKey;
    const q = searchParams.get("q") ?? "";

    const [searchInput, setSearchInput] = useState(q);

    const updateParams = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [k, v] of Object.entries(updates)) {
                if (v === null || v === "") params.delete(k);
                else params.set(k, v);
            }
            router.replace(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    const updateParamsRef = useRef(updateParams);
    useLayoutEffect(() => {
        updateParamsRef.current = updateParams;
    });

    useEffect(() => {
        const t = setTimeout(() => {
            updateParamsRef.current({ q: searchInput || null });
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    return (
        <div className="flex gap-3 items-center">
            <input
                type="search"
                placeholder="Search memories…"
                className="flex-1 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search memories"
            />
            <Select.Root
                value={sort}
                onChange={(key) => {
                    updateParams({ sort: key as string });
                }}
                aria-label="Sort memories"
            >
                <Select.Trigger className="min-w-32">
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
