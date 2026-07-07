"use client"

import { PlusCircle, Map } from "lucide-react"
import Link from "next/link"

interface WelcomeSectionProps {
    name?: string
    activeCount?: number
}

export function WelcomeSection({ name, activeCount = 0 }: WelcomeSectionProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 relative overflow-hidden shadow-sm card-shadow h-full">
            {/* Background Effects */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <h2 className="text-3xl font-bold mb-2 text-slate-900">Welcome back, {name || "User"}! 👋</h2>
                    <p className="text-slate-500 max-w-md mb-8">
                        Your 3D printing pipeline is running smoothly. You have {activeCount} active print{activeCount === 1 ? "" : "s"} scheduled for today.
                    </p>
                </div>

                <div className="flex gap-4">
                    <Link href="/order">
                        <button className="bg-primary text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
                            <PlusCircle className="w-5 h-5" />
                            New Order
                        </button>
                    </Link>
                    <Link href="/track">
                        <button className="bg-white text-slate-700 font-bold px-6 py-3 rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all">
                            <Map className="w-5 h-5" />
                            Track Package
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
