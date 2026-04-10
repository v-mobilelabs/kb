export default function DocumentViewerLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse max-w-3xl">
            <div className="h-3 bg-foreground/10 rounded w-56" />
            <div className="h-7 bg-foreground/10 rounded w-64" />
            <div className="h-6 bg-foreground/10 rounded w-20" />
            <div className="rounded-xl border border-foreground/10 h-72 bg-foreground/5" />
        </div>
    );
}
