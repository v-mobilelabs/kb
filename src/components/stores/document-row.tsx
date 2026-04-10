"use client";

import { Button, TableRow, TableCell } from "@heroui/react";
import type { StoreDocument, DocumentKind } from "@/data/stores/models/store-document.model";
import { retryEnrichmentAction } from "@/actions/document-actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

const KIND_COLORS: Record<DocumentKind, string> = {
    file: "bg-accent/10 text-accent",
    data: "bg-success/10 text-success",
    node: "bg-foreground/5 text-foreground/60",
};

function getStatusAndKeywords(resource: StoreDocument) {
    if (resource.kind === "file") {
        return { status: resource.status, keywords: resource.keywords ?? [] };
    }
    if (resource.kind === "data") {
        return { status: resource.status, keywords: resource.keywords ?? [] };
    }
    return { status: "completed" as const, keywords: [] as string[] };
}

function StatusBadge({ resource }: Readonly<{ resource: StoreDocument }>) {
    const { status } = getStatusAndKeywords(resource);

    const configs: Record<string, { label: string; cls: string }> = {
        pending: { label: "Pending", cls: "bg-foreground/5 text-foreground/40" },
        processing: { label: "Enriching", cls: "bg-warning/10 text-warning" },
        completed: { label: "Ready", cls: "bg-success/10 text-success" },
        failed: { label: "Failed", cls: "bg-danger/10 text-danger" },
    };
    const { label, cls } = configs[status] ?? configs.pending;
    return (
        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${cls}`}>{label}</span>
    );
}

interface DocumentRowProps {
    doc: StoreDocument;
    orgId: string;
    onDeleteRequest: () => void;
}

export function DocumentRow({ doc, orgId, onDeleteRequest }: Readonly<DocumentRowProps>) {
    const queryClient = useQueryClient();

    const retryMutation = useMutation({
        mutationFn: () => retryEnrichmentAction(doc.storeId, doc.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents", orgId, doc.storeId] });
        },
    });

    function handleRetry() {
        retryMutation.mutate();
    }

    const viewerHref = `/stores/${doc.storeId}/documents/${doc.id}`;
    const isData = doc.kind === "data";
    const isFile = doc.kind === "file";
    const isFailed = (doc.kind === "data" && doc.status === "failed") ||
        (doc.kind === "file" && doc.status === "failed");

    return (
        <TableRow id={doc.id}>
            <TableCell>
                <Link href={viewerHref} className="font-medium text-[12px] text-foreground hover:text-accent transition-colors truncate block max-w-55">
                    {doc.name}
                </Link>
            </TableCell>
            <TableCell>
                <span className="text-[11px] text-foreground/45 tabular-nums whitespace-nowrap">
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(doc.updatedAt))}
                </span>
            </TableCell>
            <TableCell>
                <StatusBadge resource={doc} />
            </TableCell>
            <TableCell>
                <div className="flex gap-1">
                    {isData && (
                        <Link href={viewerHref}>
                            <Button size="xs" variant="outline" className="text-primary-500 border-primary-500 hover:bg-primary-50">View</Button>
                        </Link>
                    )}
                    {isFile && (
                        <Link href={`/api/stores/${doc.storeId}/documents/${doc.id}/download`}>
                            <Button size="xs" variant="outline" className="text-primary-500 border-primary-500 hover:bg-primary-50">Download</Button>
                        </Link>
                    )}
                    {isFailed && (
                        <Button size="xs" variant="outline" className="text-warning-500 border-warning-500 hover:bg-warning-50" onPress={handleRetry} isDisabled={retryMutation.isPending}>
                            {retryMutation.isPending ? "Retrying…" : "Retry"}
                        </Button>
                    )}
                    <Button size="xs" variant="danger" onPress={onDeleteRequest}>
                        Delete
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
