interface KpiTileProps {
    label: string
    value: number
}

export function KpiTile({ label, value }: Readonly<KpiTileProps>) {
    return (
        <div className="bg-surface rounded-xl p-6 flex flex-col gap-2 border border-foreground/10">
            <span className="text-sm text-foreground/60 uppercase tracking-wide">{label}</span>
            <span className="text-3xl font-semibold tabular-nums">{value}</span>
        </div>
    )
}
