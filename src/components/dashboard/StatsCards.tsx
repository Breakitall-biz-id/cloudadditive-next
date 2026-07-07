"use client"

interface StatsCardsProps {
    totalOrders: number
    totalSpent: number
    activePrints: number
    completedOrders: number
}

const formatShortNumber = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return `${value}`
}

export function StatsCards({ totalOrders, totalSpent, activePrints, completedOrders }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                label="Total Orders"
                value={totalOrders}
                subtext="All time"
                subtextColor="text-slate-500"
                valueColor="text-slate-900"
            />
            <StatCard
                label="Total Spent"
                value={formatShortNumber(totalSpent)}
                subtext="Rp"
                subtextColor="text-slate-400 font-mono"
                valueColor="text-slate-900"
                borderColor="border-l-4 border-l-primary"
            />
            <StatCard
                label="Active Prints"
                value={activePrints}
                subtext="In progress"
                subtextColor="text-slate-500"
                valueColor="text-primary"
            />
            <StatCard
                label="Completed"
                value={completedOrders}
                subtext="Successful"
                subtextColor="text-slate-500"
                valueColor="text-slate-900"
            />
        </div>
    )
}

function StatCard({ label, value, subtext, subtextColor, valueColor, borderColor }: any) {
    return (
        <div className={`bg-white p-6 rounded-2xl flex flex-col items-center text-center border border-slate-200 card-shadow shadow-sm ${borderColor || ''}`}>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</span>
            <p className={`text-3xl font-mono font-bold ${valueColor}`}>{value}</p>
            <div className={`mt-2 text-[10px] font-bold ${subtextColor}`}>{subtext}</div>
        </div>
    )
}
