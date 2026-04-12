"use client";

export function MemoriesSkeletonList() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-foreground/10 rounded-xl" />
            ))}
        </div>
    );
}
