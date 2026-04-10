"use client";

import type { ActivityEvent } from "@/data/stores/dto/store-monitoring-dto";

interface ActivityTimelineProps {
    readonly events: ActivityEvent[];
    readonly isLoading: boolean;
}

const ACTION_STYLES: Record<string, { icon: string; color: string }> = {
    enriched: { icon: "✓", color: "text-green-500 bg-green-500/10" },
    processing: { icon: "⟳", color: "text-blue-500 bg-blue-500/10" },
    added: { icon: "+", color: "text-foreground/60 bg-foreground/5" },
    failed: { icon: "✕", color: "text-red-500 bg-red-500/10" },
};

function formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityTimeline({
    events,
    isLoading,
}: ActivityTimelineProps) {
    if (isLoading) {
        return (
            <div className="bg-surface rounded-xl border border-foreground/10 p-4">
                <p className="text-xs text-foreground/60 mb-3 uppercase tracking-wide">
                    Recent Activity
                </p>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-3 items-center">
                            <div className="w-6 h-6 bg-foreground/10 rounded-full animate-pulse" />
                            <div className="flex-1 h-4 bg-foreground/10 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-xl border border-foreground/10 p-4">
            <p className="text-xs text-foreground/60 mb-3 uppercase tracking-wide">
                Recent Activity
            </p>

            {events.length === 0 ? (
                <p className="text-sm text-foreground/40">No recent activity</p>
            ) : (
                <div className="space-y-1">
                    {events.map((event) => {
                        const style = ACTION_STYLES[event.action] ?? ACTION_STYLES.added;
                        return (
                            <div
                                key={`${event.id}-${event.timestamp}`}
                                className="flex items-center gap-2.5 py-1.5"
                            >
                                <span
                                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${style.color}`}
                                >
                                    {style.icon}
                                </span>
                                <span className="text-sm min-w-0 truncate flex-1">
                                    {event.name}
                                </span>
                                <span className="text-xs text-foreground/40 shrink-0 capitalize">
                                    {event.action}
                                </span>
                                <span className="text-xs text-foreground/30 shrink-0 tabular-nums">
                                    {formatTime(event.timestamp)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
