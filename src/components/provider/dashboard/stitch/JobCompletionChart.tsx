"use client"

interface BarData {
    label: string
    completed: number  // completed jobs
    printHours: number // print hours
}

interface JobCompletionChartProps {
    data?: BarData[]
    viewMode?: "weekly" | "daily"
    onViewModeChange?: (mode: "weekly" | "daily") => void
    maxJobs?: number
}

export function JobCompletionChart({
    data = [],
    viewMode = "weekly",
    onViewModeChange,
    maxJobs = 20
}: JobCompletionChartProps) {
    const safeData = data.length > 0 ? data : [{ label: "-", completed: 0, printHours: 0 }]
    const totalCompleted = safeData.reduce((sum, d) => sum + d.completed, 0)
    const totalHours = safeData.reduce((sum, d) => sum + d.printHours, 0)

    return (
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">monitoring</span>
                        Job Completions
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {totalCompleted} jobs completed • {totalHours}h print time
                    </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                        className={`px-4 py-1 rounded-md transition-all ${viewMode === "weekly"
                                ? "bg-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                        onClick={() => onViewModeChange?.("weekly")}
                    >
                        Weekly
                    </button>
                    <button
                        className={`px-4 py-1 rounded-md transition-all ${viewMode === "daily"
                                ? "bg-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                        onClick={() => onViewModeChange?.("daily")}
                    >
                        Daily
                    </button>
                </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 px-2">
                {safeData.map((bar, index) => {
                    const heightPercent = Math.min((bar.completed / maxJobs) * 100, 100)
                    const hoursPercent = Math.min((bar.printHours / 60) * 100, 100) // max 60h scale

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="w-full flex gap-1 items-end h-full">
                                {/* Completed jobs bar */}
                                <div
                                    className="flex-1 bg-[#004D4D] rounded-t transition-all group-hover:brightness-110 relative"
                                    style={{ height: `${heightPercent}%`, minHeight: bar.completed > 0 ? '8px' : '0' }}
                                >
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {bar.completed}
                                    </span>
                                </div>
                                {/* Print hours bar */}
                                <div
                                    className="flex-1 bg-emerald-500/40 rounded-t transition-all group-hover:brightness-110"
                                    style={{ height: `${hoursPercent}%`, minHeight: bar.printHours > 0 ? '8px' : '0' }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{bar.label}</span>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-4 justify-center">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-[#004D4D]"></div>
                    <span className="text-slate-500">Completed Jobs</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/40"></div>
                    <span className="text-slate-500">Print Hours</span>
                </div>
            </div>
        </div>
    )
}
