export default function ContextDetailLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between">
                    <div className="h-8 w-64 bg-foreground/10 rounded-lg" />
                    <div className="h-9 w-32 bg-foreground/10 rounded-xl" />
                </div>
                <div className="flex gap-6 mt-2">
                    <div className="h-4 w-32 bg-foreground/10 rounded" />
                    <div className="h-4 w-20 bg-foreground/10 rounded" />
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex gap-2">
                <div className="flex-1 h-9 bg-foreground/10 rounded-lg" />
                <div className="h-9 w-16 bg-foreground/10 rounded-lg" />
            </div>

            {/* Table rows */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-foreground/10 rounded-xl" />
            ))}
        </div>
    );
}
