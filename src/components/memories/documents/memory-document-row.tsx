"use client";

import Link from "next/link";
import type { MemoryDocument } from "@/data/memories/types";
import { CondensationSummaryBadge } from "../condensation-summary-badge";

interface MemoryDocumentRowProps {
    document: MemoryDocument;
    memoryId: string;
}

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(d));
}

export function MemoryDocumentRow({
    document,
    memoryId,
}: Readonly<MemoryDocumentRowProps>) {
    return (
        <Link
            href={`/memories/${memoryId}/documents/${document.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-foreground/10 bg-surface hover:border-foreground/20 transition-colors"
        >
            <div className="flex items-center gap-3 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">
                    {document.title}
                </h4>
                {document.isCondensationSummary && <CondensationSummaryBadge />}
            </div>
            <div className="flex gap-4 text-xs text-foreground/50 shrink-0">
                <span>Created {formatDate(document.createdAt)}</span>
                <span>Modified {formatDate(document.updatedAt)}</span>
            </div>
        </Link>
    );
}
