"use client"

import Link from "next/link"

interface PrintStatsHeroProps {
    jobsInQueue: number
    activePrinters: number
    totalPrinters: number
    avgPrintTime: string
    successRate: string
}

export function PrintStatsHero({
    jobsInQueue,
    activePrinters,
    totalPrinters,
    avgPrintTime,
    successRate
}: PrintStatsHeroProps) {
    return (
        <section className="bg-primary rounded-2xl p-8 relative overflow-hidden shadow-xl">
            {/* Decorative circles */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-4 left-4 w-24 h-24 border border-white rounded-full"></div>
                <div className="absolute top-8 right-8 w-32 h-32 border border-white rounded-full"></div>
                <div className="absolute bottom-4 left-20 w-16 h-16 border border-white rounded-full"></div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-emerald-400 filled">print</span>
                    <p className="text-emerald-400/80 text-sm font-medium">Production Overview</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Jobs in Queue */}
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">{jobsInQueue}</h2>
                            {jobsInQueue > 0 && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold text-amber-400 bg-amber-400/10">
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Jobs in Queue</p>
                    </div>

                    {/* Active Printers */}
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                                {activePrinters}<span className="text-xl text-white/40">/{totalPrinters}</span>
                            </h2>
                        </div>
                        <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Printers Online</p>
                    </div>

                    {/* Avg Print Time */}
                    <div className="space-y-1">
                        <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">{avgPrintTime}</h2>
                        <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Avg Print Time</p>
                    </div>

                    {/* Success Rate */}
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">{successRate}</h2>
                            <span className="px-2 py-0.5 rounded text-xs font-bold text-emerald-400 bg-emerald-400/10">
                                Excellent
                            </span>
                        </div>
                        <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Success Rate</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-white/10">
                    <Link
                        href="/provider/dashboard/orders"
                        className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold hover:brightness-110 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-sm">add</span> New Job
                    </Link>
                    <Link
                        href="/provider/dashboard/printers"
                        className="flex items-center gap-2 bg-white/10 text-white px-5 py-2 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-sm">print</span> Manage Printers
                    </Link>
                    <Link
                        href="/provider/dashboard/analytics"
                        className="flex items-center gap-2 bg-white/10 text-white px-5 py-2 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-sm">analytics</span> View Reports
                    </Link>
                </div>
            </div>
        </section>
    )
}
