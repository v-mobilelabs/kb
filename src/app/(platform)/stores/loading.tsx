export default function StoresLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 bg-foreground/10 rounded-md w-40" />
                <div className="h-9 bg-foreground/10 rounded-lg w-28" />
            </div>
            <div className="flex gap-3">
                <div className="h-9 bg-foreground/10 rounded-lg flex-1" />
                <div className="h-9 bg-foreground/10 rounded-lg w-36" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-foreground/10 p-5 flex flex-col gap-3">
                        <div className="h-5 bg-foreground/10 rounded w-3/4" />
                        <div className="h-4 bg-foreground/10 rounded w-full" />
                        <div className="h-4 bg-foreground/10 rounded w-2/3" />
                        <div className="flex gap-2 mt-auto pt-3 border-t border-foreground/10">
                            <div className="h-7 bg-foreground/10 rounded w-16" />
                            <div className="h-7 bg-foreground/10 rounded w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
