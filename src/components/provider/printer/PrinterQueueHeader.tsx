"use client"

import Link from "next/link"
import { ArrowLeft, Pause, Trash2, Plus, WifiOff } from "lucide-react"

interface PrinterQueueHeaderProps {
    printerName: string
    model: string
    status: "printing" | "paused" | "idle" | "offline" | "error"
    isOnline: boolean
}

const statusConfig = {
    printing: {
        label: "Printing",
        className: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
        indicator: "bg-emerald-600 animate-pulse"
    },
    paused: {
        label: "Paused",
        className: "bg-orange-50 text-orange-600 border-orange-100/50",
        indicator: "bg-orange-500"
    },
    idle: {
        label: "Idle",
        className: "bg-amber-50 text-amber-600 border-amber-100/50",
        indicator: "bg-amber-500"
    },
    offline: {
        label: "Offline",
        className: "bg-slate-100 text-slate-600 border-slate-200",
        indicator: null
    },
    error: {
        label: "Error",
        className: "bg-red-50 text-red-600 border-red-100/50",
        indicator: "bg-red-500"
    }
}

export function PrinterQueueHeader({
    printerName,
    model,
    status,
    isOnline
}: PrinterQueueHeaderProps) {
    const statusStyle = statusConfig[status] || statusConfig.idle

    return (
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
            <div className="flex items-center gap-5">
                {/* Back Button */}
                <Link
                    href="/provider/dashboard"
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                <div className="h-6 w-px bg-slate-200" />

                {/* Printer Info */}
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-none">
                            {printerName}
                        </h1>
                        <div className="flex items-center gap-2">
                            {/* Status Badge */}
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyle.className}`}>
                                {statusStyle.indicator && (
                                    <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.indicator}`} />
                                )}
                                {status === "offline" && <WifiOff className="w-3 h-3" />}
                                {statusStyle.label}
                            </span>
                            {/* Online Badge */}
                            {isOnline && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100/50 uppercase tracking-wider">
                                    Online
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
                        Model: {model}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
                    <Pause className="w-4 h-4" />
                    <span>Pause Queue</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 hover:border-red-100 transition-all shadow-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>Flush Queue</span>
                </button>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <button className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-all text-xs shadow-sm shadow-emerald-500/20">
                    <Plus className="w-4 h-4" />
                    <span>Add Job to Machine</span>
                </button>
            </div>
        </header>
    )
}
