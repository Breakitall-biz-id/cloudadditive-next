"use client"

import Link from "next/link"
import { LivePrinterCard } from "./LivePrinterCard"
import { Activity } from "lucide-react"

interface PrinterData {
    id: string
    name: string
    material?: string
    status: "printing" | "idle" | "error" | "offline" | "cooling"
    progress?: number
    filename?: string
    nozzleTemp?: number
    bedTemp?: number
    errorMessage?: string
}

interface LiveFleetStatusProps {
    printers: PrinterData[]
    maxDisplay?: number
    onPausePrinter?: (id: string) => void
    onStopPrinter?: (id: string) => void
}

export function LiveFleetStatus({
    printers,
    maxDisplay = 4,
    onPausePrinter,
    onStopPrinter
}: LiveFleetStatusProps) {
    // Show only first N printers, prioritize printing/error first
    const sortedPrinters = [...printers].sort((a, b) => {
        const priority: Record<string, number> = {
            printing: 0,
            error: 1,
            idle: 2,
            cooling: 3,
            offline: 4
        }
        return (priority[a.status] || 5) - (priority[b.status] || 5)
    })

    const displayPrinters = sortedPrinters.slice(0, maxDisplay)

    return (
        <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Live Fleet Status
                </h2>
                <Link
                    href="/provider/dashboard/printers"
                    className="text-sm font-semibold text-primary hover:underline"
                >
                    View All Units
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayPrinters.map((printer) => (
                    <LivePrinterCard
                        key={printer.id}
                        {...printer}
                        onPause={onPausePrinter ? () => onPausePrinter(printer.id) : undefined}
                        onStop={onStopPrinter ? () => onStopPrinter(printer.id) : undefined}
                    />
                ))}

                {displayPrinters.length === 0 && (
                    <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <p className="text-slate-500">No printers connected yet</p>
                        <Link
                            href="/provider/dashboard/printers"
                            className="text-primary hover:underline text-sm mt-2 inline-block"
                        >
                            Add your first printer
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
