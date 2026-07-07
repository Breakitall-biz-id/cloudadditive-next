"use client"

import { ShieldCheck, Box } from "lucide-react"
import { TelemetryChart } from "./TelemetryChart"
import type { CurrentJob } from "@/app/(provider)/provider/printers/[printerId]/PrinterQueueClient"

interface ActiveJobPanelProps {
    currentJob: CurrentJob | null
    isPrinting: boolean
    isPaused: boolean
    progress: number
    timeRemaining: number | null
    hotendTemp: number
    bedTemp: number
}

// Format time remaining to display string
function formatTimeRemaining(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Calculate elapsed time from start
function formatElapsedTime(startedAt: string | null): string {
    if (!startedAt) return "—"
    const start = new Date(startedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `Started ${hours}h ${minutes}m ago`
}

export function ActiveJobPanel({
    currentJob,
    isPrinting,
    isPaused,
    progress,
    timeRemaining,
    hotendTemp,
    bedTemp
}: ActiveJobPanelProps) {
    // SVG circle properties
    const radius = 74
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
        <aside className="w-[30%] bg-white flex flex-col border-l border-slate-200 overflow-y-auto custom-scrollbar">
            <div className="p-8 space-y-8">
                {/* Active Job Section */}
                <div>
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
                        Active Job
                    </h2>

                    {/* Progress Circle */}
                    <div className="aspect-square w-full bg-slate-50 rounded-3xl border border-slate-100 relative flex flex-col items-center justify-center overflow-hidden group">
                        {/* Background Icon */}
                        <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                            <Box className="w-40 h-40 text-slate-400" />
                        </div>

                        {/* Webcam indicator */}
                        {isPrinting && (
                            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 shadow-sm">
                                {isPaused ? "Paused" : "Orbit-Cam Active"}
                            </div>
                        )}

                        {/* Circular Progress */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative h-40 w-40 flex items-center justify-center">
                                <svg className="h-full w-full rotate-[-90deg]">
                                    {/* Background circle */}
                                    <circle
                                        className="text-slate-100"
                                        cx="80"
                                        cy="80"
                                        r={radius}
                                        fill="transparent"
                                        stroke="currentColor"
                                        strokeWidth="10"
                                        strokeDasharray={circumference}
                                    />
                                    {/* Progress circle */}
                                    <circle
                                        className={isPaused ? "text-orange-500" : "text-emerald-500"}
                                        cx="80"
                                        cy="80"
                                        r={radius}
                                        fill="transparent"
                                        stroke="currentColor"
                                        strokeWidth="10"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        style={{ transition: "stroke-dashoffset 0.5s ease" }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-slate-900 leading-none">
                                        {currentJob ? `${Math.round(progress)}%` : "—"}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                        {isPrinting ? "Done" : isPaused ? "Paused" : "Idle"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Job Info */}
                    {currentJob ? (
                        <div className="mt-6 flex justify-between items-end">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    {currentJob.filename.replace(/\.[^/.]+$/, "")}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {formatElapsedTime(currentJob.startedAt)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-extrabold ${isPaused ? "text-orange-600" : "text-emerald-600"}`}>
                                    {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "—"}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Remaining
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-400">No active job</p>
                        </div>
                    )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Live Telemetry */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Live Telemetry
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                <div className="w-2 h-2 rounded-full bg-orange-400" /> Hotend
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                <div className="w-2 h-2 rounded-full bg-blue-400" /> Bed
                            </div>
                        </div>
                    </div>

                    {/* Hotend Temperature */}
                    <TelemetryChart
                        label="Hotend Temperature"
                        value={hotendTemp}
                        unit="°C"
                        color="orange"
                        maxValue={300}
                    />

                    {/* Bed Temperature */}
                    <TelemetryChart
                        label="Heated Bed"
                        value={bedTemp}
                        unit="°C"
                        color="blue"
                        maxValue={120}
                    />
                </div>

                {/* Health Check */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">Health Check: Normal</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                            <span>Fan Speed</span>
                            <span>100%</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                            <span>Flow Rate</span>
                            <span>98%</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
