"use client";

import type { DocumentTypeBreakdown } from "@/data/stores/dto/store-monitoring-dto";

interface DocumentBreakdownCardProps {
    readonly documentTypes: DocumentTypeBreakdown[];
    readonly isLoading: boolean;
}

const KIND_LABELS: Record<string, string> = {
    file: "File",
    data: "Data",
    node: "Node",
};

const TYPE_COLORS: Record<string, string> = {
    pdf: "bg-red-400",
    csv: "bg-green-400",
    doc: "bg-blue-400",
    image: "bg-purple-400",
    json: "bg-amber-400",
    text: "bg-cyan-400",
    table: "bg-emerald-400",
    chunk: "bg-slate-400",
    entity: "bg-fuchsia-400",
    relation: "bg-rose-400",
};

export function DocumentBreakdownCard({
    documentTypes,
    isLoading,
}: DocumentBreakdownCardProps) {
    if (isLoading) {
        return (
            <div className="bg-surface rounded-xl border border-foreground/10 p-4">
                <p className="text-xs text-foreground/60 mb-3 uppercase tracking-wide">
                    Document Types
                </p>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-5 bg-foreground/10 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const total = documentTypes.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className="bg-surface rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 mb-3 uppercase tracking-wide">
                Document Types
            </p>

            {documentTypes.length === 0 ? (
                <p className="text-sm text-foreground/40">No documents yet</p>
            ) : (
                <div className="space-y-2">
                    {documentTypes.map(({ kind, type, count }) => {
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        const color = TYPE_COLORS[type] ?? "bg-gray-400";
                        return (
                            <div key={`${kind}:${type}`} className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                                <span className="text-xs text-foreground/60 min-w-0 truncate">
                                    {KIND_LABELS[kind] ?? kind} / {type}
                                </span>
                                <div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden ml-1">
                                    <div
                                        className={`h-full ${color} rounded-full transition-all`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium tabular-nums shrink-0">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
