'use client'

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { queryKeys } from "@/lib/query-keys";
import type { File } from "@/data/files/models/file.model";
import { FileTable } from "./file-table";
import { FileSearchBox } from "./file-search-box";
import { FileSortControls } from "./file-sort-controls";
import { FileKindFilter } from "./file-kind-filter";
import { EmptyState } from "./empty-state";

interface FilesPage {
    files: File[];
    nextCursor: string | null;
    total: number;
}

async function fetchFilesPage(
    search: string,
    sort: string,
    order: string,
    kinds: string[],
    cursor: string | undefined,
): Promise<FilesPage> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("sort", sort);
    params.set("order", order);
    if (kinds.length > 0) params.set("kinds", kinds.join(","));
    if (cursor) params.set("cursor", cursor);
    params.set("limit", "25");

    const res = await fetch(`/api/files?${params.toString()}`);
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Failed to fetch files");
    }
    return res.json() as Promise<FilesPage>;
}

interface FileListClientProps {
    initialFiles: File[];
    initialNextCursor: string | null;
    orgId: string;
}

export function FileListClient({
    initialFiles,
    initialNextCursor,
    orgId,
}: Readonly<FileListClientProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Read URL-synced state (T037 — URL param roundtrip)
    const search = searchParams.get("search") ?? "";
    const sort = searchParams.get("sort") ?? "createdAt";
    const order = searchParams.get("order") ?? "desc";
    const kindsParam = searchParams.get("kinds") ?? "";
    const kinds = kindsParam ? kindsParam.split(",").filter(Boolean) : [];

    // Update a single URL param while resetting cursor
    const setParam = useCallback(
        (updates: Record<string, string | null>) => {
            const next = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(updates)) {
                if (value === null || value === "") {
                    next.delete(key);
                } else {
                    next.set(key, value);
                }
            }
            next.delete("cursor"); // reset cursor when any filter changes
            router.push(`${pathname}?${next.toString()}`);
        },
        [pathname, router, searchParams],
    );

    const filters = { search, sort, order, kinds: kinds.length > 0 ? kinds : undefined };

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
        useInfiniteQuery({
            queryKey: queryKeys.filesList(orgId, { search, sort, order, kinds }),
            queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
                fetchFilesPage(search, sort, order, kinds, pageParam),
            getNextPageParam: (lastPage: FilesPage) => lastPage.nextCursor ?? undefined,
            initialPageParam: undefined as string | undefined,
            initialData: {
                pages: [{ files: initialFiles, nextCursor: initialNextCursor, total: initialFiles.length }],
                pageParams: [undefined as string | undefined],
            },
            staleTime: 60 * 1000, // 1 min
        });

    // Sentinel ref for Intersection Observer (T033)
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    void fetchNextPage();
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allFiles = data?.pages.flatMap((p) => p.files) ?? [];
    const hasFilters = !!(search || kinds.length > 0);

    return (
        <div className="flex flex-col gap-4">
            {/* Filter / search bar */}
            <div className="flex flex-wrap items-start gap-3">
                <FileSearchBox
                    value={search}
                    onChange={(val) => setParam({ search: val || null })}
                />
                <FileSortControls
                    sort={sort}
                    order={order}
                    onChange={(newSort, newOrder) =>
                        setParam({ sort: newSort, order: newOrder })
                    }
                />
                <FileKindFilter
                    selected={kinds}
                    onChange={(newKinds) =>
                        setParam({ kinds: newKinds.join(",") || null })
                    }
                />
            </div>

            {/* File table or empty state */}
            {allFiles.length === 0 ? (
                <EmptyState hasFilters={hasFilters} />
            ) : (
                <>
                    <FileTable
                        files={allFiles}
                        onDeleted={() => void refetch()}
                    />

                    {/* Infinite scroll sentinel (T033) */}
                    <div ref={sentinelRef} className="flex justify-center py-4">
                        {isFetchingNextPage && <Spinner size="sm" />}
                        {!hasNextPage && allFiles.length > 0 && (
                            <p className="text-xs text-default-400">All files loaded</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
