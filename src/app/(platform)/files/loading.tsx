import { Skeleton } from "@heroui/react";

export default function FilesLoading() {
    return (
        <div className="flex flex-col gap-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24 rounded-lg" />
            </div>

            {/* Search and filter bar skeleton */}
            <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-9 w-52 rounded-lg" />
                <Skeleton className="h-9 w-44 rounded-lg" />
                <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-16 rounded-full" />
                    ))}
                </div>
            </div>

            {/* Table skeleton — 8 rows */}
            <div className="overflow-hidden rounded-xl border border-default-200">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-default-200 bg-default-100 px-4 py-3">
                    <Skeleton className="h-4 w-10 rounded" />
                    <Skeleton className="h-4 flex-1 rounded" />
                    <Skeleton className="hidden h-4 w-16 rounded sm:block" />
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="hidden h-4 w-24 rounded sm:block" />
                    <Skeleton className="h-4 w-16 rounded" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 border-b border-default-100 px-4 py-3 last:border-0"
                    >
                        <Skeleton className="size-10 shrink-0 rounded" />
                        <Skeleton className="h-4 flex-1 rounded" />
                        <Skeleton className="hidden h-4 w-14 rounded sm:block" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="hidden h-4 w-20 rounded sm:block" />
                        <div className="flex gap-1">
                            <Skeleton className="size-7 rounded" />
                            <Skeleton className="size-7 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
