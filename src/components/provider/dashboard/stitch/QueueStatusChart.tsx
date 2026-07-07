"use client"

interface QueueItem {
    status: "in_queue" | "printing" | "slicing" | "completed" | "failed"
    count: number
}

interface QueueStatusChartProps {
    items?: QueueItem[]
    totalJobs: number
}

const defaultItems: QueueItem[] = [
    { status: "printing", count: 3 },
    { status: "in_queue", count: 8 },
    { status: "slicing", count: 2 },
]

const statusConfig = {
    printing: { label: "Printing", color: "#10B981" }, // emerald
    in_queue: { label: "In Queue", color: "#004D4D" }, // teal
    slicing: { label: "Slicing", color: "#f59e0b" }, // amber
    completed: { label: "Completed", color: "#6366f1" }, // indigo
    failed: { label: "Failed", color: "#ef4444" }, // red
}

export function QueueStatusChart({ totalJobs = 0, items = defaultItems }: QueueStatusChartProps) {
    const total = items.reduce((sum, item) => sum + item.count, 0)

    // Calculate percentages for donut segments
    let currentOffset = 0
    const segments = items.map(item => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0
        const offset = currentOffset
        currentOffset += percentage
        return { ...item, percentage, offset }
    })

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[#004D4D]">queue</span>
                Queue Status
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
                        strokeWidth="14"
                    />

                    {/* Segments */}
                    {segments.map((item, index) => (
                        <circle
                            key={index}
                            cx="80"
                            cy="80"
                            r="70"
                            fill="transparent"
                            stroke={statusConfig[item.status].color}
                            strokeWidth="14"
                            strokeDasharray={`${(item.percentage / 100) * 439.8} 439.8`}
                            strokeDashoffset={-(item.offset / 100) * 439.8}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />
                    ))}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{total}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Jobs</span>
                </div>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: statusConfig[item.status].color }}
                            />
                            <span className="text-slate-500 font-medium">{statusConfig[item.status].label}</span>
                        </div>
                        <span className="font-bold">{item.count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
