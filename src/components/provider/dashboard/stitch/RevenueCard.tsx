"use client"

import Link from "next/link"

interface RevenueCardProps {
    totalRevenue: string
    pendingPayout: string
    revenueChange: string
    completedOrders: number
}

export function RevenueCard({
    totalRevenue = "Rp 0",
    pendingPayout = "Rp 0",
    revenueChange = "+0%",
    completedOrders = 0
}: RevenueCardProps) {
    const isPositive = revenueChange.startsWith("+")

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">payments</span>
                    Revenue
                </h3>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
                    }`}>
                    {revenueChange} this month
                </span>
            </div>

            <div className="space-y-4">
                {/* Total Revenue */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-primary">{totalRevenue}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Payout</p>
                        <p className="text-lg font-bold">{pendingPayout}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Orders Completed</p>
                        <p className="text-lg font-bold">{completedOrders}</p>
                    </div>
                </div>

                {/* Payout Button */}
                <Link
                    href="/provider/dashboard/settings"
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl font-bold hover:brightness-110 transition-all text-sm"
                >
                    <span className="material-symbols-outlined text-sm">account_balance</span>
                    Request Payout
                </Link>
            </div>
        </div>
    )
}
