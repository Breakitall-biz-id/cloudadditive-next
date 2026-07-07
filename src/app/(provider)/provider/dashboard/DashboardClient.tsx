"use client"

import { PrintStatsHero } from "@/components/provider/dashboard/stitch/PrintStatsHero"
import { JobCompletionChart } from "@/components/provider/dashboard/stitch/JobCompletionChart"
import { QueueStatusChart } from "@/components/provider/dashboard/stitch/QueueStatusChart"
import { JobMetricCards } from "@/components/provider/dashboard/stitch/JobMetricCards"
import { PrintTimeAnalytics } from "@/components/provider/dashboard/stitch/PrintTimeAnalytics"
import { RevenueCard } from "@/components/provider/dashboard/stitch/RevenueCard"
import { ActiveUnitsGrid, type ActiveUnit } from "@/components/provider/dashboard/stitch/ActiveUnitsGrid"
import { ProductionQueueTable, type ProductionQueueItem } from "@/components/provider/dashboard/stitch/ProductionQueueTable"
import { usePrinterStatus } from "@/hooks/usePrinterStatus"
import { useState } from "react"

interface PrinterData {
    id: string
    name: string
    material?: string
    status: "printing" | "idle" | "error" | "offline" | "cooling" | "paused"
    progress?: number
    filename?: string
    nozzleTemp?: number
    bedTemp?: number
    lastSeenAt?: string | null
}

interface DashboardStats {
    activePrinters: number
    totalPrinters: number
    queuedJobs: number
    completedToday: number
    completedThisWeek: number
    avgPrintTimeMinutes: number
    successRate: number
    printHoursToday: number
    materialUsedGrams: number
    todayChange: string
    weekChange: string
    jobsByStatus: {
        printing: number
        in_queue: number
        slicing: number
    }
    // Revenue metrics
    totalRevenue: string
    pendingPayout: string
    revenueChange: string
    totalCompletedOrders: number
}

interface DashboardClientProps {
    providerId: string
    printers: PrinterData[]
    stats: DashboardStats
    chartData: {
        weekly: { label: string; completed: number; printHours: number }[]
        daily: { label: string; completed: number; printHours: number }[]
    }
    printTimeFleets: { name: string; avgHours: number; maxHours?: number; color: "teal" | "emerald" | "slate" }[]
    orders: ProductionQueueItem[]
}

// Offline threshold in milliseconds (2 minutes)
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000

export function DashboardClient({
    providerId,
    printers: initialPrinters,
    stats,
    chartData,
    printTimeFleets,
    orders
}: DashboardClientProps) {
    const [chartViewMode, setChartViewMode] = useState<"weekly" | "daily">("weekly")

    // Subscribe to real-time printer updates
    const { getStatus } = usePrinterStatus({ providerId })

    // Merge live status with initial printers and check for offline
    const livePrinters = initialPrinters.map(printer => {
        const liveStatus = getStatus(printer.id)
        const lastSeenAt = liveStatus?.lastSeenAt || printer.lastSeenAt

        // Check if printer is stale (offline)
        const isStale = lastSeenAt
            ? (Date.now() - new Date(lastSeenAt).getTime()) > OFFLINE_THRESHOLD_MS
            : true

        if (liveStatus && !isStale) {
            return {
                ...printer,
                status: liveStatus.state as PrinterData["status"],
                progress: liveStatus.progress,
                filename: liveStatus.currentJob?.filename,
                nozzleTemp: liveStatus.temps?.hotend,
                bedTemp: liveStatus.temps?.bed
            }
        }

        // Mark as offline if stale
        if (isStale && printer.status !== "offline") {
            return { ...printer, status: "offline" as const }
        }

        return printer
    })

    // Transform printers to ActiveUnit format
    const activeUnits: ActiveUnit[] = livePrinters.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status === "printing" ? "active" :
            p.status === "paused" ? "paused" :
                p.status === "idle" || p.status === "cooling" ? "standby" :
                    p.status === "error" ? "error" : "offline",
        progress: p.progress,
        nozzleTemp: p.nozzleTemp,
        targetNozzleTemp: p.status === "printing" ? 215 : undefined,
        bedTemp: p.bedTemp,
        material: p.material || "PLA",
        errorMessage: p.status === "error" ? "Check printer" : undefined,
    }))

    // Recalculate active printers based on live status
    const activePrinters = livePrinters.filter(p => p.status !== "offline").length

    // Format average print time
    const formatAvgTime = (minutes: number) => {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
        }
        return `${minutes}m`
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Monitor production metrics and printer fleet status</p>
            </div>

            {/* Production Overview Hero */}
            <PrintStatsHero
                jobsInQueue={stats.queuedJobs}
                activePrinters={activePrinters}
                totalPrinters={stats.totalPrinters}
                avgPrintTime={formatAvgTime(stats.avgPrintTimeMinutes)}
                successRate={`${stats.successRate}%`}
            />

            {/* Charts Row: Job Completions + Queue Status + Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                    <JobCompletionChart
                        data={chartViewMode === "weekly" ? chartData.weekly : chartData.daily}
                        viewMode={chartViewMode}
                        onViewModeChange={setChartViewMode}
                    />
                </div>
                <QueueStatusChart
                    totalJobs={stats.queuedJobs}
                    items={[
                        { status: "printing", count: stats.jobsByStatus.printing },
                        { status: "in_queue", count: stats.jobsByStatus.in_queue },
                        { status: "slicing", count: stats.jobsByStatus.slicing },
                    ]}
                />
                <RevenueCard
                    totalRevenue={stats.totalRevenue}
                    pendingPayout={stats.pendingPayout}
                    revenueChange={stats.revenueChange}
                    completedOrders={stats.totalCompletedOrders}
                />
            </div>

            {/* Analytics Row: Print Time + Job Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PrintTimeAnalytics fleets={printTimeFleets} />
                <JobMetricCards
                    completedToday={stats.completedToday}
                    completedThisWeek={stats.completedThisWeek}
                    todayChange={stats.todayChange}
                    weekChange={stats.weekChange}
                    printHoursToday={stats.printHoursToday}
                    materialUsedGrams={stats.materialUsedGrams}
                />
            </div>

            {/* Active Units Grid */}
            <ActiveUnitsGrid
                units={activeUnits}
                onlineCount={activePrinters}
                totalCount={stats.totalPrinters}
            />

            {/* Production Queue Table */}
            <ProductionQueueTable items={orders} />
        </div>
    )
}
