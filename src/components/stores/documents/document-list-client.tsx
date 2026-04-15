"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocumentAction } from "@/actions/document-actions";
import { useOptimisticListRemove } from "@/lib/hooks/use-optimistic-mutation";
import {
    ListBox, ListBoxItem, Select, Spinner,
    Table, TableScrollContainer, TableContent,
    TableHeader, TableColumn, TableBody, TableFooter,
    Skeleton,
} from "@heroui/react";
import type { SortDescriptor } from "react-aria-components";
import type { StoreDocument } from "@/data/stores/models/store-document.model";
import type { DocumentSortKey } from "@/data/stores/repositories/store-document-repository";
import { queryKeys } from "@/lib/query-keys";
import { DocumentRow } from "./document-row";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";

interface DocumentListClientProps {
    orgId: string;
    storeId: string;
    initialDocuments: StoreDocument[];
    initialNextCursor: string | null;
}

const LIMIT_PER_PAGE = 10;

type SortField = "name" | "created" | "updated";
type SortOrder = "asc" | "desc";

interface SortParams {
    sort: SortField;
    order: SortOrder;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "completed", label: "Ready" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Enriching" },
    { value: "failed", label: "Failed" },
];

/** Map split sort/order URL params → API combined sort key */
function toApiSortKey(sortField: SortField, order: SortOrder): DocumentSortKey {
    if (sortField === "name") return order === "asc" ? "name_asc" : "name_desc";
    if (sortField === "updated") return "updatedAt_desc";
    return order === "asc" ? "createdAt_asc" : "createdAt_desc";
}

/** Map HeroUI SortDescriptor → our sort field and order */
function toSortParams(desc: SortDescriptor | undefined): SortParams {
    if (!desc?.column) return { sort: "created", order: "desc" };
    const col = String(desc.column);
    const order = desc.direction === "ascending" ? "asc" : "desc";
    if (col === "name") return { sort: "name", order };
    if (col === "created") return { sort: "created", order };
    if (col === "updated") return { sort: "updated", order };
    return { sort: "created", order: "desc" };
}

/** Map sort field and order → HeroUI SortDescriptor */
function toSortDescriptor(sortField: SortField, orderDir: SortOrder): SortDescriptor {
    const columnMap: Record<SortField, string> = {
        name: "name",
        created: "created",
        updated: "updated",
    };
    const direction = orderDir === "asc" ? "ascending" : "descending";
    return { column: columnMap[sortField], direction };
}

