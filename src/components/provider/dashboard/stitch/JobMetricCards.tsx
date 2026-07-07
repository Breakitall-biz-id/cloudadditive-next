"use client"

interface JobMetricCardsProps {
    completedToday: number
    completedThisWeek: number
    todayChange: string
    weekChange: string
    printHoursToday: number
    materialUsedGrams: number
}

export function JobMetricCards({
    completedToday = 0,
    completedThisWeek = 0,
    todayChange = "+0%",
    weekChange = "+0%",
    printHoursToday = 0,
    materialUsedGrams = 0
}: JobMetricCardsProps) {
    const formatMaterial = (grams: number) => {
        if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`
        return `${grams}g`
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Completed Today Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow flex-1 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-outlined filled">task_alt</span>
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed Today</p>
                    <div className="flex items-center gap-2">
                        <h4 className="text-2xl font-bold">{completedToday} jobs</h4>
                        {todayChange && (
                            <span className={`text-[10px] font-bold ${todayChange.startsWith("+") ? "text-emerald-500" : "text-slate-400"
                                }`}>
                                {todayChange} {todayChange.startsWith("+") ? "↗" : ""}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Weekly Stats Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow flex-1 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">calendar_month</span>
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">This Week</p>
                    <div className="flex items-center gap-2">
                        <h4 className="text-2xl font-bold">{completedThisWeek} jobs</h4>
                        {weekChange && (
                            <span className={`text-[10px] font-bold ${weekChange.startsWith("+") ? "text-emerald-500" : "text-red-500"
                                }`}>
                                {weekChange} vs last week
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Print Hours & Material Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 card-shadow">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Print Hours</p>
                    </div>
                    <h4 className="text-xl font-bold">{printHoursToday}h</h4>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 card-shadow">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">deployed_code</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Material</p>
                    </div>
                    <h4 className="text-xl font-bold">{formatMaterial(materialUsedGrams)}</h4>
                </div>
            </div>
        </div>
    )
}
