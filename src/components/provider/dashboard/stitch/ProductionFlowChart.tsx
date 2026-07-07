"use client"

interface BarData {
    label: string
    primary: number // percentage height (0-100)
    secondary: number // percentage height (0-100)
}

interface ProductionFlowChartProps {
    data?: BarData[]
    viewMode?: "weekly" | "daily"
    onViewModeChange?: (mode: "weekly" | "daily") => void
}

const defaultData: BarData[] = [
    { label: "18 Oct", primary: 40, secondary: 20 },
    { label: "25 Oct", primary: 60, secondary: 30 },
    { label: "02 Nov", primary: 75, secondary: 45 },
    { label: "09 Nov", primary: 50, secondary: 25 },
    { label: "16 Nov", primary: 85, secondary: 15 },
]

export function ProductionFlowChart({
    data = defaultData,
    viewMode = "weekly",
    onViewModeChange
}: ProductionFlowChartProps) {
    return (
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">monitoring</span>
                    Production Flow
                </h3>
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

            <div className="h-64 flex items-end justify-between gap-3 px-2">
                {data.map((bar, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full flex flex-col justify-end gap-1 h-full">
                            <div
                                className="w-full bg-[#004D4D] rounded-sm transition-all group-hover:brightness-110"
                                style={{ height: `${bar.primary}%` }}
                            />
                            <div
                                className="w-full bg-emerald-500 rounded-sm transition-all group-hover:brightness-110"
                                style={{ height: `${bar.secondary}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{bar.label}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-4 justify-center">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-[#004D4D]"></div>
                    <span className="text-slate-500">Revenue</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                    <span className="text-slate-500">Completed Jobs</span>
                </div>
            </div>
        </div>
    )
}
