export function StoreListSkeleton() {
    return (
        <div className="flex flex-col gap-4 animate-pulse">
            <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="h-10 bg-foreground/10 w-full" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4 px-4 py-3 border-t border-foreground/10">
                        <div className="h-4 bg-foreground/10 rounded flex-1" />
                        <div className="h-4 bg-foreground/10 rounded w-16" />
                        <div className="h-4 bg-foreground/10 rounded w-20" />
                        <div className="h-4 bg-foreground/10 rounded w-32" />
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between">
                <div className="h-9 bg-foreground/10 rounded-lg w-28" />
                <div className="h-4 bg-foreground/10 rounded w-32" />
                <div className="h-9 bg-foreground/10 rounded-lg w-20" />
            </div>
        </div>
    );
}
