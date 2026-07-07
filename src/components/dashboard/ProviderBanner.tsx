"use client"

import { ArrowRight, Printer } from "lucide-react"
import Link from "next/link"

export function ProviderBanner() {
    return (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden card-shadow mb-8 group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <Printer className="w-64 h-64 -rotate-12 transform translate-x-12 -translate-y-8" />
            </div>

            <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-200 text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                    Partnership Opportunity
                </div>

                <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                    Own a 3D Printer? <span className="text-primary">Start Earning Today.</span>
                </h3>

                <p className="text-slate-300 mb-8 text-lg leading-relaxed max-w-xl">
                    Join our network of manufacturing partners. Monetize your idle equipment by fulfilling orders from businesses and makers nearby.
                </p>

                <div className="flex flex-wrap gap-4">
                    <Link
                        href="/provider/register"
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20"
                    >
                        Become a Partner
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Decorative circles */}
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-0 pointer-events-none"></div>
            <div className="absolute top-1/2 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -z-0 pointer-events-none"></div>
        </div>
    )
}
