"use client"

import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"

interface OrderFooterProps {
    wizard: UseOrderWizardReturn
}

export function OrderFooter({ wizard }: OrderFooterProps) {
    const { state, actions, computed } = wizard

    return (
        <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-16 sticky bottom-0 z-40">
            <div>
                <button
                    onClick={actions.goBack}
                    disabled={state.currentStep === 1}
                    className={`flex items-center gap-2 px-6 py-3 text-slate-600 font-bold rounded-xl transition-all ${state.currentStep === 1
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-slate-100 active:scale-95"
                        }`}
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Back</span>
                </button>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end mr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Step</span>
                    <span className="text-sm font-bold text-slate-900">{computed.nextStepName}</span>
                </div>
                <button
                    onClick={actions.goNext}
                    disabled={!computed.canProceed}
                    className="group flex items-center gap-3 px-10 py-3.5 bg-primary text-white font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <span>CONTINUE</span>
                    <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
            </div>
        </footer>
    )
}
