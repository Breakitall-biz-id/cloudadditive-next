"use client"

interface TelemetryChartProps {
    label: string
    value: number
    unit: string
    color: "orange" | "blue"
    maxValue: number
}

// Simple bar chart showing temperature with gradient intensity based on value
export function TelemetryChart({ label, value, unit, color, maxValue }: TelemetryChartProps) {
    // Generate 8 bars with increasing intensity
    const bars = 8
    const heightPercent = Math.min(100, (value / maxValue) * 100)

    const colorClasses = {
        orange: {
            light: "bg-orange-100",
            medium: "bg-orange-200",
            dark: "bg-orange-300",
            full: "bg-orange-500",
            text: "text-orange-600"
        },
        blue: {
            light: "bg-blue-100",
            medium: "bg-blue-200",
            dark: "bg-blue-300",
            full: "bg-blue-500",
            text: "text-blue-600"
        }
    }

    const colors = colorClasses[color]

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700">{label}</span>
                <span className={`text-xs font-black ${colors.text}`}>
                    {value.toFixed(1)}{unit}
                </span>
            </div>
            <div className="h-16 w-full flex items-end gap-[2px]">
                {Array.from({ length: bars }).map((_, i) => {
                    // Intensity increases from left to right
                    const intensity = (i + 1) / bars
                    const barHeight = Math.max(20, heightPercent * (0.5 + intensity * 0.5))

                    let bgClass = colors.light
                    if (intensity > 0.5 && intensity <= 0.7) bgClass = colors.medium
                    else if (intensity > 0.7 && intensity <= 0.9) bgClass = colors.dark
                    else if (intensity > 0.9) bgClass = colors.full

                    return (
                        <div
                            key={i}
                            className={`flex-1 ${bgClass} rounded-t transition-all duration-300`}
                            style={{ height: `${barHeight}%` }}
                        />
                    )
                })}
            </div>
        </div>
    )
}