export function DocumentListClient({
    orgId,
    storeId,
    initialDocuments,
    initialNextCursor,
}: Readonly<DocumentListClientProps>) {
    const searchParams = useSearchParams();

    // URL-driven state (standardized query params) — filters, sort, search only
    const q = searchParams.get("q") ?? "";
    const sort = (searchParams.get("sort") ?? "created") as SortField;
    const order = (searchParams.get("order") ?? "desc") as SortOrder;
    const status = searchParams.get("status") ?? "all";

    // Local state
    const [searchInput, setSearchInput] = useState(q);
    const [debouncedQ, setDebouncedQ] = useState(q);
    const [docToDelete, setDocToDelete] = useState<StoreDocument | null>(null);

    const queryClient = useQueryClient();

    // ── URL param helpers ─────────────────────────────────────────────────
    // Uses history.replaceState so filter/sort/search changes don't trigger RSC re-renders.
    const updateParams = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [k, v] of Object.entries(updates)) {
                if (v === null || v === "") params.delete(k);
                else params.set(k, v);
            }
            globalThis.history.replaceState(null, "", `?${params.toString()}`);
        },
        [searchParams],
    );

    const updateParamsRef = useRef(updateParams);
    useLayoutEffect(() => {
        updateParamsRef.current = updateParams;
    });

    // Debounce search input → q param
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        // When search changes, reset filters (no page reset needed)
        updateParamsRef.current({ q: debouncedQ || null });
    }, [debouncedQ]);

    // ── Scroll detection for infinite loading ────────────────────────────
    const observerTarget = useRef<HTMLDivElement>(null);
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── Data fetching (infinite scroll) ───────────────────────────────────
    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: queryKeys.documentsList(orgId, storeId, { sort, order, q: debouncedQ, status, limit: LIMIT_PER_PAGE }),
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams();
            if (debouncedQ) params.set("q", debouncedQ);
            params.set("sort", toApiSortKey(sort, order));
            if (status !== "all") params.set("status", status);
            if (pageParam) params.set("cursor", pageParam);
            params.set("limit", String(LIMIT_PER_PAGE));

            const res = await fetch(`/api/stores/${storeId}/documents?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch documents");
            const json = await res.json() as { documents: StoreDocument[]; nextCursor: string | null };
            return { items: json.documents, nextCursor: json.nextCursor };
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        getPreviousPageParam: () => undefined,
        initialData:
            !debouncedQ && !q && sort === "created" && order === "desc" && status === "all"
                ? {
                    pages: [{ items: initialDocuments, nextCursor: initialNextCursor }],
                    pageParams: [undefined],
                }
                : undefined,
    });

    // ── Debounced fetch to prevent rapid-fire requests ────────────────────
    const debouncedFetchNextPage = useCallback(() => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
            fetchNextPage();
        }, 200); // 200ms debounce
    }, [fetchNextPage]);

    useEffect(() => {
        return () => {
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        };
    }, []);

    // Infinite scroll — detect when user scrolls to bottom
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    debouncedFetchNextPage();
                }
            },
            { threshold: 0.5 }, // Higher threshold = triggers less frequently
        );
        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, debouncedFetchNextPage]);

    // Flatten pages into single array
    const allDocs = useMemo(() => {
        return data?.pages.flatMap((page) => page.items) ?? [];
    }, [data?.pages]);

    // ── Sort descriptor ───────────────────────────────────────────────────
    const sortDescriptor = useMemo(() => toSortDescriptor(sort, order), [sort, order]);

    function handleSortChange(desc: SortDescriptor) {
        const { sort: newSort, order: newOrder } = toSortParams(desc);
        updateParams({ sort: newSort === "created" ? null : newSort, order: newOrder === "desc" ? null : newOrder });
    }

    // ── Filter changes ────────────────────────────────────────────────────
    function handleStatusChange(value: string) {
        updateParams({ status: value === "all" ? null : value });
    }

    // ── Delete ────────────────────────────────────────────────────────────
    const deleteMutation = useMutation<
        unknown,
        Error,
        void
    >({
        mutationFn: () => deleteDocumentAction({ storeId: docToDelete!.storeId, docId: docToDelete!.id }),
        ...useOptimisticListRemove("documents", orgId, docToDelete?.storeId || "", docToDelete?.id || ""),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["store", docToDelete?.storeId] });
            setDocToDelete(null);
        },
    });

    async function handleDelete() {
        if (!docToDelete) return;
        deleteMutation.mutate();
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="bg-surface rounded-xl border border-foreground/10 p-4 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Documents</h3>
                {allDocs.length > 0 && (
                    <span className="text-xs text-foreground/60">{allDocs.length} documents</span>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <input
                    type="search"
                    placeholder="Search by name…"
                    className="flex-1 min-w-48 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label="Search documents"
                />
                <Select.Root
                    value={status}
                    onChange={(key) => handleStatusChange(key as string)}
                    aria-label="Filter by status"
                >
                    <Select.Trigger className="min-w-40">
                        <Select.Value />
                        <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                        <ListBox>
                            {STATUS_OPTIONS.map((o) => (
                                <ListBoxItem key={o.value} id={o.value} textValue={o.label}>
                                    {o.label}
                                </ListBoxItem>
                            ))}
                        </ListBox>
                    </Select.Popover>
                </Select.Root>
            </div>

            {/* Table */}
            {(() => {
                // Show loading skeleton when fetching initial data with no documents
                if (isLoading && allDocs.length === 0) {
                    return (
                        <Table>
                            <TableScrollContainer>
                                <TableContent aria-label="Documents loading">
                                    <TableHeader>
                                        <TableColumn id="name">Name</TableColumn>
                                        <TableColumn id="created">Created</TableColumn>
                                        <TableColumn id="updated">Updated</TableColumn>
                                        <TableColumn id="status">Status</TableColumn>
                                        <TableColumn id="actions"> </TableColumn>
                                    </TableHeader>
                                    <TableBody>
                                        {new Array(5).fill(null).map((_, i) => (

                                            <tr key={i}>
                                                <td><Skeleton className="h-3 w-24 rounded" /></td>
                                                <td><Skeleton className="h-3 w-20 rounded" /></td>
                                                <td><Skeleton className="h-3 w-20 rounded" /></td>
                                                <td><Skeleton className="h-3 w-16 rounded" /></td>
                                                <td><Skeleton className="h-3 w-12 rounded" /></td>
                                            </tr>
                                        ))}
                                    </TableBody>
                                </TableContent>
                            </TableScrollContainer>
                        </Table>
                    );
                }
                return (
                    <>
                        {allDocs.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-foreground/40">No documents found</p>
                                {(debouncedQ || status !== "all") && (
                                    <button
                                        className="text-xs text-accent mt-3 hover:underline"
                                        onClick={() => {
                                            setSearchInput("");
                                            setDebouncedQ("");
                                            updateParams({ q: null, status: null, sort: null, order: null });
                                        }}
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableScrollContainer>
                                    <TableContent
                                        aria-label="Documents"
                                        selectionMode="none"
                                        sortDescriptor={sortDescriptor}
                                        onSortChange={handleSortChange}
                                    >
                                        <TableHeader>
                                            <TableColumn id="name" allowsSorting isRowHeader>Name</TableColumn>
                                            <TableColumn id="updated" allowsSorting>Updated</TableColumn>
                                            <TableColumn id="status">Status</TableColumn>
                                            <TableColumn id="actions"> </TableColumn>
                                        </TableHeader>
                                        <TableBody>
                                            {allDocs.map((doc) => (
                                                <DocumentRow
                                                    key={doc.id}
                                                    doc={doc}
                                                    orgId={orgId}
                                                    onDeleteRequest={() => setDocToDelete(doc)}
                                                />
                                            ))}
                                        </TableBody>
                                    </TableContent>
                                </TableScrollContainer>
                                {(isFetchingNextPage || hasNextPage) && (
                                    <TableFooter className="flex items-center justify-center py-4">
                                        <div ref={observerTarget} className="text-center flex flex-col items-center gap-2">
                                            {isFetchingNextPage && <Spinner size="sm" />}
                                            <p className="text-xs text-foreground/40">
                                                {isFetchingNextPage ? "Loading more..." : "Scroll to load more"}
                                            </p>
                                        </div>
                                    </TableFooter>
                                )}
                            </Table>
                        )}
                    </>
                );
            })()}

            {docToDelete && (
                <ReusableConfirmModal
                    isOpen={true}
                    title="Delete document"
                    message={`Delete "${docToDelete.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={handleDelete}
                    onDismiss={() => setDocToDelete(null)}
                    isPending={deleteMutation.isPending}
                />
            )}
        </div>
    );
}
