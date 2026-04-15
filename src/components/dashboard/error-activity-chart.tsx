'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

interface DayBucket {
    date: string
    count: number
    displayDate?: string
}

interface ErrorActivityChartProps {
    readonly data: DayBucket[]
}

function formatCount(value: number): string {
    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
}

function formatChartData(data: DayBucket[]): DayBucket[] {
    // Data is already 30 days from backend in YYYY-MM-DD format
    // Just add display dates
    return data.map((item) => {
        const dateObj = new Date(item.date)
        const displayDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
        return {
            ...item,
            displayDate,
        }
    })
}

interface ChartTooltipProps {
    readonly active?: boolean
    readonly payload?: ReadonlyArray<{ payload: DayBucket }>
}

function ErrorActivityTooltip({ active, payload }: Readonly<ChartTooltipProps>) {
    if (!active || !payload?.[0]) {
        return null
    }

    const data = payload[0].payload
    return (
        <div className="rounded-lg bg-background/95 border border-foreground/20 p-2 shadow-lg">
            <p className="text-xs font-medium">{data.displayDate}</p>
            <p className="text-sm font-semibold text-red-500">Errors: {formatCount(data.count)}</p>
        </div>
    )
}

export function ErrorActivityChart({ data }: Readonly<ErrorActivityChartProps>) {
    // Format data with display dates
    const chartData = formatChartData(data)

    return (
        <div className="h-80 w-full bg-surface rounded-xl border border-foreground/10 flex flex-col">
            <div className="px-3 pt-3 pb-0">
                <p className="text-xs text-foreground/60 uppercase tracking-wide">Errors (30d)</p>
            </div>
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 8 }}
                            height={20}
                            tickFormatter={(date) => {
                                const dateObj = new Date(date)
                                const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                                const day = String(dateObj.getDate()).padStart(2, '0')
                                return `${month}-${day}`
                            }}
                        />
                        <YAxis
                            type="number"
                            tick={{ fontSize: 9 }}
                            tickFormatter={formatCount}
                            width={24}
                        />
                        <Tooltip content={<ErrorActivityTooltip />} />
                        <Bar dataKey="count" fill="#f31260" radius={1} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
