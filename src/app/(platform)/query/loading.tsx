export default function QueryLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-8 bg-foreground/10 rounded-md w-40" />
            <div className="rounded-xl border border-foreground/10 p-5 flex flex-col gap-4">
                <div className="h-24 bg-foreground/10 rounded-lg w-full" />
                <div className="h-9 bg-foreground/10 rounded-lg w-28" />
            </div>
            <div className="rounded-xl border border-foreground/10 p-5 flex flex-col gap-3">
                <div className="h-5 bg-foreground/10 rounded w-24" />
                <div className="h-4 bg-foreground/10 rounded w-full" />
                <div className="h-4 bg-foreground/10 rounded w-5/6" />
                <div className="h-4 bg-foreground/10 rounded w-4/5" />
            </div>
        </div>
    );
}
