export default function StoreDetailLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            {/* Store header */}
            <div className="flex flex-col gap-2">
                <div className="h-3 bg-foreground/10 rounded w-32" />
                <div className="h-7 bg-foreground/10 rounded w-64" />
                <div className="h-4 bg-foreground/10 rounded w-80" />
            </div>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-foreground/10 pb-0">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-foreground/10 rounded-t w-24" />
                ))}
            </div>
            {/* Document rows */}
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-foreground/5 py-3">
                    <div className="h-4 bg-foreground/10 rounded w-6" />
                    <div className="h-4 bg-foreground/10 rounded flex-1" />
                    <div className="h-6 bg-foreground/10 rounded w-16" />
                    <div className="h-4 bg-foreground/10 rounded w-20" />
                    <div className="h-7 bg-foreground/10 rounded w-20" />
                </div>
            ))}
        </div>
    );
}
