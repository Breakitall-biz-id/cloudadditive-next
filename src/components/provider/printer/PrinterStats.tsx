import { Printer } from "@prisma/client"

interface PrinterStatsProps {
    printers: any[] // Using any for now to match flexible printer type in Fleet
    getEffectiveStatus: (printer: any) => string
}

export function PrinterStats({ printers, getEffectiveStatus }: PrinterStatsProps) {
    const printingCount = printers.filter(p => getEffectiveStatus(p) === 'printing').length
    const onlineCount = printers.filter(p => ['online', 'idle'].includes(getEffectiveStatus(p))).length
    const errorCount = printers.filter(p => ['error', 'maintenance'].includes(getEffectiveStatus(p))).length

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 card-shadow">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Total Printers</span>
                <span className="text-3xl font-bold text-slate-900">{printers.length}</span>
            </div>
            <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 card-shadow">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Active Units</span>
                <span className="text-3xl font-bold text-emerald-500">{printingCount}</span>
            </div>
            <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 card-shadow">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Online / Idle</span>
                <span className="text-3xl font-bold text-blue-500">{onlineCount}</span>
            </div>
            <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 card-shadow">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Issues</span>
                <span className="text-3xl font-bold text-red-500">{errorCount}</span>
            </div>
        </div>
    )
}
