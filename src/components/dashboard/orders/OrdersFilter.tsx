"use client"

import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface OrdersFilterProps {
    activeTab: string
    onTabChange: (tab: string) => void
    query: string
    onQueryChange: (value: string) => void
}

export function OrdersFilter({ activeTab, onTabChange, query, onQueryChange }: OrdersFilterProps) {
    const tabs = ["All Orders", "Active", "Completed", "Cancelled"]

    return (
        <div className="flex flex-col lg:flex-row items-center gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-200 card-shadow">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={cn(
                            "px-5 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                            activeTab === tab
                                ? "bg-white text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="h-8 w-px bg-slate-200 hidden lg:block mx-2"></div>

            <div className="flex flex-1 items-center gap-4 w-full">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Search orders, materials, or IDs"
                        className="w-full text-sm border-none bg-transparent focus:ring-0 pl-10 placeholder:text-slate-400 outline-none"
                    />
                </div>
            </div>
        </div>
    )
}
