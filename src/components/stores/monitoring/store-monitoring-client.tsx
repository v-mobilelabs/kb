"use client";

import { useQuery } from "@tanstack/react-query";
import type { StoreMonitoringMetrics } from "@/data/stores/dto/store-monitoring-dto";
import { EnrichmentStatusCard } from "./enrichment-status-card";
import { ActivityTable } from "./activity-table";
import { StoreHealthKpis } from "./store-health-kpis";

interface StoreMonitoringClientProps {
    readonly storeId: string;
    readonly orgId: string;
    readonly documentCount: number;
    readonly initialData?: StoreMonitoringMetrics | null;
}

export function StoreMonitoringClient({
    storeId,
    orgId,
    documentCount,
    initialData,
}: StoreMonitoringClientProps) {
    const { data, isLoading } = useQuery<StoreMonitoringMetrics>({
        queryKey: ["store-monitoring", orgId, storeId],
        queryFn: async () => {
            const res = await fetch(`/api/stores/${storeId}/monitoring`);
            if (!res.ok) throw new Error("Failed to fetch monitoring data");
            return res.json() as Promise<StoreMonitoringMetrics>;
        },
        initialData: initialData ?? undefined,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Monitoring</h2>

            {/* KPI tiles */}
            <StoreHealthKpis
                documentCount={documentCount}
                totalSizeBytes={data?.totalSizeBytes ?? null}
                enrichment={data?.enrichment ?? null}
                lastUpdated={data?.lastUpdated ?? null}
                isLoading={isLoading}
            />

            {/* Enrichment status */}
            <EnrichmentStatusCard
                enrichment={data?.enrichment ?? null}
                isLoading={isLoading}
            />

            {/* Activity table — owns its own useQuery (same key, deduplicated) */}
            <ActivityTable
                orgId={orgId}
                storeId={storeId}
            />
        </div>
    );
}
