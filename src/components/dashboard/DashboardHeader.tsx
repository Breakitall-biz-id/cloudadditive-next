"use client"

import { Search, Bell } from "lucide-react"
import { Session } from "next-auth"

interface DashboardHeaderProps {
    user?: Session["user"]
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
    return (
        <header className="flex items-center justify-between px-10 py-6 bg-transparent">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                        placeholder="Search orders, materials, or files..."
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                {/* Notifications */}
                <button className="relative w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm text-slate-600 hover:text-primary">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white ring-1 ring-white"></span>
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full pl-1 pr-4 py-1 shadow-sm hover:border-primary/50 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative">
                        {user?.image ? (
                            <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {user?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                        )}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{user?.name || "User"}</span>
                </div>
            </div>
        </header>
    )
}
