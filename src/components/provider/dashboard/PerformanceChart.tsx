"use client"

import { TrendingUp } from "lucide-react"

interface PerformanceChartProps {
    weeklyRevenue: string
    dailyData?: number[]
    period?: "7d" | "30d"
    onPeriodChange?: (period: "7d" | "30d") => void
}

export function PerformanceChart({
    weeklyRevenue,
    dailyData = [160, 155, 120, 90, 40, 80, 60], // Default sample data (inverted Y)
    period = "7d",
    onPeriodChange
}: PerformanceChartProps) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    // Generate SVG path from data
    const maxVal = Math.max(...dailyData)
    const minVal = Math.min(...dailyData)
    const range = maxVal - minVal || 1

    const points = dailyData.map((val, i) => {
        const x = (i / (dailyData.length - 1)) * 400
        const y = 180 - ((val - minVal) / range) * 160 + 10
        return { x, y }
    })

    // Create smooth curve path
    const pathD = points.reduce((acc, point, i) => {
        if (i === 0) return `M${point.x},${point.y}`
        const prev = points[i - 1]
        const cpx1 = prev.x + (point.x - prev.x) / 2
        const cpx2 = point.x - (point.x - prev.x) / 2
        return `${acc} C${cpx1},${prev.y} ${cpx2},${point.y} ${point.x},${point.y}`
    }, "")

    const areaD = `${pathD} L400,200 L0,200 Z`
    const lastPoint = points[points.length - 1]

    return (
        <div className="xl:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Performance
                </h2>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[438px] flex flex-col">
                <div className="flex justify-between mb-8">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Weekly Revenue</p>
                        <h4 className="text-2xl font-bold">{weeklyRevenue}</h4>
                    </div>
                    <select
                        value={period}
                        onChange={(e) => onPeriodChange?.(e.target.value as "7d" | "30d")}
                        className="text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-primary/20 h-fit"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>

                {/* SVG Line Chart */}
                <div className="flex-1 w-full relative">
                    <svg
                        className="w-full h-full overflow-visible"
                        viewBox="0 0 400 200"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b774" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#10b774" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {[0, 50, 100, 150].map((y) => (
                            <line
                                key={y}
                                x1="0" y1={y} x2="400" y2={y}
                                className="stroke-slate-100 dark:stroke-slate-800"
                                strokeWidth="1"
                            />
                        ))}

                        {/* Area Fill */}
                        <path d={areaD} fill="url(#chartGradient)" />

                        {/* Line Path */}
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#10b774"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />

                        {/* Endpoint dot */}
                        <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#10b774" />
                        <circle cx={lastPoint.x} cy={lastPoint.y} r="10" fill="#10b774" fillOpacity="0.2" />
                    </svg>
                </div>

                {/* Day labels */}
                <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {days.map((day) => (
                        <span key={day}>{day}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}
