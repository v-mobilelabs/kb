'use client'

import { KpiTile } from '@/components/dashboard/kpi-tile'
import { KeyActivityChart } from '@/components/dashboard/key-activity-chart'
import { ErrorActivityChart } from '@/components/dashboard/error-activity-chart'

interface Metrics {
    totalActiveKeys: number
    totalStores: number
    totalFiles: number
    totalContexts: number
    totalMembers: number
    keyActivity: { date: string; count: number }[]
    errors: { date: string; count: number }[]
}

interface DashboardClientProps {
    displayName: string
    metrics: Metrics
}

export function DashboardClient({ displayName, metrics }: Readonly<DashboardClientProps>) {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">
                Welcome back, {displayName || 'there'} 👋
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <KpiTile label="Active API keys" value={metrics.totalActiveKeys} />
                <KpiTile label="Total stores" value={metrics.totalStores} />
                <KpiTile label="Total files" value={metrics.totalFiles} />
                <KpiTile label="Total contexts" value={metrics.totalContexts} />
                <KpiTile label="Total members" value={metrics.totalMembers} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col min-h-80">
                    <KeyActivityChart data={metrics.keyActivity} />
                </div>
                <div className="flex flex-col min-h-80">
                    <ErrorActivityChart data={metrics.errors} />
                </div>
            </div>
        </div>
    )
}
