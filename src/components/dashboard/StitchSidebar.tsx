"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"
import { logoutAction } from "@/actions/auth"

interface StitchSidebarProps {
    user?: {
        role: "ADMIN" | "PROVIDER" | "CUSTOMER"
        name?: string | null
        email?: string | null
        image?: string | null
    }
    isVerified?: boolean
    hasProviderProfile?: boolean // Whether user has registered as provider
}

export function StitchSidebar({ user, isVerified = true, hasProviderProfile = false }: StitchSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Detect current context based on URL
    const isProviderContext = pathname?.startsWith("/provider")

    // Can switch roles if user is provider/admin OR if they have a provider profile
    const canSwitch = user?.role === "PROVIDER" || user?.role === "ADMIN" || hasProviderProfile

    const isActive = (path: string) => pathname === path
    const isActivePrefix = (prefix: string) => pathname?.startsWith(prefix)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowRoleSwitcher(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleRoleSwitch = (targetContext: "provider" | "customer") => {
        setShowRoleSwitcher(false)
        if (targetContext === "provider") {
            router.push("/provider/dashboard")
        } else {
            router.push("/dashboard")
        }
    }

    // Provider navigation items
    const providerNavItems = [
        { href: "/provider/dashboard", icon: "dashboard", label: "Dashboard", exact: true },
        { href: "/provider/dashboard/printers", icon: "print", label: "Active Units" },
        { href: "/provider/dashboard/orders", icon: "list_alt", label: "Queue" },
        { href: "/provider/dashboard/analytics", icon: "analytics", label: "Analytics" },
    ]

    const providerSystemItems = [
        { href: "/provider/dashboard/settings", icon: "settings", label: "Settings" },
        { href: "/help", icon: "help", label: "Help Center" },
    ]

    // Customer navigation items
    const customerNavItems = [
        { href: "/dashboard", icon: "dashboard", label: "Dashboard", exact: true },
        { href: "/order", icon: "add_circle", label: "New Order" },
        { href: "/dashboard/orders", icon: "package_2", label: "My Orders" },
    ]

    const customerSystemItems = [
        { href: "/dashboard/settings", icon: "settings", label: "Settings" },
        { href: "/help", icon: "help", label: "Help Center" },
    ]

    // Select nav items based on context
    const navItems = isProviderContext ? providerNavItems : customerNavItems
    const systemItems = isProviderContext ? providerSystemItems : customerSystemItems

    return (
        <aside className="w-full h-full border-r border-slate-200 flex flex-col bg-white overflow-y-auto">
            {/* Logo with Role Switcher */}
            <div className="p-6" ref={dropdownRef}>
                <div
                    className={cn(
                        "flex items-center gap-3 p-2 border border-slate-100 rounded-xl transition-colors",
                        canSwitch ? "hover:bg-slate-50 cursor-pointer" : ""
                    )}
                    onClick={() => canSwitch && setShowRoleSwitcher(!showRoleSwitcher)}
                >
                    <div className="h-8 w-8 rounded bg-[#004D4D] flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-sm filled">deployed_code</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h1 className="text-sm font-bold truncate">CloudAdditive</h1>
                        <p className="text-[10px] text-slate-500 font-medium">
                            {isProviderContext ? "Provider Dashboard" : "Customer Portal"}
                        </p>
                    </div>
                    {canSwitch && (
                        <span className={cn(
                            "material-symbols-outlined text-slate-400 text-sm transition-transform",
                            showRoleSwitcher && "rotate-180"
                        )}>expand_more</span>
                    )}
                </div>

                {/* Role Switcher Dropdown */}
                {showRoleSwitcher && canSwitch && (
                    <div className="absolute left-6 right-6 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="p-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1">
                                Switch Dashboard
                            </p>

                            {/* Customer Option */}
                            <button
                                onClick={() => handleRoleSwitch("customer")}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                                    !isProviderContext
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "hover:bg-slate-50 text-slate-600"
                                )}
                            >
                                <span className="material-symbols-outlined text-[20px]">person</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Customer</p>
                                    <p className="text-[10px] text-slate-400">Order prints & track orders</p>
                                </div>
                                {!isProviderContext && (
                                    <span className="material-symbols-outlined text-emerald-500 text-sm">check</span>
                                )}
                            </button>

                            {/* Provider Option */}
                            {(user?.role === "PROVIDER" || user?.role === "ADMIN" || hasProviderProfile) && (
                                <button
                                    onClick={() => handleRoleSwitch("provider")}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                                        isProviderContext
                                            ? "bg-emerald-500/10 text-emerald-600"
                                            : "hover:bg-slate-50 text-slate-600"
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[20px]">storefront</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Provider</p>
                                        <p className="text-[10px] text-slate-400">Manage printers & fulfill orders</p>
                                    </div>
                                    {isProviderContext && (
                                        <span className="material-symbols-outlined text-emerald-500 text-sm">check</span>
                                    )}
                                </button>
                            )}

                            {/* Become Provider Option */}
                            {!hasProviderProfile && user?.role === "CUSTOMER" && (
                                <Link
                                    href="/provider/register"
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
                                    onClick={() => setShowRoleSwitcher(false)}
                                >
                                    <span className="material-symbols-outlined text-[20px]">add_business</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Become a Provider</p>
                                        <p className="text-[10px] text-slate-400">Start offering print services</p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">General</p>

                {navItems.map((item) => {
                    const active = item.exact ? isActive(item.href) : isActivePrefix(item.href)
                    const disabled = isProviderContext && item.href !== "/provider/dashboard/settings" && !isVerified

                    if (disabled) {
                        return (
                            <div
                                key={item.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                                <span className="material-symbols-outlined text-sm ml-auto">lock</span>
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                active
                                    ? "bg-emerald-500/5 text-emerald-500 font-semibold"
                                    : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <span className={cn(
                                "material-symbols-outlined text-[20px]",
                                active && "filled"
                            )}>
                                {item.icon}
                            </span>
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    )
                })}

                {/* System Section */}
                <div className="pt-6">
                    <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</p>
                    {systemItems.map((item) => {
                        const active = isActive(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                    active
                                        ? "bg-emerald-500/5 text-emerald-500 font-semibold"
                                        : "text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                <span className={cn(
                                    "material-symbols-outlined text-[20px]",
                                    active && "filled"
                                )}>
                                    {item.icon}
                                </span>
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-slate-100">
                {/* User Info */}
                <div className="flex items-center gap-3 p-2">
                    <div
                        className="h-10 w-10 rounded-full bg-cover bg-center border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0"
                        style={user?.image ? { backgroundImage: `url('${user.image}')` } : undefined}
                    >
                        {!user?.image && (
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate">{user?.name || "User"}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>

                {/* Logout */}
                <form action={logoutAction} className="mt-2">
                    <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Logout
                    </button>
                </form>
            </div>
        </aside>
    )
}
