"use client"

import { useState } from "react"
import Link from "next/link"
import { Printer as PrinterIcon, Settings, Edit, Trash, Thermometer, Wifi, WifiOff, Activity, Video, Eye, Play, CloudOff, Pause, PlayCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { PrinterStatusData } from "@/hooks/usePrinterStatus"
import { WebcamFeed } from "./WebcamFeed"
import { DeletePrinterModal, EditPrinterModal, PrinterDetailsModal } from "./PrinterModals"
import { startNextQueuedPrint, sendPrinterCommand, getPrinterQueueForSelection, startPrintViaPlugin } from "@/actions/provider-order"
import { toast } from "sonner"

interface PrinterCardProps {
    printer: {
        id: string
        name: string
        model: string
        material?: string
        status: "printing" | "online" | "offline" | "error" | "idle" | "paused"
        thumbUrl?: string
        buildWidth?: number
        buildDepth?: number
        buildHeight?: number
        isAcceptingOrders?: boolean
        preprocessingTime?: number
        currentMaterialId?: string | null
        materialName?: string
        lastTemperatures?: {
            hotend?: number
            tool0?: number
            bed: number
        }
        lastJobInfo?: {
            id: string
            filename: string
            progress: number
            timeRemaining: number | null
        }
        hasQueuedOrders?: boolean
        isOnline?: boolean
        stats: {
            printTime: string
            successRate: string
        }
        lastSeenAt?: string | null
    }
    // Real-time status from Pusher
    liveStatus?: PrinterStatusData | null
}

export function PrinterCard({ printer, liveStatus }: PrinterCardProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [isStartingNext, setIsStartingNext] = useState(false)
    const [isSendingCommand, setIsSendingCommand] = useState(false)
    const [showQueueModal, setShowQueueModal] = useState(false)
    const [queueLoading, setQueueLoading] = useState(false)
    const [queueItems, setQueueItems] = useState<Array<{ id: string; stlFileName: string; status: string; estimatedPrintTime: number | null; createdAt: string; gcodeFileUrl: string | null }>>([])

    // Offline detection: if no update in 2+ minutes, consider offline
    const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes
    const lastSeenAt = liveStatus?.lastSeenAt || printer.lastSeenAt
    const isStale = lastSeenAt
        ? (Date.now() - new Date(lastSeenAt).getTime()) > OFFLINE_THRESHOLD_MS
        : true // No lastSeenAt = never connected = offline

    // Use live status if available and not stale, otherwise check if offline
    const rawStatus = liveStatus?.state || printer.status
    const currentStatus = isStale ? "offline" : rawStatus
    const isOnline = !isStale && liveStatus !== null && liveStatus !== undefined
    const hasWebcam = !!liveStatus?.webcamUrl

    // Format time remaining
    const formatTimeRemaining = (seconds?: number): string => {
        if (!seconds) return ""
        const hours = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        if (hours > 0) return `${hours}h ${mins}m remaining`
        return `${mins}m remaining`
    }

    // Determine status badge style
    const getStatusStyle = () => {
        if (currentStatus === 'printing') {
            return {
                label: 'Printing',
                className: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                indicator: 'bg-emerald-600 pulse-emerald'
            }
        }
        if (currentStatus === 'paused') {
            return {
                label: 'Paused',
                className: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
                indicator: 'bg-orange-500'
            }
        }
        if (currentStatus === 'offline') {
            return {
                label: 'Offline',
                className: 'bg-slate-900 text-white border border-transparent',
                icon: <WifiOff className="w-3.5 h-3.5" />
            }
        }
        if (currentStatus === 'error') {
            return {
                label: 'Error',
                className: 'bg-red-500/10 text-red-600 border border-red-500/20',
                indicator: 'bg-red-500'
            }
        }
        return {
            label: 'Standby',
            className: 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
            indicator: 'bg-amber-500'
        }
    }

    const statusStyle = getStatusStyle()

        return (
            <>
            {/* Modals */}
            <DeletePrinterModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                printer={{ id: printer.id, name: printer.name }}
            />
            <EditPrinterModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                printer={{
                    id: printer.id,
                    name: printer.name,
                    model: printer.model,
                    buildWidth: printer.buildWidth,
                    buildDepth: printer.buildDepth,
                    buildHeight: printer.buildHeight,
                    isAcceptingOrders: printer.isAcceptingOrders,
                    preprocessingTime: printer.preprocessingTime,
                    currentMaterialId: printer.currentMaterialId
                }}
            />
            <PrinterDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                printerId={printer.id}
                printerName={printer.name}
            />

            <div className="bg-white rounded-[1.5rem] border border-slate-100 card-shadow printer-card transition-all duration-300 flex flex-col group overflow-hidden">
                <div className="p-2.5">
                    {/* Header / Display Area - Clickable to go to Queue Detail */}
                    <Link href={`/provider/printers/${printer.id}`} className="block">
                        <div className={cn(
                            "h-52 w-full rounded-[1.2rem] relative flex items-center justify-center overflow-hidden border border-slate-100 cursor-pointer hover:border-slate-200 transition-colors",
                            currentStatus === 'offline' ? "bg-slate-100/40" : "bg-slate-50"
                        )}>
                            {hasWebcam ? (
                                <WebcamFeed
                                    webcamUrl={liveStatus?.webcamUrl || null}
                                    printerName={printer.name}
                                    className={cn("w-full h-full", currentStatus === 'offline' && "opacity-50 grayscale")}
                                />
                            ) : (
                                <div className={cn("flex flex-col items-center justify-center", currentStatus === 'offline' ? "opacity-50" : "text-slate-200")}>
                                    {/* SVG Placeholder matching design */}
                                    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M19 8H5C3.34315 8 2 9.34315 2 11V17C2 18.6569 3.34315 20 5 20H19C20.6569 20 22 18.6569 22 17V11C22 9.34315 20.6569 8 19 8Z" stroke="currentColor" strokeWidth="1.5" className={cn(currentStatus === 'offline' ? "stroke-slate-400" : "stroke-current")}></path>
                                        <path d="M17 8V5C17 3.89543 16.1046 3 15 3H9C7.89543 3 7 3.89543 7 5V8" stroke="currentColor" strokeWidth="1.5" className={cn(currentStatus === 'offline' ? "stroke-slate-400" : "stroke-current")}></path>
                                        <path d="M12 11V14M12 17H12.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2" className={cn(currentStatus === 'offline' ? "stroke-slate-400" : "stroke-current")}></path>
                                    </svg>
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className={cn(
                                "absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                                statusStyle.className
                            )}>
                                {statusStyle.indicator && (
                                    <div className={cn("w-2 h-2 rounded-full", statusStyle.indicator)}></div>
                                )}
                                {statusStyle.icon}
                                {statusStyle.label}
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Content Section */}
                <div className={cn(
                    "px-7 pb-7 pt-4 space-y-5",
                    currentStatus === 'offline' && "opacity-60 grayscale-[0.5]"
                )}>
                    {/* Header Info */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-900">{printer.name}</h3>
                            <p className="text-[12px] font-semibold text-slate-400">{printer.model}</p>
                        </div>
                        {printer.material && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                                {printer.material}
                            </span>
                        )}
                    </div>

                    {/* Auto-Accept Status */}
                    <div className="flex items-center gap-3 h-7">
                        {printer.isAcceptingOrders && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-100/50">
                                <span className="material-symbols-outlined text-[14px] filled">check_circle</span> Auto-Accepting
                            </span>
                        )}
                        {printer.preprocessingTime && printer.preprocessingTime > 0 && (
                            <span className="text-[11px] text-slate-400 font-semibold">+{printer.preprocessingTime}m prep</span>
                        )}
                    </div>

                    {/* Temperature Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {(() => {
                            const displayTemps = liveStatus?.temps || printer.lastTemperatures
                            type TempData = { hotend?: number; tool0?: number; bed?: number }
                            const temps = displayTemps as TempData | undefined
                            const hotendTemp = temps?.hotend || temps?.tool0 || null
                            const bedTemp = temps?.bed || null

                            return (
                                <>
                                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/60 flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                            <Thermometer className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Hotend</p>
                                            <p className="text-[13px] font-extrabold text-slate-800">
                                                {hotendTemp ? `${Math.round(hotendTemp)}°C` : '--°C'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/60 flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                            <Activity className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Bed</p>
                                            <p className="text-[13px] font-extrabold text-slate-800">
                                                {bedTemp ? `${Math.round(bedTemp)}°C` : '--°C'}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )
                        })()}
                    </div>

                    {/* Dynamic Action Zone: Progress or Start Job */}
                    {currentStatus === 'printing' ? (
                        <div className="pt-2">
                            {(() => {
                                const displayJob = liveStatus?.currentJob || printer.lastJobInfo
                                const displayProgress = liveStatus?.progress ?? (printer.lastJobInfo?.progress || 0)
                                const timeRemaining = displayJob?.timeRemaining || null

                                return (
                                    <>
                                        <div className="flex justify-between items-end mb-2.5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                                                <span className="text-xl font-black text-slate-900">{Math.round(displayProgress)}%</span>
                                            </div>
                                            {timeRemaining && (
                                                <span className="text-[12px] font-semibold text-slate-500 mb-1">
                                                    {formatTimeRemaining(timeRemaining)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${displayProgress}%` }}
                                            ></div>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    ) : currentStatus === 'offline' ? (
                        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                            <CloudOff className="text-slate-300 mb-2 w-6 h-6" />
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Connection</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 border border-slate-100 rounded-2xl bg-slate-50/40">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">System Ready</span>
                            <button
                                onClick={async () => {
                                    if (!isOnline) {
                                        toast.error("Printer is offline")
                                        return
                                    }
                                    if (printer.isAcceptingOrders === false) {
                                        toast.error("Printer is not accepting orders")
                                        return
                                    }
                                    if (!printer.hasQueuedOrders) {
                                        toast.error("No queued orders for this printer")
                                        return
                                    }
                                    setIsStartingNext(true)
                                    const result = await startNextQueuedPrint(printer.id)
                                    setIsStartingNext(false)
                                    if (!result.success) {
                                        toast.error(result.error || "Failed to start next order")
                                        return
                                    }
                                    toast.success(result.message || "Next job started")
                                }}
                                disabled={isStartingNext}
                                className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:brightness-105 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                {isStartingNext ? "Starting..." : "Start Next Job"}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!isOnline) {
                                        toast.error("Printer is offline")
                                        return
                                    }
                                    setQueueLoading(true)
                                    const result = await getPrinterQueueForSelection(printer.id)
                                    setQueueLoading(false)
                                    if (!result.success || !result.orders) {
                                        toast.error(result.error || "Failed to load queue")
                                        return
                                    }
                                    setQueueItems(result.orders.map(o => ({
                                        ...o,
                                        createdAt: o.createdAt.toISOString(),
                                    })))
                                    setShowQueueModal(true)
                                }}
                                className="mt-3 text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                                disabled={queueLoading}
                            >
                                {queueLoading ? "Loading..." : "Select Job"}
                            </button>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <button
                            onClick={() => setShowDetailsModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">key</span> View Token
                        </button>
                        <div className="flex items-center gap-2">
                            {/* Printer Controls */}
                            {currentStatus === "printing" && (
                                <>
                                    <button
                                        onClick={async () => {
                                            setIsSendingCommand(true)
                                            const result = await sendPrinterCommand(printer.id, "job:pause")
                                            setIsSendingCommand(false)
                                            if (!result.success) {
                                                toast.error(result.error || "Failed to pause")
                                            } else {
                                                toast.success(result.message || "Paused")
                                            }
                                        }}
                                        disabled={isSendingCommand}
                                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-60"
                                        title="Pause"
                                    >
                                        <Pause className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setIsSendingCommand(true)
                                            const result = await sendPrinterCommand(printer.id, "job:cancel")
                                            setIsSendingCommand(false)
                                            if (!result.success) {
                                                toast.error(result.error || "Failed to cancel")
                                            } else {
                                                toast.success(result.message || "Cancelled")
                                            }
                                        }}
                                        disabled={isSendingCommand}
                                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-60"
                                        title="Cancel"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                            {currentStatus === "paused" && (
                                <button
                                    onClick={async () => {
                                        setIsSendingCommand(true)
                                        const result = await sendPrinterCommand(printer.id, "job:resume")
                                        setIsSendingCommand(false)
                                        if (!result.success) {
                                            toast.error(result.error || "Failed to resume")
                                        } else {
                                            toast.success(result.message || "Resumed")
                                        }
                                    }}
                                    disabled={isSendingCommand}
                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-60"
                                    title="Resume"
                                >
                                    <PlayCircle className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showQueueModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 border border-slate-100 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Select Job to Print</h3>
                            <button onClick={() => setShowQueueModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                            {queueItems.length === 0 && (
                                <div className="text-sm text-slate-500 text-center py-6">No queued orders.</div>
                            )}
                            {queueItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{item.stlFileName}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {item.status} • {new Date(item.createdAt).toLocaleString("id-ID")}
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!item.gcodeFileUrl) {
                                                toast.error("G-code not uploaded yet")
                                                return
                                            }
                                            const result = await startPrintViaPlugin(item.id)
                                            if (!result.success) {
                                                toast.error(result.error || "Failed to start print")
                                                return
                                            }
                                            toast.success(result.message || "Print started")
                                            setShowQueueModal(false)
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:brightness-110"
                                    >
                                        Start
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
