"use client"

import { GripVertical, Play, X, Box } from "lucide-react"
import type { QueueItem } from "@/app/(provider)/provider/printers/[printerId]/PrinterQueueClient"

interface UpcomingJobCardProps {
    job: QueueItem
    index: number
    onStart: () => void
    onRemove: () => void
}

// Format duration from seconds to display string
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`
    }
    return `${minutes}m`
}

export function UpcomingJobCard({ job, index, onStart, onRemove }: UpcomingJobCardProps) {
    return (
        <div className="group bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-6 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer">
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400">
                <GripVertical className="w-5 h-5" />
            </div>

            {/* Thumbnail */}
            {job.thumbnailUrl ? (
                <div
                    className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${job.thumbnailUrl})` }}
                />
            ) : (
                <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-300">
                    <Box className="w-8 h-8" />
                </div>
            )}

            {/* Job Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        #{job.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">
                        {job.material}
                    </span>
                </div>
                <h3 className="font-bold text-slate-900 truncate">{job.filename}</h3>
                <p className="text-xs text-slate-500">
                    {job.weight > 0 ? `${job.weight.toFixed(0)}g` : "—"} • {job.layerHeight}mm Layer Height
                </p>
            </div>

            {/* Estimated Time */}
            <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Est. Time
                </p>
                <p className="text-sm font-bold text-slate-700">
                    {formatDuration(job.estimatedTime)}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pl-4 shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onStart()
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Start this job"
                >
                    <Play className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove from queue"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
