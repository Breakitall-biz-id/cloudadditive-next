"use client"

import Link from "next/link"
import { useOrderWizard } from "@/hooks/useOrderWizard"
import { ORDER_STEPS } from "@/types/order"
import { OrderSidebar } from "@/components/order/OrderSidebar"
import { OrderFooter } from "@/components/order/OrderFooter"
import { Preview3DModal } from "@/components/order/Preview3DModal"
import {
    StepUpload,
    StepConfigure,
    StepDelivery,
    StepCourier,
    StepReview,
    StepPayment,
} from "@/components/order/steps"

export default function OrderPage() {
    const wizard = useOrderWizard()
    const { state } = wizard

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="glass-header h-16 flex items-center justify-between px-8 sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
                <Link href="/" className="flex items-center gap-2">
                    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
                        <path d="M10 22V10l12 6-12 6z" fill="#fff" />
                        <defs>
                            <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                                <stop stopColor="#f97316" />
                                <stop offset="1" stopColor="#fb923c" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="text-lg font-black tracking-tight text-slate-900">CloudAdditive</span>
                </Link>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                        System Online
                    </div>
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Dashboard
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-8 flex flex-col gap-8">
                {/* Step Indicator */}
                <div className="w-full flex justify-between items-center px-4 relative">
                    <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-slate-200 -z-10 -translate-y-1/2" />
                    {ORDER_STEPS.map((step) => (
                        <div key={step.id} className="flex flex-col items-center gap-3 bg-slate-50 px-3">
                            <div className={`size-10 rounded-full flex items-center justify-center font-bold transition-all ${state.currentStep >= step.id
                                    ? "bg-primary text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                    : "bg-slate-200 border border-slate-300 text-slate-400"
                                }`}>
                                <span className="material-symbols-outlined text-xl">{step.icon}</span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-tighter ${state.currentStep >= step.id ? "text-primary" : "text-slate-400"
                                }`}>{step.name}</span>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex gap-8 items-start">
                    {/* Sidebar */}
                    <OrderSidebar wizard={wizard} />

                    {/* Main Content */}
                    <section className="flex-1 flex flex-col gap-6">
                        {state.currentStep === 1 && <StepUpload wizard={wizard} />}
                        {state.currentStep === 2 && <StepConfigure wizard={wizard} />}
                        {state.currentStep === 3 && <StepDelivery wizard={wizard} />}
                        {state.currentStep === 4 && <StepCourier wizard={wizard} />}
                        {state.currentStep === 5 && <StepReview wizard={wizard} />}
                        {state.currentStep === 6 && <StepPayment wizard={wizard} />}
                    </section>
                </div>
            </main>

            {/* Footer */}
            <OrderFooter wizard={wizard} />

            {/* 3D Preview Modal */}
            <Preview3DModal wizard={wizard} />
        </div>
    )
}
