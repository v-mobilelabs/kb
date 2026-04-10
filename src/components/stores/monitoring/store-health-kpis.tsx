"use client";

import type { EnrichmentStats } from "@/data/stores/dto/store-monitoring-dto";

interface StoreHealthKpisProps {
    readonly documentCount: number;
    readonly totalSizeBytes: number | null;
    readonly enrichment: EnrichmentStats | null;
    readonly lastUpdated: string | null;
    readonly isLoading: boolean;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatTimeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function Tile({
    label,
    value,
    isLoading,
}: {
    readonly label: string;
    readonly value: string;
    readonly isLoading: boolean;
}) {
    return (
        <div className="bg-surface rounded-lg p-4 border border-foreground/10 flex flex-col gap-1">
            <span className="text-xs text-foreground/50 uppercase tracking-wide">
                {label}
            </span>
            {isLoading ? (
                <div className="h-7 w-16 bg-foreground/10 rounded animate-pulse" />
            ) : (
                <span className="text-xl font-semibold tabular-nums">{value}</span>
            )}
        </div>
    );
}

export function StoreHealthKpis({
    documentCount,
    totalSizeBytes,
    enrichment,
    lastUpdated,
    isLoading,
}: StoreHealthKpisProps) {
    const successRate =
        enrichment && enrichment.completed + enrichment.failed > 0
            ? Math.round(
                (enrichment.completed / (enrichment.completed + enrichment.failed)) *
                100,
            )
            : null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile
                label="Documents"
                value={documentCount.toString()}
                isLoading={false}
            />
            <Tile
                label="Storage"
                value={totalSizeBytes === null ? "0 B" : formatBytes(totalSizeBytes)}
                isLoading={isLoading}
            />
            <Tile
                label="Enrichment rate"
                value={successRate === null ? "—" : `${successRate}%`}
                isLoading={isLoading}
            />
            <Tile
                label="Last updated"
                value={lastUpdated ? formatTimeAgo(lastUpdated) : "—"}
                isLoading={isLoading}
            />
        </div>
    );
}
