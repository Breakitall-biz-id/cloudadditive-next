"use client"

interface HeroBalanceProps {
    totalEarnings: string
    percentChange: string
    lastUpdated?: string
}

export function HeroBalance({ totalEarnings, percentChange, lastUpdated = "5m ago" }: HeroBalanceProps) {
    const isPositive = percentChange.startsWith("+") || !percentChange.startsWith("-")

    return (
        <section className="bg-[#004D4D] rounded-2xl p-8 relative overflow-hidden shadow-xl">
            {/* Decorative circles */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-4 left-4 w-24 h-24 border border-white rounded-full"></div>
                <div className="absolute top-8 right-8 w-32 h-32 border border-white rounded-full"></div>
                <div className="absolute bottom-4 left-20 w-16 h-16 border border-white rounded-full"></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <p className="text-emerald-400/80 text-sm font-medium mb-1">Total Balance / Earnings</p>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">{totalEarnings}</h2>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPositive
                                ? "text-emerald-400 bg-emerald-400/10"
                                : "text-red-400 bg-red-400/10"
                            }`}>
                            {percentChange} {isPositive ? "↗" : "↘"}
                        </span>
                    </div>
                    <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-semibold">Updated {lastUpdated}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all text-sm">
                        <span className="material-symbols-outlined text-sm filled">add</span> Add
                    </button>
                    <button className="flex items-center gap-2 bg-white/10 text-white px-6 py-2.5 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all text-sm">
                        <span className="material-symbols-outlined text-sm">north_east</span> Send
                    </button>
                    <button className="flex items-center gap-2 bg-white/10 text-white px-6 py-2.5 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all text-sm">
                        <span className="material-symbols-outlined text-sm">cached</span> Request
                    </button>
                    <button className="flex items-center justify-center bg-white/10 text-white w-10 rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                        <span className="material-symbols-outlined text-sm">more_horiz</span>
                    </button>
                </div>
            </div>
        </section>
    )
}
