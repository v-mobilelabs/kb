export default function MonitoringLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            {/* Store Header Skeleton */}
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
                <div className="h-8 bg-foreground/10 rounded-md w-48" />
                <div className="flex gap-2">
                    <div className="h-9 bg-foreground/10 rounded-lg w-24" />
                    <div className="h-9 bg-foreground/10 rounded-lg w-24" />
                </div>
            </div>

            {/* Enrichment Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg border border-foreground/10 p-4 flex flex-col gap-3">
                        <div className="h-4 bg-foreground/10 rounded w-20" />
                        <div className="h-7 bg-foreground/10 rounded w-16" />
                        <div className="h-3 bg-foreground/10 rounded w-24" />
                    </div>
                ))}
            </div>

            {/* Document Type Breakdown Section */}
            <div className="rounded-lg border border-foreground/10 p-6 flex flex-col gap-4">
                <div className="h-6 bg-foreground/10 rounded w-40" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="h-4 bg-foreground/10 rounded w-32" />
                            <div className="h-4 bg-foreground/10 rounded w-12" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="rounded-lg border border-foreground/10 p-6 flex flex-col gap-4">
                <div className="h-6 bg-foreground/10 rounded w-40" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3 pb-3 border-b border-foreground/10 last:border-0">
                            <div className="h-8 w-8 bg-foreground/10 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-1">
                                <div className="h-4 bg-foreground/10 rounded w-2/3" />
                                <div className="h-3 bg-foreground/10 rounded w-1/2" />
                            </div>
                            <div className="h-4 bg-foreground/10 rounded w-16 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
