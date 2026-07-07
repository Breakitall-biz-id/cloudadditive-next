"use client"

interface QueueItem {
    label: string
    percentage: number
    color: "teal" | "emerald" | "slate"
}

interface QueueDistributionProps {
    totalItems: number
    items?: QueueItem[]
}

const defaultItems: QueueItem[] = [
    { label: "ABS / ASA", percentage: 45, color: "teal" },
    { label: "PLA / PETG", percentage: 30, color: "emerald" },
    { label: "Specialty", percentage: 25, color: "slate" },
]

export function QueueDistribution({ totalItems = 124, items = defaultItems }: QueueDistributionProps) {
    // Calculate stroke-dasharray values for donut chart
    const getSegmentStyle = (percentage: number, offset: number) => {
        return {
            strokeDasharray: `${percentage} ${100 - percentage}`,
            strokeDashoffset: -offset,
        }
    }

    const colorMap = {
        teal: "#004D4D",
        emerald: "#10B981",
        slate: "#94a3b8",
    }

    let currentOffset = 0

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#004D4D]">pie_chart</span>
                Queue Distribution
            </h3>

            <div className="relative flex justify-center items-center h-48 mb-6">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                    {/* Background ring */}
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="12"
                    />

                    {/* Segments */}
                    {items.map((item, index) => {
                        const style = getSegmentStyle(item.percentage, currentOffset)
                        const prevOffset = currentOffset
                        currentOffset += item.percentage

                        return (
                            <circle
                                key={index}
                                cx="80"
                                cy="80"
                                r="70"
                                fill="transparent"
                                stroke={colorMap[item.color]}
                                strokeWidth="12"
                                strokeDasharray={style.strokeDasharray}
                                strokeDashoffset={-prevOffset}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                        )
                    })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{totalItems}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Items</span>
                </div>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: colorMap[item.color] }}
                            />
                            <span className="text-slate-500 font-medium">{item.label}</span>
                        </div>
                        <span className="font-bold">{item.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
