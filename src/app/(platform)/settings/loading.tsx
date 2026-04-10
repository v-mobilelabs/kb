export default function SettingsLoading() {
    return (
        <main className="flex flex-col gap-8 animate-pulse">
            <div className="flex flex-col gap-2">
                <div className="h-8 w-32 bg-foreground/10 rounded" />
                <div className="h-4 w-48 bg-foreground/10 rounded" />
            </div>

            <div className="h-px bg-foreground/10" />

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <div className="h-6 w-24 bg-foreground/10 rounded" />
                    <div className="h-4 w-64 bg-foreground/10 rounded" />
                </div>

                {/* Create form skeleton */}
                <div className="flex gap-2">
                    <div className="h-10 flex-1 bg-foreground/10 rounded-lg" />
                    <div className="h-10 w-28 bg-foreground/10 rounded-lg" />
                </div>

                <div className="h-px bg-foreground/10" />

                <div className="h-4 w-20 bg-foreground/10 rounded" />

                {/* Key list skeleton */}
                {[1, 2].map(i => (
                    <div key={i} className="h-14 bg-foreground/10 rounded-lg" />
                ))}
            </div>
        </main>
    )
}
