"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Package, Settings, LogOut, Box, Printer, ListOrdered, BarChart3, Factory, User } from "lucide-react"
import { logoutAction } from "@/actions/auth"
import { cn } from "@/lib/utils"

interface DashboardSidebarProps {
    user?: {
        role: "ADMIN" | "PROVIDER" | "CUSTOMER"
        name?: string | null
        email?: string | null
    }
    isVerified?: boolean
}

export function DashboardSidebar({ user, isVerified = true }: DashboardSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()

    // Determine context based on URL
    const isProviderContext = pathname?.startsWith("/provider")

    const isActive = (path: string) => pathname === path

    // Only show switcher if user is a provider (or admin)
    const canSwitch = user?.role === "PROVIDER" || user?.role === "ADMIN"

    return (
        <aside className="w-20 lg:w-64 border-r border-slate-200 bg-white flex flex-col justify-between py-8 transition-all duration-300 h-screen sticky top-0">
            <div className="flex flex-col gap-6">
                {/* Logo Area */}
                <div className="px-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                        {isProviderContext ? <Factory className="w-6 h-6" /> : <Box className="w-6 h-6" strokeWidth={3} />}
                    </div>
                    <div className="hidden lg:block">
                        <h1 className="text-slate-900 text-base font-bold leading-tight uppercase tracking-tight">CloudAdditive</h1>
                        <p className="text-primary text-[10px] font-mono tracking-widest uppercase font-bold">
                            {isProviderContext ? "Provider Portal" : "Customer Area"}
                        </p>
                    </div>
                </div>

                {/* Workspace Switcher */}
                {canSwitch && (
                    <div className="px-4">
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md transition-all text-[12px] font-medium",
                                    !isProviderContext
                                        ? "bg-white text-primary shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <User className="w-4 h-4" />
                                <span className="hidden lg:block">Customer</span>
                            </button>
                            <button
                                onClick={() => router.push('/provider/dashboard')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md transition-all text-[12px] font-medium",
                                    isProviderContext
                                        ? "bg-white text-primary shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Factory className="w-4 h-4" />
                                <span className="hidden lg:block">Provider</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex flex-col gap-2 px-3">
                    {!isProviderContext ? (
                        // Customer Menu
                        <>
                            <NavItem
                                href="/dashboard"
                                icon={LayoutDashboard}
                                label="Dashboard"
                                active={isActive("/dashboard")}
                            />
                            <NavItem
                                href="/dashboard/orders"
                                icon={Package}
                                label="My Orders"
                                active={isActive("/dashboard/orders")}
                            />
                            <NavItem
                                href="/dashboard/settings"
                                icon={Settings}
                                label="Settings"
                                active={isActive("/dashboard/settings")}
                            />
                        </>
                    ) : (
                        // Provider Menu
                        <>
                            <NavItem
                                href="/provider/dashboard"
                                icon={LayoutDashboard} // Changed to Dashboard icon for main dashboard
                                label="Dashboard"
                                active={isActive("/provider/dashboard")}
                                disabled={!isVerified}
                                locked={!isVerified}
                            />
                            <NavItem
                                href="/provider/dashboard/printers"
                                icon={Printer}
                                label="Printer Fleet"
                                active={pathname?.startsWith("/provider/dashboard/printers")}
                                disabled={!isVerified}
                                locked={!isVerified}
                            />
                            <NavItem
                                href="/provider/dashboard/orders"
                                icon={ListOrdered}
                                label="Order Queue"
                                active={isActive("/provider/dashboard/orders")}
                                disabled={!isVerified}
                                locked={!isVerified}
                            />
                            <NavItem
                                href="/provider/dashboard/analytics"
                                icon={BarChart3}
                                label="Analytics"
                                active={isActive("/provider/dashboard/analytics")}
                                disabled={!isVerified}
                                locked={!isVerified}
                            />
                            <NavItem
                                href="/provider/dashboard/settings"
                                icon={Settings}
                                label="Settings"
                                active={isActive("/provider/dashboard/settings")}
                            />
                        </>
                    )}
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className="px-3">
                <form action={logoutAction}>
                    <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="hidden lg:block text-sm font-medium">Logout</span>
                    </button>
                </form>
            </div>
        </aside>
    )
}

function NavItem({ href, icon: Icon, label, active, disabled, locked }: { href: string; icon: any; label: string; active?: boolean; disabled?: boolean; locked?: boolean }) {
    if (disabled) {
        return (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed">
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="hidden lg:block text-sm font-medium">{label}</span>
                </div>
                {locked && <span className="material-symbols-outlined text-sm hidden lg:block">lock</span>}
            </div>
        )
    }

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                active
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
        >
            <Icon className={cn("w-5 h-5", active ? "text-primary" : "text-slate-500 group-hover:text-slate-700")} />
            <span className={cn("hidden lg:block text-sm font-medium", active ? "font-semibold" : "")}>{label}</span>
        </Link>
    )
}
