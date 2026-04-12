import { Suspense } from 'react'
import { DashboardServer } from '@/components/dashboard/dashboard-server'

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-8 bg-foreground/10 rounded-md w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-24 bg-surface rounded-xl border border-foreground/10" />
                <div className="h-24 bg-surface rounded-xl border border-foreground/10" />
                <div className="h-24 bg-surface rounded-xl border border-foreground/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-80 bg-foreground/10 rounded-xl" />
                <div className="h-80 bg-foreground/10 rounded-xl" />
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardServer />
        </Suspense>
    )
}
