"use client";

export function MemoryDocumentsSkeletonList() {
    return (
        <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-foreground/10 rounded-lg" />
            ))}
        </div>
    );
}
