"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { JobCompletionChart } from "@/components/provider/dashboard/stitch/JobCompletionChart"
import { PrintTimeAnalytics } from "@/components/provider/dashboard/stitch/PrintTimeAnalytics"
import { RevenueCard } from "@/components/provider/dashboard/stitch/RevenueCard"

interface AnalyticsClientProps {
    chartData: {
        weekly: { label: string; completed: number; printHours: number }[]
        daily: { label: string; completed: number; printHours: number }[]
        monthly?: { label: string; completed: number; printHours: number }[]
    }
    printTimeFleets: { name: string; avgHours: number; maxHours?: number; color: "teal" | "emerald" | "slate" }[]
    revenue: {
        totalRevenue: string
        pendingPayout: string
        revenueChange: string
        completedOrders: number
    }
    onExport?: () => void
}

export function AnalyticsClient({ chartData, printTimeFleets, revenue }: AnalyticsClientProps) {
    const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly")
    const [range, setRange] = useState<"7d" | "30d">("7d")

    const handleExport = () => {
        const rows = range === "30d" ? (chartData.monthly || chartData.weekly) : chartData.weekly
        const header = ["Label", "Completed", "PrintHours"]
        const lines = rows.map((r) => [r.label, r.completed, r.printHours])
        const csv = [header, ...lines].map((r) => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `analytics_${range}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
                    <p className="text-sm text-slate-500 mt-1">Insights on production performance and revenue</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setRange("7d")}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border ${range === "7d" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                        Last 7 days
                    </button>
                    <button
                        onClick={() => setRange("30d")}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border ${range === "30d" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                        Last 30 days
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 inline-flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <JobCompletionChart
                        data={viewMode === "weekly"
                            ? (range === "30d" ? (chartData.monthly || chartData.weekly) : chartData.weekly)
                            : chartData.daily}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />
                </div>
                <RevenueCard
                    totalRevenue={revenue.totalRevenue}
                    pendingPayout={revenue.pendingPayout}
                    revenueChange={revenue.revenueChange}
                    completedOrders={revenue.completedOrders}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PrintTimeAnalytics fleets={printTimeFleets} />
            </div>
        </div>
    )
}
