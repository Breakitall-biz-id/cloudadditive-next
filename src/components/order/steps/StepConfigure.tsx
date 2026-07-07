"use client"

import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import { MATERIALS, COLORS, QUALITIES } from "@/types/order"
import { isGcodeFile } from "@/lib/gcode-parser"

interface StepConfigureProps {
    wizard: UseOrderWizardReturn
}

export function StepConfigure({ wizard }: StepConfigureProps) {
    const { state, actions } = wizard
    const fileIsGcode = state.file ? isGcodeFile(state.file) : false

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">02 Configure Print</h2>
                <p className="text-slate-500 max-w-xl">
                    {fileIsGcode
                        ? "Your G-code file contains embedded print settings. Just set the quantity below."
                        : "Customize your print settings. Choose material, quality level, and color for your model."
                    }
                </p>
            </div>

            {/* G-code Info Banner */}
            {fileIsGcode && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="size-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-violet-600">code</span>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <p className="text-violet-900 font-bold">G-code File Detected</p>
                            <p className="text-violet-600 text-sm">
                                Print settings are embedded in your G-code. Just set the quantity below.
                            </p>
                        </div>
                    </div>

                    {/* Detected Settings */}
                    {state.slicedResult && (
                        <div className="mt-4 pt-4 border-t border-violet-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {state.slicedResult.material && (
                                <div>
                                    <p className="text-xs text-violet-500 uppercase font-medium">Material</p>
                                    <p className="text-violet-900 font-bold uppercase">{state.slicedResult.material}</p>
                                </div>
                            )}
                            {state.slicedResult.slicer && (
                                <div>
                                    <p className="text-xs text-violet-500 uppercase font-medium">Slicer</p>
                                    <p className="text-violet-900 font-bold">{state.slicedResult.slicer}</p>
                                </div>
                            )}
                            {state.slicedResult.printTimeMinutes > 0 && (
                                <div>
                                    <p className="text-xs text-violet-500 uppercase font-medium">Print Time</p>
                                    <p className="text-violet-900 font-bold">
                                        {Math.floor(state.slicedResult.printTimeMinutes / 60)}h {state.slicedResult.printTimeMinutes % 60}m
                                    </p>
                                </div>
                            )}
                            {state.slicedResult.filamentGrams > 0 && (
                                <div>
                                    <p className="text-xs text-violet-500 uppercase font-medium">Filament</p>
                                    <p className="text-violet-900 font-bold">{state.slicedResult.filamentGrams.toFixed(1)}g</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Material Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">
                    Material {fileIsGcode && <span className="text-violet-500 ml-2">(Confirm Selection)</span>}
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {MATERIALS.map((material) => (
                        <button
                            key={material.id}
                            onClick={() => actions.setSelectedMaterial(material.id)}
                            className={`relative p-4 rounded-xl border-2 transition-all ${state.selectedMaterial === material.id
                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                        >
                            {state.selectedMaterial === material.id && (
                                <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-xs">check</span>
                                </div>
                            )}
                            <p className="font-bold text-slate-900">{material.name}</p>
                            <p className="text-xs text-slate-500 mt-1">Rp {material.pricePerGram}/g</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quality Selection */}
            <div className={`bg-white rounded-xl border border-slate-200 p-6 ${fileIsGcode ? 'opacity-50' : ''}`}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">
                    Print Quality {fileIsGcode && <span className="text-violet-500 ml-2">(Embedded in G-code)</span>}
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {QUALITIES.map((quality) => (
                        <button
                            key={quality.id}
                            onClick={() => !fileIsGcode && actions.setSelectedQuality(quality.id)}
                            disabled={fileIsGcode}
                            className={`relative p-4 rounded-xl border-2 transition-all ${fileIsGcode
                                ? "border-slate-100 bg-slate-50 cursor-not-allowed"
                                : state.selectedQuality === quality.id
                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                        >
                            {!fileIsGcode && state.selectedQuality === quality.id && (
                                <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-xs">check</span>
                                </div>
                            )}
                            <p className={`font-bold ${fileIsGcode ? 'text-slate-400' : 'text-slate-900'}`}>{quality.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{quality.multiplier}x price</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quantity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Quantity</label>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => actions.setQuantity(Math.max(1, state.quantity - 1))}
                        className="size-12 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all"
                    >
                        <span className="material-symbols-outlined">remove</span>
                    </button>
                    <input
                        type="number"
                        value={state.quantity}
                        onChange={(e) => actions.setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-center text-xl font-bold border border-slate-200 rounded-xl py-2"
                        min={1}
                    />
                    <button
                        onClick={() => actions.setQuantity(state.quantity + 1)}
                        className="size-12 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all"
                    >
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </div>
        </>
    )
}

