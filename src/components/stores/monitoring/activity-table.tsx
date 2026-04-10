"use client";

import { useCallback, useLayoutEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActivityEvent } from "@/data/stores/dto/store-monitoring-dto";
import type { ActivityPage } from "@/data/stores/use-cases/list-store-activity-use-case";
import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Modal,
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseTrigger,
    Select,
    ListBox,
    ListBoxItem,
    Chip,
    Spinner,
    TableFooter,
    Pagination,
    PaginationEllipsis,
} from "@heroui/react";
import { retryEnrichmentAction } from "@/actions/document-actions";

interface ActivityTableProps {
    readonly orgId: string;
    readonly storeId: string;
}

const STATUS_STYLES: Record<string, { color: "success" | "warning" | "danger" | "default"; }> = {
    enriched: { color: "success" },
    processing: { color: "warning" },
    added: { color: "default" },
    failed: { color: "danger" },
};

/** Builds the page number list with "ellipsis" gaps for large page counts. */
function buildPages(current: number, total: number): (number | "ellipsis")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | "ellipsis")[] = [1];

    const leftSibling = Math.max(2, current - 1);
    const rightSibling = Math.min(total - 1, current + 1);

    if (leftSibling > 2) pages.push("ellipsis");

    for (let p = leftSibling; p <= rightSibling; p++) pages.push(p);

    if (rightSibling < total - 1) pages.push("ellipsis");

    pages.push(total);
    return pages;
}

function formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ActivityTable({
    orgId,
    storeId,
}: Readonly<ActivityTableProps>) {
    const searchParams = useSearchParams();

    // URL-driven state — prefixed with "act" to avoid collisions with other tables
    const pageNum = Number.parseInt(searchParams.get("actpage") ?? "1", 10);
    const pageSize = Number.parseInt(searchParams.get("actsize") ?? "10", 10);
    const statusFilter = (searchParams.get("actstatus") ?? "") as "" | "enriched" | "failed" | "processing" | "added";

    const [searchInput, setSearchInput] = useState<string>("");

    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});
    const [errorModal, setErrorModal] = useState<{ name: string; message: string } | null>(null);
    const queryClient = useQueryClient();

    // ── URL param helpers ─────────────────────────────────────────────────
    // Uses window.history.replaceState instead of router.replace() so that
    // changing page/size params doesn't trigger a server-component re-render.
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

    // ── Data fetching — API called on every page/size/status change ─────────────
    const { data, isLoading } = useQuery<ActivityPage>({
        queryKey: ["store-activity", orgId, storeId, pageNum, pageSize, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(pageNum),
                limit: String(pageSize),
            });
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/stores/${storeId}/monitoring/activity?${params}`);
            if (!res.ok) throw new Error("Failed to fetch activity");
            return res.json() as Promise<ActivityPage>;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
        placeholderData: (prev) => prev,
    });

    const events: ActivityEvent[] = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // Client-side name filter (searches within the current page)
    const filteredEvents = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        if (!q) return events;
        return events.filter((e) => e.name.toLowerCase().includes(q));
    }, [events, searchInput]);

    const retryMutation = useMutation({
        mutationFn: (eventId: string, docId: string) => {
            setRetryingId(eventId);
            setRetryErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[eventId];
                return newErrors;
            });
            return retryEnrichmentAction(storeId, docId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["store-monitoring"] });
        },
        onError: (error: unknown, variables: [string, string]) => {
            const eventId = variables[0];
            setRetryErrors((prev) => ({
                ...prev,
                [eventId]: error instanceof Error ? error.message : "Unknown error",
            }));
        },
        onSettled: () => {
            setRetryingId(null);
        },
    });

    function handleRetry(event: ActivityEvent) {
        if (event.status !== "failed") return;
        retryMutation.mutate(event.id, event.documentId);
    }

    if (isLoading && !data) {
        return (
            <div className="bg-surface rounded-xl border border-foreground/10 p-6">
                <div className="flex items-center justify-center h-40">
                    <Spinner />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-surface rounded-xl border border-foreground/10 p-4 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Recent Activity</h3>
                    {total > 0 && (
                        <span className="text-xs text-foreground/60">{total} events</span>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        type="search"
                        placeholder="Search by name…"
                        className="flex-1 min-w-0 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.currentTarget.value)}
                        aria-label="Search by name"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {(["all", "enriched", "processing", "failed", "added"] as const).map((s) => {
                            const active = s === "all" ? statusFilter === "" : statusFilter === s;
                            const colorMap: Record<string, "success" | "warning" | "danger" | "default"> = {
                                enriched: "success",
                                processing: "warning",
                                failed: "danger",
                                added: "default",
                            };
                            return (
                                <Chip
                                    key={s}
                                    size="sm"
                                    color={s === "all" ? "default" : colorMap[s]}
                                    variant={active ? "primary" : "soft"}
                                    className="cursor-pointer capitalize select-none"
                                    onClick={() =>
                                        updateParamsRef.current({
                                            actstatus: s === "all" ? null : s,
                                            actpage: "1",
                                        })
                                    }
                                >
                                    {s === "all" ? "All" : s}
                                </Chip>
                            );
                        })}
                    </div>
                </div>

                {/* Table */}
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-foreground/40">No activity found</p>
                    </div>
                ) : (
                    <Table>
                        <TableScrollContainer>
                            <TableContent aria-label="Activity" selectionMode="none">
                                <TableHeader>
                                    <TableColumn id="name" isRowHeader>Document Name</TableColumn>
                                    <TableColumn id="status">Status</TableColumn>
                                    <TableColumn id="timestamp">Timestamp</TableColumn>
                                    <TableColumn id="actions"> </TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {filteredEvents.map((event) => {
                                        const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES.added;
                                        const retryError = retryErrors[event.id];
                                        const errorMessage = retryError || event.error;
                                        const isFailed = event.status === "failed";
                                        return (
                                            <TableRow key={`${event.id}-${event.timestamp}`}>
                                                <TableCell className="truncate max-w-xs">
                                                    <span className="truncate" title={event.name}>
                                                        {event.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="sm"
                                                        color={statusStyle.color}
                                                        className={isFailed ? "cursor-pointer" : undefined}
                                                        onClick={isFailed ? () => setErrorModal({
                                                            name: event.name,
                                                            message: errorMessage ?? "No error details available.",
                                                        }) : undefined}
                                                    >
                                                        {event.status}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell className="text-sm text-foreground/60 whitespace-nowrap">
                                                    {formatTime(event.timestamp)}
                                                </TableCell>
                                                <TableCell>
                                                    {isFailed && (
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="ghost"
                                                            onPress={() => handleRetry(event)}
                                                            aria-label="Retry enrichment"
                                                            isDisabled={retryingId === event.id}
                                                        >
                                                            {retryingId === event.id ? (
                                                                <Spinner size="sm" />
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                                    <path d="M3 3v5h5" />
                                                                </svg>
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </TableContent>
                        </TableScrollContainer>
                        <TableFooter className="flex flex-col gap-4 items-center sm:flex-row sm:justify-between">
                            <Select.Root
                                value={String(pageSize)}
                                onChange={(key) => {
                                    updateParamsRef.current({
                                        actsize: key as string,
                                        actpage: "1",
                                    });
                                }}
                                aria-label="Rows per page"
                            >
                                <Select.Trigger className="min-w-32">
                                    <Select.Value />
                                    <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                    <ListBox>
                                        <ListBoxItem key="5" id="5" textValue="5 rows">
                                            5 rows
                                        </ListBoxItem>
                                        <ListBoxItem key="10" id="10" textValue="10 rows">
                                            10 rows
                                        </ListBoxItem>
                                        <ListBoxItem key="20" id="20" textValue="20 rows">
                                            20 rows
                                        </ListBoxItem>
                                        <ListBoxItem key="50" id="50" textValue="50 rows">
                                            50 rows
                                        </ListBoxItem>
                                    </ListBox>
                                </Select.Popover>
                            </Select.Root>
                            {totalPages > 1 && (
                                <Pagination className="gap-2">
                                    <Pagination.Content>
                                        <Pagination.Item>
                                            <Pagination.Previous
                                                isDisabled={pageNum === 1}
                                                onClick={() =>
                                                    updateParamsRef.current({
                                                        actpage: String(Math.max(1, pageNum - 1)),
                                                    })
                                                }
                                            >
                                                <Pagination.PreviousIcon />
                                                <span>Previous</span>
                                            </Pagination.Previous>
                                        </Pagination.Item>

                                        {buildPages(pageNum, totalPages).map((item, idx) =>
                                            item === "ellipsis" ? (
                                                // eslint-disable-next-line react/no-array-index-key
                                                <Pagination.Item key={`ellipsis-${idx}`}>
                                                    <PaginationEllipsis />
                                                </Pagination.Item>
                                            ) : (
                                                <Pagination.Item key={item}>
                                                    <Pagination.Link
                                                        isActive={item === pageNum}
                                                        onClick={() =>
                                                            updateParamsRef.current({
                                                                actpage: String(item),
                                                            })
                                                        }
                                                    >
                                                        {item}
                                                    </Pagination.Link>
                                                </Pagination.Item>
                                            )
                                        )}

                                        <Pagination.Item>
                                            <Pagination.Next
                                                isDisabled={pageNum === totalPages}
                                                onClick={() =>
                                                    updateParamsRef.current({
                                                        actpage: String(Math.min(totalPages, pageNum + 1)),
                                                    })
                                                }
                                            >
                                                <span>Next</span>
                                                <Pagination.NextIcon />
                                            </Pagination.Next>
                                        </Pagination.Item>
                                    </Pagination.Content>
                                </Pagination>
                            )}
                        </TableFooter>
                    </Table>
                )}
            </div>

            {/* Error detail modal — shown when user clicks a failed status chip */}
            {errorModal && (
                <ModalBackdrop isOpen onOpenChange={(open) => { if (!open) setErrorModal(null); }} className="bg-foreground/20 backdrop-blur-sm">
                    <ModalContainer>
                        <ModalDialog aria-label="Enrichment Error">
                            <ModalHeader>Enrichment Error</ModalHeader>
                            <ModalBody className="py-4">
                                <p className="text-xs text-foreground/60 mb-1 font-medium">{errorModal?.name}</p>
                                <pre className="text-sm whitespace-pre-wrap wrap-break-word font-mono bg-danger/10 text-danger rounded-lg p-3">
                                    {errorModal?.message}
                                </pre>
                            </ModalBody>
                            <ModalFooter>
                                <ModalCloseTrigger>
                                    <Button variant="outline" size="sm" onPress={() => setErrorModal(null)}>
                                        Close
                                    </Button>
                                </ModalCloseTrigger>
                            </ModalFooter>
                        </ModalDialog>
                    </ModalContainer>
                </ModalBackdrop>
            )}
        </>
    );
}
