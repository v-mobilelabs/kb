'use client'

interface KpiTileProps {
    label: string
    value: number | null
    isLoading?: boolean
}

export function KpiTile({ label, value, isLoading = false }: KpiTileProps) {
    return (
        <div className="bg-surface rounded-xl p-6 flex flex-col gap-2 border border-foreground/10">
            <span className="text-sm text-foreground/60 uppercase tracking-wide">{label}</span>
            {isLoading ? (
                <div className="h-8 w-16 bg-foreground/10 rounded-md animate-pulse" />
            ) : (
                <span className="text-3xl font-semibold tabular-nums">{value ?? 0}</span>
            )}
        </div>
    )
}
