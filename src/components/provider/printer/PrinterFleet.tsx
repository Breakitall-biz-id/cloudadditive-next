"use client"

import { useState, type ComponentProps } from "react"
import { AlertTriangle, CheckCircle2, Info, PlusCircle, ShieldCheck } from "lucide-react"
import { PrinterCard } from "./PrinterCard"
import { AddPrinterModal } from "./AddPrinterModal"
import { usePrinterStatus } from "@/hooks/usePrinterStatus"
import { PrinterStats } from "./PrinterStats"
import { PrinterControls } from "./PrinterControls"
import type { PrinterReadinessState } from "@/lib/provider-printer-readiness"

type FleetPrinter = ComponentProps<typeof PrinterCard>["printer"] & {
    readiness?: PrinterReadinessState
}

interface PrinterFleetProps {
    initialPrinters: FleetPrinter[]
    isVerified: boolean
    providerId: string
}

function PrinterReadinessBanner({ printers }: { printers: FleetPrinter[] }) {
    const readiness = printers.map((printer) => printer.readiness).filter(Boolean) as PrinterReadinessState[]
    if (readiness.length === 0) return null

    const accepting = readiness.filter((item) => item.canAcceptOrders).length
    const autoStart = readiness.filter((item) => item.canAutoStart).length
    const blocked = readiness.filter((item) => !item.canAutoStart && item.severity !== "ready").length
    const primaryIssue = readiness.find((item) => item.severity === "blocked" || item.severity === "offline")
        ?? readiness.find((item) => item.severity === "busy")
        ?? readiness.find((item) => item.canAutoStart)

    const tone = primaryIssue?.canAutoStart
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
        : primaryIssue?.severity === "busy"
            ? "border-amber-200 bg-amber-50/80 text-amber-950"
            : "border-slate-200 bg-white text-slate-950"

    const Icon = primaryIssue?.canAutoStart ? CheckCircle2 : primaryIssue?.severity === "busy" ? Info : AlertTriangle

    return (
        <section className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-extrabold tracking-tight text-slate-950">Current printer readiness</p>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-black/5">
                                Live queue gate
                            </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-800">
                            {primaryIssue?.printerName}: {primaryIssue?.summary}
                        </p>
                        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                            {primaryIssue?.instruction}
                        </p>
                    </div>
                </div>

                <div className="grid min-w-full grid-cols-3 gap-2 sm:min-w-[420px]">
                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Accepting</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{accepting}/{readiness.length}</p>
                    </div>
                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Auto-start</p>
                        <p className="mt-1 text-2xl font-black text-primary">{autoStart}/{readiness.length}</p>
                    </div>
                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Need action</p>
                        <p className="mt-1 text-2xl font-black text-amber-600">{blocked}</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-white/75 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-black/5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                    Auto-Accepting berarti printer boleh menerima order dari matching system. Auto-start hanya jalan kalau printer online, heartbeat fresh, material cocok, G-code tersedia, dan tidak ada order sebelumnya di <span className="font-bold text-slate-800">POST_PROCESSING</span>. Setelah hasil print diangkat dan status diubah ke <span className="font-bold text-slate-800">PACKING</span>, queue berikutnya boleh diproses.
                </p>
            </div>
        </section>
    )
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

            <PrinterReadinessBanner printers={printers} />

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
