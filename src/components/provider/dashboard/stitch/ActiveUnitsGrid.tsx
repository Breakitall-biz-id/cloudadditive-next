"use client"

export interface ActiveUnit {
    id: string
    name: string
    model?: string
    status: "active" | "standby" | "paused" | "error" | "offline"
    progress?: number
    nozzleTemp?: number
    targetNozzleTemp?: number
    bedTemp?: number
    material?: string
    errorMessage?: string
}

interface ActiveUnitCardProps {
    unit: ActiveUnit
}

export function ActiveUnitCard({ unit }: ActiveUnitCardProps) {
    const statusConfig = {
        active: {
            label: `${unit.progress || 0}% Active`,
            color: "text-emerald-500",
            tempColor: "text-slate-900",
        },
        standby: {
            label: "Standby",
            color: "text-slate-400",
            tempColor: "text-slate-400",
        },
        paused: {
            label: "Paused",
            color: "text-amber-500",
            tempColor: "text-amber-600",
        },
        error: {
            label: "Error ⚠️",
            color: "text-red-500",
            tempColor: "text-red-400",
        },
        offline: {
            label: "Offline",
            color: "text-slate-400",
            tempColor: "text-slate-400",
        },
    }

    const config = statusConfig[unit.status]

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {unit.name}
                </h4>
                <span className={`text-[10px] font-bold ${config.color}`}>
                    {config.label}
                </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
                <h5 className={`text-3xl font-bold tracking-tight ${config.tempColor}`}>
                    {unit.nozzleTemp || 0}°
                </h5>
                {unit.targetNozzleTemp && unit.status !== "error" && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${unit.status === "active"
                        ? "text-emerald-500 bg-emerald-500/10"
                        : "text-slate-300 bg-slate-50"
                        }`}>
                        Target: {unit.targetNozzleTemp}°
                    </span>
                )}
            </div>

            <p className={`text-[10px] font-medium mb-4 ${unit.status === "error" ? "text-red-500 font-bold" : "text-slate-500"
                }`}>
                {unit.errorMessage || (unit.status === "standby" ? "Cooling Down" : "Nozzle Temperature")}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Bed Temp</span>
                    <span className="text-sm font-bold">{unit.bedTemp || 0}°C</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Material</span>
                    <span className={`text-sm font-bold ${unit.status === "offline" || unit.status === "error"
                        ? "text-slate-400"
                        : "text-[#004D4D]"
                        }`}>
                        {unit.material || "N/A"}
                    </span>
                </div>
            </div>
        </div>
    )
}

interface ActiveUnitsGridProps {
    units: ActiveUnit[]
    onlineCount?: number
    totalCount?: number
}

export function ActiveUnitsGrid({ units, onlineCount, totalCount }: ActiveUnitsGridProps) {
    const online = onlineCount ?? units.filter(u => u.status !== "offline").length
    const total = totalCount ?? units.length

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Active Units</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {online} of {total} units online
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {units.map((unit) => (
                    <ActiveUnitCard key={unit.id} unit={unit} />
                ))}
            </div>
        </section>
    )
}
