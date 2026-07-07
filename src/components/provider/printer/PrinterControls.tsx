import { Search } from "lucide-react"

interface PrinterControlsProps {
    onSearchChange: (value: string) => void
    searchValue: string
    statusFilter: string
    onStatusFilterChange: (value: string) => void
    sortBy: string
    onSortChange: (value: string) => void
}

export function PrinterControls({
    onSearchChange,
    searchValue,
    statusFilter,
    onStatusFilterChange,
    sortBy,
    onSortChange
}: PrinterControlsProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="relative flex-1 search-focus transition-all rounded-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                    className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-0 focus:border-primary transition-all text-sm font-medium placeholder-slate-400 shadow-sm outline-none"
                    placeholder="Search printers by name, model or status..."
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm"
                >
                    <option value="all">All Status</option>
                    <option value="printing">Printing</option>
                    <option value="paused">Paused</option>
                    <option value="online">Online/Idle</option>
                    <option value="offline">Offline</option>
                    <option value="error">Error</option>
                    <option value="maintenance">Maintenance</option>
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm"
                >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="status">Status</option>
                    <option value="last_seen">Last Seen</option>
                </select>
            </div>
        </div>
    )
}
