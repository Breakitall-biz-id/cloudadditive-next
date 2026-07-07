"use client"

interface FleetData {
    name: string
    avgHours: number
    maxHours?: number
    color: "teal" | "emerald" | "slate"
}

interface PrintTimeAnalyticsProps {
    fleets?: FleetData[]
}

export function PrintTimeAnalytics({ fleets = [] }: PrintTimeAnalyticsProps) {
    const colorMap = {
        teal: "bg-[#004D4D]",
        emerald: "bg-emerald-500",
        slate: "bg-slate-300",
    }

    return (
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">timer</span>
                    Print Time Analytics
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg. Hours Per Day</p>
            </div>

            {fleets.length > 0 ? (
                <div className="space-y-4">
                    {fleets.map((fleet, index) => {
                        const percentage = ((fleet.avgHours / (fleet.maxHours || 24)) * 100).toFixed(0)

                        return (
                            <div key={index} className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-600">{fleet.name}</span>
                                    <span>{fleet.avgHours} hrs/avg</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`${colorMap[fleet.color]} h-full rounded-full transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-sm text-slate-400">No completed jobs in the last 7 days.</div>
            )}
        </div>
    )
}
