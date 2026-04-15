export default function MembersLoading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 bg-foreground/10 rounded-md w-40" />
            </div>
            <div className="flex gap-3">
                <div className="h-9 bg-foreground/10 rounded-lg flex-1" />
                <div className="h-9 bg-foreground/10 rounded-lg w-32" />
                <div className="h-9 bg-foreground/10 rounded-lg w-44" />
            </div>
            <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-foreground/10 rounded-lg" />
                ))}
            </div>
        </div>
    );
}
