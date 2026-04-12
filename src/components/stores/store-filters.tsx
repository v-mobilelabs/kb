"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListBox, ListBoxItem, Select } from "@heroui/react";
import type { StoreSortKey } from "@/data/stores/dto/store-query-dto";

const SORT_OPTIONS: { value: StoreSortKey; label: string }[] = [
    { value: "createdAt_desc", label: "Newest first" },
    { value: "createdAt_asc", label: "Oldest first" },
    { value: "name_asc", label: "Name A → Z" },
    { value: "name_desc", label: "Name Z → A" },
];

interface StoreFiltersProps {
    q: string;
    sort: StoreSortKey;
}

export function StoreFilters({ q: initialQ, sort }: Readonly<StoreFiltersProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [searchInput, setSearchInput] = useState(initialQ);

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
        // Reset pagination when filters change
        params.delete("cursor");
        params.delete("history");
        router.replace(`${pathname}?${params.toString()}`);
    });

    useEffect(() => {
        const t = setTimeout(() => {
            updateParams.current({ q: searchInput || null });
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    function handleSortChange(key: string) {
        updateParams.current({ sort: key });
    }

    return (
        <div className="flex gap-3 items-center">
            <input
                type="search"
                placeholder="Search stores…"
                className="flex-1 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search stores"
                title="Search matches store names by prefix. Exact prefix required."
            />
            <Select.Root
                value={sort}
                onChange={(key) => handleSortChange(key as string)}
                aria-label="Sort stores"
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
