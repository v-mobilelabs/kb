import { getServerContext } from '@/lib/server-context'
import { getDashboardMetricsQuery } from '@/data/organizations/queries/get-dashboard-metrics-query'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import type { AppContext } from '@/lib/middleware/with-context'

export default async function DashboardPage() {
    const { orgId, user, uid, email } = await getServerContext()

    // Fetch dashboard metrics on server for SSR
    const ctx: AppContext = {
        uid,
        orgId,
        email: email ?? (user?.email as string) ?? '',
    }
    const metricsResult = await getDashboardMetricsQuery(ctx)
    const initialMetrics = metricsResult.ok ? metricsResult.value : null

    return (
        <DashboardClient
            displayName={(user?.displayName as string) ?? ''}
            orgId={orgId}
            initialMetrics={initialMetrics}
        />
    )
}
