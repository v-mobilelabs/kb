import { getServerContext } from '@/lib/server-context'
import { getDashboardMetricsQuery } from '@/data/organizations/queries/get-dashboard-metrics-query'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import type { AppContext } from '@/lib/middleware/with-context'

const EMPTY_METRICS = {
    totalActiveKeys: 0,
    totalStores: 0,
    totalFiles: 0,
    totalContexts: 0,
    totalMembers: 0,
    keyActivity: [],
    errors: [],
}

export async function DashboardServer() {
    const { orgId, user, uid } = await getServerContext()

    // If orgId is not set (during onboarding before org creation), return empty metrics
    if (!orgId) {
        return (
            <DashboardClient
                displayName={(user?.displayName as string) ?? ''}
                metrics={EMPTY_METRICS}
            />
        )
    }

    const ctx: AppContext = {
        uid,
        orgId,
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
