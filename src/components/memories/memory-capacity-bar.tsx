"use client";

interface MemoryCapacityBarProps {
    documentCount: number;
    documentCapacity: number;
    condenseThresholdPercent: number;
}

export function MemoryCapacityBar({
    documentCount,
    documentCapacity,
    condenseThresholdPercent,
}: Readonly<MemoryCapacityBarProps>) {
    const pct = Math.min((documentCount / documentCapacity) * 100, 100);
    const thresholdPct = condenseThresholdPercent;
    const atWarning = pct >= thresholdPct;
    const atDanger = pct >= 90;

    const getBarColor = () => {
        if (atDanger) return "bg-red-500";
        if (atWarning) return "bg-amber-500";
        return "bg-accent";
    };

    const barColor = getBarColor();

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>
                    {documentCount} / {documentCapacity} documents
                </span>
                {atWarning && !atDanger && (
                    <span className="text-amber-500 font-medium">
                        Condensation threshold reached
                    </span>
                )}
                {atDanger && (
                    <span className="text-red-500 font-medium">Near capacity</span>
                )}
            </div>
            <div className="relative h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
                <div
                    className="absolute top-0 bottom-0 w-px bg-foreground/30"
                    style={{ left: `${thresholdPct}%` }}
                    title={`Condensation threshold (${thresholdPct}%)`}
                />
            </div>
        </div>
    );
}
