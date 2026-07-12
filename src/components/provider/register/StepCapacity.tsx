"use client"

import { ArrowRight, ArrowLeft, Printer, Check } from "lucide-react"
import type { UseProviderWizardReturn } from "@/hooks/useProviderWizard"
import { Input } from "@/components/ui/input"

interface StepProps {
    wizard: UseProviderWizardReturn
}

export function StepCapacity({ wizard }: StepProps) {
    const { state, actions, computed } = wizard

    // Shared styles
    // Shared styles
    const inputClassName = "w-full !h-12 px-4 rounded-xl border-slate-200 bg-white text-base md:text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none"
    const labelClassName = "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block"
    const checkboxCardClassName = "flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-orange-50/30 cursor-pointer transition-all group relative overflow-hidden"
    const checkboxCardSelectedClassName = "border-primary bg-orange-50 ring-1 ring-primary/20"

    const materials = [
        "PLA / PETG",
        "ABS / ASA",
        "TPU (Flexible)",
        "Nylon / PA12",
        "PC / Polycarbonate",
        "Resin (Standard)"
    ]

    return (
        <div className="w-full max-w-2xl animate-fade-in">
            <div className="mb-12">
                <div className="flex justify-between mb-4">
                    <span className="text-sm font-bold text-primary font-mono">STEP 02/03</span>
                    <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Capacity & Hardware</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: "66%" }}></div>
                </div>
            </div>

            <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                <section>
                    <h2 className="text-2xl font-bold text-slate-900">Configure your fleet</h2>
                    <p className="text-slate-500 mt-1">Tell us about your production capabilities and available materials.</p>
                </section>

                <div className="space-y-8">
                    {/* Primary Tech */}
                    <div>
                        <label className="block">
                            <span className={labelClassName}>Primary Technology</span>
                            <select
                                value={state.primaryTechnology}
                                onChange={(event) => actions.setPrimaryTechnology(event.target.value)}
                                className={inputClassName}
                            >
                                <option value="">Select your core technology</option>
                                <option value="FDM">Fused Deposition Modeling (FDM)</option>
                                <option value="SLA">Stereolithography (SLA)</option>
                                <option value="SLS">Selective Laser Sintering (SLS)</option>
                                <option value="MJF">Multi Jet Fusion (MJF)</option>
                                <option value="DMLS">Direct Metal Laser Sintering (DMLS)</option>
                            </select>
                        </label>
                    </div>

                    {/* Active Units */}
                    <div>
                        <label className="block">
                            <span className={labelClassName}>Number of Active Units</span>
                            <div className="relative">
                                <Input
                                    value={state.printerCount || ""}
                                    onChange={(e) => actions.setPrinterCount(parseInt(e.target.value) || 0)}
                                    className={`${inputClassName} font-mono`}
                                    placeholder="e.g. 5"
                                    type="number"
                                    min="1"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Printer className="w-5 h-5" />
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Supported Materials */}
                    <div>
                        <span className={`${labelClassName} mb-4`}>Supported Materials</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {materials.map((material) => {
                                const isSelected = state.supportedMaterials.includes(material)
                                return (
                                    <label
                                        key={material}
                                        className={`${checkboxCardClassName} ${isSelected ? checkboxCardSelectedClassName : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={isSelected}
                                            onChange={() => actions.toggleSupportedMaterial(material)}
                                        />
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-primary font-bold' : 'text-slate-600 group-hover:text-primary'}`}>
                                            {material}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={actions.goBack}
                        className="text-slate-500 font-bold text-sm px-6 py-3 rounded-xl hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        Back
                    </button>

                    <button
                        type="button"
                        onClick={actions.goNext}
                        disabled={!computed.canProceed}
                        className={`font-bold text-sm px-10 py-3.5 rounded-xl transition-all shadow-lg flex items-center gap-2 ${computed.canProceed
                            ? "bg-primary hover:bg-orange-600 text-white shadow-orange-500/20"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            }`}
                    >
                        Next Step
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    )
}
