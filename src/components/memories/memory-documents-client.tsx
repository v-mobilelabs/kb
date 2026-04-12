"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, ListBox, ListBoxItem, Select, Switch } from "@heroui/react";
import type { MemoryDocumentSortKey } from "@/data/memories/schemas";
import { useMemoryDocumentsQuery } from "@/lib/hooks/use-memory-documents-query";
import { MemoryDocumentRow } from "./documents/memory-document-row";
import { MemoryDocumentsEmptyState } from "./documents/memory-documents-empty-state";
import { MemoryDocumentsSkeletonList } from "./documents/memory-documents-skeleton-list";
import { MemoryDocumentsSearchEmptyState } from "./documents/memory-documents-search-empty-state";

interface MemoryDocumentsClientProps {
    orgId: string;
    memoryId: string;
    initialSort: MemoryDocumentSortKey;
    initialSearch: string;
    initialIncludeCondensed: boolean;
}

const SORT_OPTIONS: { value: MemoryDocumentSortKey; label: string }[] = [
    { value: "createdAt_desc", label: "Newest first" },
    { value: "createdAt_asc", label: "Oldest first" },
    { value: "title_asc", label: "Title A → Z" },
    { value: "title_desc", label: "Title Z → A" },
    { value: "updatedAt_desc", label: "Last modified" },
    { value: "updatedAt_asc", label: "Oldest modified" },
];

export function MemoryDocumentsClient({
    orgId,
    memoryId,
    initialSort,
    initialSearch,
    initialIncludeCondensed,
}: Readonly<MemoryDocumentsClientProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const sort = (searchParams.get("sort") ?? initialSort) as MemoryDocumentSortKey;
    const q = searchParams.get("q") ?? initialSearch;
    const includeCondensed =
        (searchParams.get("includeCondensed") ?? String(initialIncludeCondensed)) !== "false";

    const [searchInput, setSearchInput] = useState(q);
    const [debouncedQ, setDebouncedQ] = useState(q);

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

    const updateParamsRef = useRef(updateParams);
    useLayoutEffect(() => {
        updateParamsRef.current = updateParams;
    });

    useEffect(() => {
        updateParamsRef.current({ q: debouncedQ || null });
    }, [debouncedQ]);

    const { data, isLoading, isFetching, hasNextPage, fetchNextPage } =
        useMemoryDocumentsQuery({
            orgId,
            memoryId,
            sort,
            search: debouncedQ,
            includeCondensed,
        });

    const documents = data?.pages.flatMap((p) => p.items) ?? [];

    return (
        <div className="flex flex-col gap-6">
            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
                <input
                    type="search"
                    placeholder="Search documents…"
                    className="flex-1 min-w-50 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    disabled={isLoading}
                    aria-label="Search memory documents"
                />
                <Select.Root
                    value={sort}
                    onChange={(key) => {
                        updateParams({ sort: key as string });
                    }}
                    aria-label="Sort documents"
                >
                    <Select.Trigger className="min-w-36">
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
                <div className="flex items-center gap-2">
                    <Switch
                        isSelected={includeCondensed}
                        onChange={(checked) => {
                            updateParams({
                                includeCondensed: checked ? null : "false",
                            });
                        }}
                        isDisabled={isLoading}
                        aria-label="Show AI summaries"
                    >
                        <Switch.Control>
                            <Switch.Thumb />
                        </Switch.Control>
                    </Switch>
                    <span className="text-xs text-foreground/60">AI summaries</span>
                </div>
            </div>

            {/* Document list */}
            {(() => {
                if (isLoading || isFetching) return <MemoryDocumentsSkeletonList />;
                if (documents.length === 0 && !debouncedQ) return <MemoryDocumentsEmptyState />;
                if (documents.length === 0) return (
                    <MemoryDocumentsSearchEmptyState
                        query={debouncedQ}
                        onClear={() => {
                            setSearchInput("");
                            setDebouncedQ("");
                        }}
                    />
                );
                return (
                    <>
                        <div className="flex flex-col gap-1">
                            {documents.map((doc) => (
                                <MemoryDocumentRow
                                    key={doc.id}
                                    document={doc}
                                    memoryId={memoryId}
                                />
                            ))}
                        </div>

                        {hasNextPage && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="outline"
                                    isDisabled={isFetching}
                                    onPress={() => fetchNextPage()}
                                >
                                    Load more
                                </Button>
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
