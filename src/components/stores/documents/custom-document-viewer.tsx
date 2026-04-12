"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocumentAction } from "@/actions/document-actions";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import type { StoreDocument } from "@/data/stores/models/store-document.model";

interface CustomDocumentViewerProps {
    orgId: string;
    document: StoreDocument;
}

function StatusBadge({ resource }: { resource: StoreDocument }) {
    if (resource.kind !== "data" && resource.kind !== "file") return null;
    const status = resource.status;
    const keywords = resource.keywords ?? [];

    if (status === "pending") return <span className="text-xs bg-foreground/10 text-foreground/50 rounded px-2 py-0.5 italic animate-pulse">Pending AI enrichment…</span>;
    if (status === "processing") return <span className="text-xs bg-foreground/10 text-foreground/50 rounded px-2 py-0.5 italic">Enriching…</span>;
    if (status === "failed") return <span className="text-xs bg-danger/10 text-danger rounded px-2 py-0.5">⚠ Failed</span>;
    return (
        <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs bg-success/10 text-success rounded px-2 py-0.5">Completed</span>
            {keywords.map((kw) => (
                <span key={kw} className="text-xs bg-foreground/5 text-foreground/60 rounded px-2 py-0.5">{kw}</span>
            ))}
        </div>
    );
}

export function CustomDocumentViewer({ orgId, document }: CustomDocumentViewerProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [deleteOpen, setDeleteOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: () => deleteDocumentAction({ storeId: document.storeId, docId: document.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents", orgId, document.storeId] });
            router.push(`/stores/${document.storeId}`);
        },
    });

    function handleDelete() {
        deleteMutation.mutate();
    }

    const formattedJson = (() => {
        try {
            const raw = document.data;
            if (raw == null) return "{}";
            const str = typeof raw === "string" ? raw : JSON.stringify(raw);
            return JSON.stringify(JSON.parse(str), null, 2);
        } catch {
            return typeof document.data === "string" ? document.data : "{}";
        }
    })();

    const summary = document.kind === "data" ? document.summary : null;
    const source = document.source;

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="text-sm text-foreground/50">
                <Link href="/stores" className="hover:text-foreground transition-colors">Stores</Link>
                <span className="mx-2">/</span>
                <Link href={`/stores/${document.storeId}`} className="hover:text-foreground transition-colors">Store</Link>
                <span className="mx-2">/</span>
                <span>{document.name}</span>
            </nav>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{document.name}</h1>
                    <p className="text-xs text-foreground/40 mt-1">
                        Created {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(document.createdAt))} ·
                        Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(document.updatedAt))}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Link href={`/stores/${document.storeId}/documents/${document.id}?edit=1`}>
                        <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Button variant="danger" size="sm" onPress={() => setDeleteOpen(true)}>
                        Delete
                    </Button>
                </div>
            </div>

            {/* Status */}
            <StatusBadge resource={document} />

            {/* Source */}
            {source && (
                <div className="text-xs text-foreground/60">
                    <p>Source ID: <span className="font-mono">{source.id}</span></p>
                    <p>Collection: <span className="font-mono">{source.collection}</span></p>
                </div>
            )}

            {/* Summary */}
            {summary && (
                <div className="rounded-lg border border-foreground/10 bg-surface p-4">
                    <p className="text-xs font-medium text-foreground/60 mb-2">AI Summary</p>
                    <p className="text-sm text-foreground/80">{summary}</p>
                </div>
            )}

            {/* Data Content */}
            {document.kind === "data" && (
                <div className="rounded-lg border border-foreground/10 bg-surface p-4">
                    <p className="text-xs font-medium text-foreground/60 mb-2">JSON Data</p>
                    <pre className="text-xs bg-foreground/5 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap break-words">
                        {formattedJson}
                    </pre>
                </div>
            )}

            {/* Delete Modal */}
            {deleteOpen && (
                <ReusableConfirmModal
                    isOpen={deleteOpen}
                    title="Delete document"
                    message={`Delete "${document.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={handleDelete}
                    onDismiss={() => setDeleteOpen(false)}
                    isPending={deleteMutation.isPending}
                />
            )}
        </div>
    );
}
