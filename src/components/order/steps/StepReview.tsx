"use client"

import { useEffect } from "react"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import { MATERIALS, QUALITIES } from "@/types/order"
import { isGcodeFile } from "@/lib/gcode-parser"

interface StepReviewProps {
    wizard: UseOrderWizardReturn
}

export function StepReview({ wizard }: StepReviewProps) {
    const { state, computed, actions } = wizard

    const material = MATERIALS.find(m => m.id === state.selectedMaterial)
    const quality = QUALITIES.find(q => q.id === state.selectedQuality)
    const courier = state.courierRates.find(c => c.id === state.selectedCourier)

    const fileIsGcode = state.file ? isGcodeFile(state.file) : false

    // Trigger slicing/parsing when entering Review step
    useEffect(() => {
        if (!state.file || state.slicedResult || state.isSlicing) return

        // For G-code files, just parse - no material/quality needed
        // For STL/OBJ files, require material and quality selection
        if (fileIsGcode || (state.selectedMaterial && state.selectedQuality)) {
            actions.sliceModel()
        }
    }, [state.file, state.selectedMaterial, state.selectedQuality, state.slicedResult, state.isSlicing, actions, fileIsGcode])

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">05 Review Order</h2>
                <p className="text-slate-500 max-w-xl">
                    Please review your order details before proceeding to payment.
                </p>
            </div>

            {/* Slicing Status */}
            {state.isSlicing && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex items-center gap-4">
                    <div className="animate-spin">
                        <span className="material-symbols-outlined text-primary text-3xl">settings</span>
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">Calculating accurate pricing...</p>
                        <p className="text-sm text-slate-500">Slicing your model to determine print time and material usage</p>
                    </div>
                </div>
            )}

            {state.slicingError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <div>
                            <p className="font-bold text-red-800">Slicing failed</p>
                            <p className="text-sm text-red-600">{state.slicingError}</p>
                            <p className="text-sm text-slate-500 mt-1">Using estimated pricing instead</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sliced Result Info */}
            {state.slicedResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                        <p className="font-bold text-green-800">Accurate pricing calculated</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500">Print Time</p>
                            <p className="font-bold text-slate-900">
                                {Math.floor(state.slicedResult.printTimeMinutes / 60)}h {state.slicedResult.printTimeMinutes % 60}m
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Filament</p>
                            <p className="font-bold text-slate-900">{state.slicedResult.filamentGrams.toFixed(1)}g</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Layers</p>
                            <p className="font-bold text-slate-900">{state.slicedResult.layerCount}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Print Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">File</span>
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">{state.file?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Quantity</span>
                        <span className="font-bold text-slate-900">{state.quantity}x</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Material</span>
                        <span className="font-bold text-slate-900">{material?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-500">Quality</span>
                        <span className="font-bold text-slate-900">{quality?.name || "—"}</span>
                    </div>
                </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Delivery Address</h3>
                <div className="space-y-1">
                    <p className="font-bold text-slate-900">{state.recipientName}</p>
                    <p className="text-slate-500">{state.recipientPhone}</p>
                    <p className="text-slate-500">{state.detailAddress}, {state.selectedArea?.name}</p>
                </div>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Shipping</h3>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">local_shipping</span>
                        <div>
                            <p className="font-bold text-slate-900">{courier?.courierName} - {courier?.serviceName}</p>
                            <p className="text-sm text-slate-500">{courier?.duration} {courier?.durationUnit}</p>
                        </div>
                    </div>
                    <p className="font-bold text-primary">Rp {courier?.price.toLocaleString() || "—"}</p>
                </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-slate-900 text-white rounded-xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Payment Summary</h3>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Material Cost</span>
                        <span>Rp {computed.materialCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Print Time Cost</span>
                        <span>Rp {computed.timeCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Service Fee</span>
                        <span>Rp {(computed.markup + computed.platformFee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Shipping</span>
                        <span>Rp {computed.shippingCost.toLocaleString()}</span>
                    </div>
                    <div className="h-[1px] bg-slate-700 my-2" />
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">Rp {computed.total.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 size-4 rounded border-slate-300" />
                <p className="text-sm text-slate-600">
                    I confirm the print, shipping, and payment details above are correct.
                </p>
            </label>
        </>
    )
}
