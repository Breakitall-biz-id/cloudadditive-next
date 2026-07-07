"use client"

import { usePrinterStatus } from "@/hooks/usePrinterStatus"
import { PrinterQueueHeader } from "@/components/provider/printer/PrinterQueueHeader"
import { UpcomingJobCard } from "@/components/provider/printer/UpcomingJobCard"
import { ActiveJobPanel } from "@/components/provider/printer/ActiveJobPanel"

export interface PrinterData {
    id: string
    name: string
    model: string
    status: "ONLINE" | "OFFLINE" | "PRINTING" | "PAUSED" | "MAINTENANCE" | "ERROR"
    currentMaterial: string | null
    buildVolume: {
        width: number
        depth: number
        height: number
    }
    lastTemperatures: { hotend?: number; bed?: number } | null
    lastSeenAt: string | null
}

export interface QueueItem {
    id: string
    orderNumber: string
    filename: string
    material: string
    quality: string
    layerHeight: number
    estimatedTime: number // seconds
    weight: number // grams
    thumbnailUrl: string | null
    position: number
    status: string
}

export interface CurrentJob {
    id: string
    orderNumber: string
    filename: string
    material: string
    estimatedTime: number
    startedAt: string | null
    thumbnailUrl: string | null
}

interface PrinterQueueClientProps {
    providerId: string
    printer: PrinterData
    queue: QueueItem[]
    currentJob: CurrentJob | null
}

export function PrinterQueueClient({
    providerId,
    printer,
    queue,
    currentJob
}: PrinterQueueClientProps) {
    // Subscribe to real-time printer updates
    const { getStatus } = usePrinterStatus({ providerId })
    const liveStatus = getStatus(printer.id)

    // Merge live status with initial data
    const currentStatus = liveStatus?.state || printer.status.toLowerCase()
    const isOnline = currentStatus !== "offline"
    const isPrinting = currentStatus === "printing"
    const isPaused = currentStatus === "paused"

    // Live temperatures
    const hotendTemp = liveStatus?.temps?.hotend ?? printer.lastTemperatures?.hotend ?? 0
    const bedTemp = liveStatus?.temps?.bed ?? printer.lastTemperatures?.bed ?? 0

    // Live progress
    const progress = liveStatus?.progress ?? 0

    // Calculate time remaining based on progress
    const calculateTimeRemaining = () => {
        if (!currentJob || !isPrinting || progress <= 0) return null
        const totalSeconds = currentJob.estimatedTime
        const elapsedSeconds = (progress / 100) * totalSeconds
        const remainingSeconds = totalSeconds - elapsedSeconds
        return Math.max(0, Math.round(remainingSeconds))
    }

    const timeRemaining = calculateTimeRemaining()

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <PrinterQueueHeader
                printerName={printer.name}
                model={printer.model}
                status={currentStatus as "printing" | "paused" | "idle" | "offline" | "error"}
                isOnline={isOnline}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Queue Section */}
                <section className="w-[70%] flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
                    <div className="p-8 pb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                                Upcoming Jobs
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {queue.length} {queue.length === 1 ? "item" : "items"} currently in queue
                            </p>
                        </div>
                        <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Auto-Prioritize
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-3 custom-scrollbar">
                        {queue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-sm font-medium">No jobs in queue</p>
                                <p className="text-xs mt-1">Add a job to get started</p>
                            </div>
                        ) : (
                            queue.map((job, index) => (
                                <UpcomingJobCard
                                    key={job.id}
                                    job={job}
                                    index={index}
                                    onStart={() => console.log("Start job:", job.id)}
                                    onRemove={() => console.log("Remove job:", job.id)}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Right: Active Job Panel */}
                <ActiveJobPanel
                    currentJob={currentJob}
                    isPrinting={isPrinting}
                    isPaused={isPaused}
                    progress={progress}
                    timeRemaining={timeRemaining}
                    hotendTemp={hotendTemp}
                    bedTemp={bedTemp}
                />
            </div>
        </div>
    )
}
