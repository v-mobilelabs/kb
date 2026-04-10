"use client";

import type { EnrichmentStats } from "@/data/stores/dto/store-monitoring-dto";

interface EnrichmentStatusCardProps {
    readonly enrichment: EnrichmentStats | null;
    readonly isLoading: boolean;
}

const STATUS_CONFIG = [
    { key: "completed", label: "Completed", color: "bg-green-500" },
    { key: "processing", label: "Processing", color: "bg-blue-500" },
    { key: "pending", label: "Pending", color: "bg-yellow-500" },
    { key: "failed", label: "Failed", color: "bg-red-500" },
] as const;

export function EnrichmentStatusCard({
    enrichment,
    isLoading,
}: EnrichmentStatusCardProps) {
    if (isLoading) {
        return (
            <div className="bg-surface rounded-xl border border-foreground/10 p-4">
                <p className="text-xs text-foreground/60 mb-3 uppercase tracking-wide">
                    Enrichment Pipeline
                </p>
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-5 bg-foreground/10 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const total = enrichment
        ? enrichment.completed +
        enrichment.processing +
        enrichment.pending +
        enrichment.failed
        : 0;

    return (
        <div className="bg-surface rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 mb-3 uppercase tracking-wide">
                Enrichment Pipeline
            </p>

            {total === 0 ? (
                <p className="text-sm text-foreground/40">No documents to enrich</p>
            ) : (
                <div className="space-y-3">
                    {/* Progress bar */}
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-foreground/5">
                        {STATUS_CONFIG.map(({ key, color }) => {
                            const count = enrichment?.[key] ?? 0;
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={key}
                                    className={`${color} transition-all`}
                                    style={{ width: `${pct}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Status rows */}
                    <div className="grid grid-cols-2 gap-2">
                        {STATUS_CONFIG.map(({ key, label, color }) => {
                            const count = enrichment?.[key] ?? 0;
                            return (
                                <div key={key} className="flex items-center gap-2">
                                    <span
                                        className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`}
                                    />
                                    <span className="text-xs text-foreground/60">{label}</span>
                                    <span className="text-xs font-medium ml-auto tabular-nums">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
