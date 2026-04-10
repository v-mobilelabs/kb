"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, ListBox, ListBoxItem, Select } from "@heroui/react";
import type { Store } from "@/data/stores/models/store.model";
import type { StoreSortKey } from "@/data/stores/dto/store-query-dto";
import type { PaginatedResult } from "@/data/stores/repositories/store-repository";
import { StoreCard } from "./store-card";
import { StoreCreateForm } from "./store-create-form";

interface StoreListClientProps {
    orgId: string;
    initialStores: Store[];
    initialNextCursor: string | null;
}

const SORT_OPTIONS: { value: StoreSortKey; label: string }[] = [
    { value: "createdAt_desc", label: "Newest first" },
    { value: "createdAt_asc", label: "Oldest first" },
    { value: "name_asc", label: "Name A → Z" },
    { value: "name_desc", label: "Name Z → A" },
];

export function StoreListClient({
    orgId,
    initialStores,
    initialNextCursor,
}: StoreListClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const q = searchParams.get("q") ?? "";
    const sort = (searchParams.get("sort") ?? "createdAt_desc") as StoreSortKey;
    const cursor = searchParams.get("cursor");

    const [createOpen, setCreateOpen] = useState(false);
    const [debouncedQ, setDebouncedQ] = useState(q);
    const [searchInput, setSearchInput] = useState(q);
    const [cursorStack, setCursorStack] = useState<string[]>([]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

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

    // Keep a ref to updateParams to prevent re-fire on searchParams changes
    const updateParamsRef = useRef(updateParams);
    useLayoutEffect(() => {
        updateParamsRef.current = updateParams;
    });

    useEffect(() => {
        updateParamsRef.current({ q: debouncedQ || null });
    }, [debouncedQ]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["stores", orgId, sort, debouncedQ, cursor],
        queryFn: async () => {
            const params = new URLSearchParams({
                q: debouncedQ || "",
                sort,
                limit: "10",
            });
            if (cursor) {
                params.set("cursor", cursor);
            }

            const res = await fetch(`/api/stores?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch stores");
            return (await res.json()) as PaginatedResult<Store>;
        },
        initialData:
            !debouncedQ && !cursor && sort === "createdAt_desc"
                ? { items: initialStores, nextCursor: initialNextCursor }
                : undefined,
    });

    const stores = data?.items ?? [];
    const nextCursor = data?.nextCursor ?? null;

    const handleNextPage = useCallback(() => {
        if (nextCursor && cursor !== nextCursor) {
            setCursorStack((prev) => [...prev, cursor || ""]);
            updateParams({ cursor: nextCursor });
        }
    }, [nextCursor, cursor, updateParams]);

    const handlePrevPage = useCallback(() => {
        setCursorStack((prev) => {
            const newStack = [...prev];
            const prevCursor = newStack.pop();
            if (prevCursor !== undefined) {
                updateParams({ cursor: prevCursor || null });
            }
            return newStack;
        });
    }, [updateParams]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Stores</h1>
                <Button variant="primary" onPress={() => setCreateOpen(true)}>
                    New store
                </Button>
            </div>

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
                    onChange={(key) => {
                        setCursorStack([]);
                        updateParams({ sort: key as string, cursor: null });
                    }}
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

            {isLoading || isFetching ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-40 bg-foreground/10 rounded-xl" />
                    ))}
                </div>
            ) : stores.length === 0 && !debouncedQ ? (
                <div className="text-center py-16 text-foreground/50">
                    <p className="text-lg font-medium">No stores yet</p>
                    <p className="text-sm mt-1">Create your first store to get started.</p>
                    <Button
                        variant="primary"
                        className="mt-4"
                        onPress={() => setCreateOpen(true)}
                    >
                        New store
                    </Button>
                </div>
            ) : stores.length === 0 ? (
                <div className="text-center py-16 text-foreground/50">
                    <p className="text-lg font-medium">No stores match &ldquo;{debouncedQ}&rdquo;</p>
                    <p className="text-sm mt-1 mb-4">Name search matches by prefix only.</p>
                    <Button
                        variant="outline"
                        onPress={() => {
                            setSearchInput("");
                            setDebouncedQ("");
                            setCursorStack([]);
                        }}
                    >
                        Clear search
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stores.map((store) => (
                            <StoreCard key={store.id} store={store} orgId={orgId} />
                        ))}
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center justify-between mt-4">
                        <Button
                            variant="outline"
                            isDisabled={cursorStack.length === 0 || isFetching}
                            onPress={handlePrevPage}
                        >
                            ← Previous
                        </Button>
                        <span className="text-sm text-foreground/70">
                            {stores.length > 0 ? `Showing ${stores.length} stores` : "No stores"}
                        </span>
                        <Button
                            variant="outline"
                            isDisabled={!nextCursor || isFetching}
                            onPress={handleNextPage}
                        >
                            Next →
                        </Button>
                    </div>
                </>
            )}

            {createOpen && (
                <StoreCreateForm orgId={orgId} onClose={() => setCreateOpen(false)} />
            )}
        </div>
    );
}
