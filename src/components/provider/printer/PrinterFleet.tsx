"use client"

import { useState } from "react"
import { PlusCircle, Wifi, WifiOff } from "lucide-react"
import { PrinterCard } from "./PrinterCard"
import { AddPrinterModal } from "./AddPrinterModal"
import { usePrinterStatus } from "@/hooks/usePrinterStatus"
import { PrinterStats } from "./PrinterStats"
import { PrinterControls } from "./PrinterControls"

interface PrinterFleetProps {
    initialPrinters: any[]
    isVerified: boolean
    providerId: string
}

export function PrinterFleet({ initialPrinters, isVerified, providerId }: PrinterFleetProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [sortBy, setSortBy] = useState("name_asc")
    const printers = initialPrinters

    // Subscribe to real-time printer status updates
    const { printerStatuses, isConnected } = usePrinterStatus({ providerId })

    // Calculate stats using real-time data when available
    const getEffectiveStatus = (printer: any) => {
        const liveStatus = printerStatuses[printer.id]
        return liveStatus?.state || printer.status
    }

    const filteredPrinters = printers
        .filter(p =>
            p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            p.model.toLowerCase().includes(searchValue.toLowerCase())
        )
        .filter(p => {
            if (statusFilter === "all") return true
            const effective = getEffectiveStatus(p).toLowerCase()
            if (statusFilter === "online") return ["online", "idle"].includes(effective)
            return effective === statusFilter
        })
        .sort((a, b) => {
            if (sortBy === "name_asc") return a.name.localeCompare(b.name)
            if (sortBy === "name_desc") return b.name.localeCompare(a.name)
            if (sortBy === "status") return getEffectiveStatus(a).localeCompare(getEffectiveStatus(b))
            if (sortBy === "last_seen") {
                const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
                const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
                return bTime - aTime
            }
            return 0
        })

    return (
        <div className="space-y-6">
            <AddPrinterModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Printer Fleet
                        {isConnected ? (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                        ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Connecting...</span>
                        )}
                    </h1>
                    <p className="text-[12px] text-slate-500 font-medium mt-1">Manage and monitor {printers.length} registered printers</p>
                </div>
                {!isVerified ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">lock</span>
                        Account verification pending
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all text-sm shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg filled">add_circle</span> Add New Printer
                    </button>
                )}
            </div>

            {/* Stats Overview */}
            <PrinterStats printers={printers} getEffectiveStatus={getEffectiveStatus} />

            {/* Filters */}
            <PrinterControls
                onSearchChange={setSearchValue}
                searchValue={searchValue}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
            />

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {filteredPrinters.map((printer) => (
                    <PrinterCard
                        key={printer.id}
                        printer={printer}
                        liveStatus={printerStatuses[printer.id] || null}
                    />
                ))}

                {/* Empty State Action */}
                {filteredPrinters.length === 0 && (
                    <button
                        onClick={() => isVerified && setIsAddModalOpen(true)}
                        disabled={!isVerified}
                        className={`col-span-full border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400 hover:border-primary/50 hover:bg-primary/5 transition-all group ${!isVerified ? 'cursor-not-allowed opacity-75' : ''}`}
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <PlusCircle className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No printers found</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
                            {isVerified ? "Add your first machine to start accepting orders." : "Waiting for verification approval."}
                        </p>
                    </button>
                )}
            </div>
        </div>
    )
}
