export default function MemoryDetailLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-8 bg-foreground/10 rounded-md w-48" />
            <div className="rounded-xl border border-foreground/10 p-5 flex flex-col gap-3">
                <div className="h-5 bg-foreground/10 rounded w-3/4" />
                <div className="h-4 bg-foreground/10 rounded w-full" />
                <div className="h-4 bg-foreground/10 rounded w-5/6" />
            </div>
            <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-foreground/10 p-4 flex flex-col gap-2">
                        <div className="h-4 bg-foreground/10 rounded w-full" />
                        <div className="h-4 bg-foreground/10 rounded w-4/5" />
                        <div className="h-3 bg-foreground/10 rounded w-20 mt-1" />
                    </div>
                ))}
            </div>
        </div>
    );
}
