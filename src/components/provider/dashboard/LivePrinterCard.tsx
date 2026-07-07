"use client"

import { Pause, Square } from "lucide-react"

type PrinterStatus = "printing" | "idle" | "error" | "offline" | "cooling"

interface LivePrinterCardProps {
    id: string
    name: string
    material?: string
    status: PrinterStatus
    progress?: number
    filename?: string
    nozzleTemp?: number
    bedTemp?: number
    errorMessage?: string
    onPause?: () => void
    onStop?: () => void
}

const statusConfig: Record<PrinterStatus, {
    color: string,
    pulse: boolean,
    shadow: string,
    borderColor?: string
}> = {
    printing: {
        color: "bg-primary",
        pulse: true,
        shadow: "shadow-[0_0_8px_rgba(16,183,116,0.6)]"
    },
    idle: {
        color: "bg-yellow-400",
        pulse: false,
        shadow: "shadow-[0_0_8px_rgba(250,204,21,0.6)]"
    },
    cooling: {
        color: "bg-yellow-400",
        pulse: false,
        shadow: "shadow-[0_0_8px_rgba(250,204,21,0.6)]"
    },
    error: {
        color: "bg-red-500",
        pulse: false,
        shadow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        borderColor: "border-red-200 dark:border-red-900/50"
    },
    offline: {
        color: "bg-slate-400",
        pulse: false,
        shadow: ""
    }
}

export function LivePrinterCard({
    name,
    material,
    status,
    progress,
    filename,
    nozzleTemp,
    bedTemp,
    errorMessage,
    onPause,
    onStop
}: LivePrinterCardProps) {
    const config = statusConfig[status]
    const isPrinting = status === "printing"
    const isError = status === "error"
    const isIdle = status === "idle" || status === "cooling"

    return (
        <div className={`
            bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm group 
            transition-all hover:border-primary/40
            ${isError ? config.borderColor : "border-slate-200 dark:border-slate-800"}
        `}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-3 h-3 rounded-full ${config.color} ${config.shadow}
                        ${config.pulse ? "animate-pulse" : ""}
                    `} />
                    <div>
                        <h4 className="font-bold">{name}</h4>
                        {material && (
                            <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                {material}
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls - visible on hover when printing */}
                {isPrinting && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onPause && (
                            <button
                                onClick={onPause}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                            >
                                <Pause className="w-4 h-4" />
                            </button>
                        )}
                        {onStop && (
                            <button
                                onClick={onStop}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                            >
                                <Square className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="space-y-4">
                {/* Progress Bar - for printing status */}
                {isPrinting && (
                    <div>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                            <span className="text-slate-500 truncate mr-4">
                                File: {filename || "Unknown"}
                            </span>
                            <span className="text-primary font-bold">{progress || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${progress || 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Idle Status */}
                {isIdle && (
                    <div className="bg-slate-100 dark:bg-slate-800 py-3 rounded-lg text-center">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 italic">
                            {status === "cooling" ? "Cooling - Standby" : "Idle - Ready"}
                        </p>
                    </div>
                )}

                {/* Error Status */}
                {isError && (
                    <div className="bg-red-50 dark:bg-red-900/20 py-3 rounded-lg text-center border border-red-100 dark:border-red-900/30">
                        <p className="text-sm font-bold text-red-600">
                            {errorMessage || "Error"}
                        </p>
                    </div>
                )}

                {/* Offline Status */}
                {status === "offline" && (
                    <div className="bg-slate-100 dark:bg-slate-800 py-3 rounded-lg text-center">
                        <p className="text-sm font-semibold text-slate-500 italic">
                            Offline
                        </p>
                    </div>
                )}

                {/* Temperature Display */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Nozzle</span>
                        <span className="text-lg font-bold">
                            {nozzleTemp !== undefined ? `${nozzleTemp}°C` : "--"}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Bed</span>
                        <span className="text-lg font-bold">
                            {bedTemp !== undefined ? `${bedTemp}°C` : "--"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
