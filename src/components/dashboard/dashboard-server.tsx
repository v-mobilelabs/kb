import { getServerContext } from '@/lib/server-context'
import { getDashboardMetricsQuery } from '@/data/organizations/queries/get-dashboard-metrics-query'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import type { AppContext } from '@/lib/middleware/with-context'

const EMPTY_METRICS = {
    totalActiveKeys: 0,
    totalStores: 0,
    totalMemories: 0,
    keyActivity: [],
    errors: [],
}

export async function DashboardServer() {
    const { orgId, user, uid } = await getServerContext()

    const ctx: AppContext = {
        uid,
        orgId: orgId ?? '',
        email: (user?.email as string) ?? '',
    }
    const metricsResult = await getDashboardMetricsQuery(ctx)
    const metrics = metricsResult.ok ? metricsResult.value : EMPTY_METRICS

    return (
        <DashboardClient
            displayName={(user?.displayName as string) ?? ''}
            metrics={metrics}
        />
    )
}
