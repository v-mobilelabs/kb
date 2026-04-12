export default function MemoriesLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 bg-foreground/10 rounded-md w-32" />
                <div className="h-9 bg-foreground/10 rounded-lg w-28" />
            </div>
            <div className="h-9 bg-foreground/10 rounded-lg w-full" />
            <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-xl border border-foreground/10 p-4 flex flex-col gap-2">
                        <div className="h-5 bg-foreground/10 rounded w-1/2" />
                        <div className="h-4 bg-foreground/10 rounded w-full" />
                        <div className="h-3 bg-foreground/10 rounded w-24 mt-1" />
                    </div>
                ))}
            </div>
        </div>
    );
}
