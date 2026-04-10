'use client'

import { useQuery } from '@tanstack/react-query'
import { KpiTile } from '@/components/dashboard/kpi-tile'
import { KeyActivityChart } from '@/components/dashboard/key-activity-chart'
import { ErrorActivityChart } from '@/components/dashboard/error-activity-chart'

interface DashboardClientProps {
    displayName: string
    orgId: string
    initialMetrics?: Metrics | null
}

interface Metrics {
    totalActiveKeys: number
    totalStores: number
    keyActivity: { date: string; count: number }[]
    errors: { date: string; count: number }[]
}

export function DashboardClient({
    displayName,
    orgId,
    initialMetrics,
}: Readonly<DashboardClientProps>) {
    const { data, isLoading, error } = useQuery<Metrics>({
        queryKey: ['dashboard-metrics', orgId],
        queryFn: async () => {
            const res = await fetch('/api/dashboard/metrics')
            if (!res.ok) {
                const text = await res.text()
                throw new Error(`Failed to fetch metrics: ${res.status} - ${text}`)
            }
            return res.json() as Promise<Metrics>
        },
        initialData: initialMetrics ?? undefined,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    })

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">
                Welcome back, {displayName || 'there'} 👋
            </h1>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600">
                    Failed to load dashboard metrics. Please try refreshing.
                </div>
            )}

            {/* KPI tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiTile
                    label="Active API keys"
                    value={data?.totalActiveKeys ?? null}
                    isLoading={isLoading}
                />
                <KpiTile
                    label="Total stores"
                    value={data?.totalStores ?? null}
                    isLoading={isLoading}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col min-h-80">
                    <KeyActivityChart data={data?.keyActivity ?? []} isLoading={isLoading} />
                </div>
                <div className="flex flex-col min-h-80">
                    <ErrorActivityChart data={data?.errors ?? []} isLoading={isLoading} />
                </div>
            </div>
        </div>
    )
}
