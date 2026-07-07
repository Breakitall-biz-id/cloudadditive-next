"use client"

import { StatCard } from "./StatCard"
import { Printer, ListOrdered, Wallet, CheckCircle } from "lucide-react"

interface StatsGridProps {
    activePrinters: number
    totalPrinters: number
    queuedJobs: number
    queueTrend?: string
    earnings: string
    earningsTrend?: string
    completionRate: string
    completionTrend?: string
}

export function StatsGrid({
    activePrinters,
    totalPrinters,
    queuedJobs,
    queueTrend,
    earnings,
    earningsTrend,
    completionRate,
    completionTrend
}: StatsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title="Active Printers"
                value={activePrinters}
                subtitle={`of ${totalPrinters} total`}
                icon={<Printer className="w-5 h-5" />}
                trend={activePrinters === totalPrinters
                    ? { value: "All printers active", direction: "up" }
                    : { value: `${totalPrinters - activePrinters} offline`, direction: "neutral" }
                }
            />
            <StatCard
                title="Queue"
                value={queuedJobs}
                subtitle="Jobs"
                icon={<ListOrdered className="w-5 h-5" />}
                trend={queueTrend ? { value: queueTrend, direction: "up" } : undefined}
            />
            <StatCard
                title="Earnings"
                value={earnings}
                icon={<Wallet className="w-5 h-5" />}
                trend={earningsTrend ? { value: earningsTrend, direction: "up" } : undefined}
            />
            <StatCard
                title="Completion"
                value={completionRate}
                icon={<CheckCircle className="w-5 h-5" />}
                trend={completionTrend ? { value: completionTrend, direction: "up" } : undefined}
            />
        </div>
    )
}
