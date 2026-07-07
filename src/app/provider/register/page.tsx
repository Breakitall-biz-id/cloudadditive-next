"use client"

import { StepIdentity } from "@/components/provider/register/StepIdentity"
import { StepCapacity } from "@/components/provider/register/StepCapacity"
import { StepLogistics } from "@/components/provider/register/StepLogistics"
import { Box, Zap, Bot, Wallet, Printer, FileUp, Scale } from "lucide-react"
import type { UseProviderWizardReturn } from "@/hooks/useProviderWizard"
import { useProviderWizard } from "@/hooks/useProviderWizard"
import Image from "next/image"

export default function ProviderRegisterPage() {
    // Instantiate wizard hook
    const wizard = useProviderWizard();
    const { state } = wizard;

    return (
        <div className="flex min-h-screen bg-white text-slate-900 font-sans">
            {/* Left Sidebar */}
            <div className="hidden lg:flex w-[40%] bg-slate-50 flex-col relative overflow-hidden border-r border-slate-100">
                <div className="p-12 relative z-10">
                    <div className="flex items-center gap-2 mb-12">
                        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white">
                            <Box className="w-6 h-6 fill-current" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">CloudAdditive</span>
                    </div>
                    <h1 className="text-4xl font-extrabold leading-tight mb-6">Scale your manufacturing business with us.</h1>
                    <p className="text-lg text-slate-600 mb-12">Join a global network of premium 3D printing providers and get access to high-volume commercial orders.</p>

                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <Zap className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Instant Orders</h4>
                                <p className="text-slate-500">No more manual quoting. Receive ready-to-print orders instantly based on your capacity.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <Bot className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Automated Quoting</h4>
                                <p className="text-slate-500">Our AI-driven engine handles geometry analysis and pricing for you.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <Wallet className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Reliable Payouts</h4>
                                <p className="text-slate-500">Bi-weekly payments and transparent commission structures for every completed job.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Illustration/Gradient Background */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-50 to-transparent">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] opacity-20">
                        {/* Placeholder for illustration, matching style */}
                        <div className="w-full h-64 bg-gradient-to-t from-orange-200/50 to-transparent rounded-t-full blur-3xl"></div>
                    </div>
                </div>
            </div>

            {/* Main Content (Steps) */}
            <div className="flex-1 flex flex-col items-center justify-start p-8 lg:p-16 overflow-y-auto">
                {state.currentStep === 1 && <StepIdentity wizard={wizard} />}
                {state.currentStep === 2 && <StepCapacity wizard={wizard} />}
                {state.currentStep === 3 && <StepLogistics wizard={wizard} />}



                {/* Footer / Future Steps Preview */}
                <div className="w-full max-w-2xl mt-20 border-t border-slate-100 pt-10">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Upcoming Requirements</h4>
                    <div className={`grid grid-cols-2 md:grid-cols-3 gap-8 opacity-40 grayscale ${state.currentStep > 1 ? 'opacity-100 grayscale-0' : ''}`}>
                        <div className={`space-y-2 ${state.currentStep >= 2 ? 'text-primary' : ''}`}>
                            <div className="flex items-center gap-2">
                                <Printer className="w-4 h-4" />
                                <span className="text-xs font-bold">Capacity</span>
                            </div>
                            <p className="text-[11px]">Printer fleet and material specs.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <FileUp className="w-4 h-4" />
                                <span className="text-xs font-bold">Certifications</span>
                            </div>
                            <p className="text-[11px]">Permits and print samples.</p>
                        </div>
                        <div className="hidden md:block space-y-2">
                            <div className="flex items-center gap-2">
                                <Scale className="w-4 h-4" />
                                <span className="text-xs font-bold">Legal</span>
                            </div>
                            <p className="text-[11px]">Platform commission & SLA.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
