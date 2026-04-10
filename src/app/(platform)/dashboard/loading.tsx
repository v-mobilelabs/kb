export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            {/* Greeting */}
            <div className="h-8 bg-foreground/10 rounded-md w-64" />

            {/* KPI tile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-24 bg-surface rounded-xl border border-foreground/10" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-48 bg-foreground/10 rounded-xl" />
                <div className="h-48 bg-foreground/10 rounded-xl" />
            </div>
        </div>
    )
}
