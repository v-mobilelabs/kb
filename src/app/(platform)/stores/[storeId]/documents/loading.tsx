export default function DocumentsLoading() {
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

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="h-9 bg-foreground/10 rounded-lg flex-1 sm:max-w-xs" />
                <div className="flex gap-2">
                    <div className="h-9 bg-foreground/10 rounded-lg w-24" />
                    <div className="h-9 bg-foreground/10 rounded-lg w-28" />
                </div>
            </div>

            {/* Document List Skeleton */}
            <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-lg border border-foreground/10 p-4 flex items-start gap-4">
                        {/* Icon/Type */}
                        <div className="h-10 w-10 bg-foreground/10 rounded flex-shrink-0" />

                        {/* Content */}
                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="h-4 bg-foreground/10 rounded w-2/3" />
                            <div className="h-3 bg-foreground/10 rounded w-1/2" />
                        </div>

                        {/* Metadata */}
                        <div className="flex-shrink-0 space-y-2 text-right">
                            <div className="h-4 bg-foreground/10 rounded w-20" />
                            <div className="h-3 bg-foreground/10 rounded w-16" />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                            <div className="h-8 w-8 bg-foreground/10 rounded" />
                            <div className="h-8 w-8 bg-foreground/10 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination/More Loading */}
            <div className="flex justify-center pt-4">
                <div className="h-9 bg-foreground/10 rounded-lg w-32" />
            </div>
        </div>
    );
}
