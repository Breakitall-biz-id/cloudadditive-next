"use client"

import { useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import { MATERIALS, QUALITIES } from "@/types/order"

// Dynamic import Model3DViewer
const Model3DViewer = dynamic(() => import("@/components/order/Model3DViewer"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-slate-400 animate-pulse">view_in_ar</span>
        </div>
    ),
})

interface OrderSidebarProps {
    wizard: UseOrderWizardReturn
}

export function OrderSidebar({ wizard }: OrderSidebarProps) {
    const { state, actions, computed } = wizard

    // Memoize order ID so it doesn't change on every render
    const orderId = useMemo(() => Math.floor(Math.random() * 99999), [])

    const is3DFile = state.file && (
        state.file.name.toLowerCase().endsWith('.stl') ||
        state.file.name.toLowerCase().endsWith('.obj')
    )

    // Memoize the callback to prevent re-renders
    const handleModelLoad = useCallback((info: { width: number; height: number; depth: number; volume: number }) => {
        // Only update if dimensions actually changed
        if (!state.modelDimensions ||
            state.modelDimensions.width !== info.width ||
            state.modelDimensions.height !== info.height ||
            state.modelDimensions.depth !== info.depth) {
            actions.setModelDimensions(info)
        }
    }, [state.modelDimensions, actions])

    return (
        <aside className="w-[30%] sticky top-28 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col gap-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Order Summary</h3>
                        <span className="text-xs font-mono font-bold text-primary">#CA-{orderId}</span>
                    </div>
                    <div className="h-[1px] w-full bg-slate-100"></div>
                </div>

                {/* Preview */}
                <div className="flex flex-col gap-4">
                    <div
                        className={`aspect-square w-full rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center relative overflow-hidden ${is3DFile ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all' : ''}`}
                        onClick={() => {
                            if (is3DFile) {
                                actions.setShowPreviewModal(true)
                            }
                        }}
                    >
                        {is3DFile ? (
                            <>
                                <Model3DViewer
                                    file={state.file!}
                                    className="w-full h-full"
                                    hideOverlays={true}
                                    onModelLoad={handleModelLoad}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-all flex items-end justify-center pb-4">
                                    <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">zoom_out_map</span>
                                        Click to expand
                                    </span>
                                </div>
                                {state.modelDimensions && (
                                    <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-500 bg-white/90 px-1.5 py-0.5 rounded">
                                        {state.modelDimensions.width} × {state.modelDimensions.height} × {state.modelDimensions.depth}
                                    </span>
                                )}
                            </>
                        ) : state.file ? (
                            <>
                                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-slate-400">description</span>
                                </div>
                                <span className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-white/80 px-1.5 rounded">GCODE</span>
                            </>
                        ) : (
                            <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-slate-900 font-bold truncate">{state.file?.name || "No file selected"}</p>
                        <p className="text-xs text-slate-500">
                            {state.selectedMaterial ? MATERIALS.find(m => m.id === state.selectedMaterial)?.name : "—"} • {state.selectedQuality ? QUALITIES.find(q => q.id === state.selectedQuality)?.name : "—"}
                        </p>
                    </div>
                </div>

                {/* Pricing */}
                <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between py-1 text-slate-500">
                        <span>Material</span>
                        <span className="text-slate-800">
                            {computed.materialCost > 0 ? `Rp ${computed.materialCost.toLocaleString()}` : "—"}
                        </span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-500">
                        <span>Print Time</span>
                        <span className="text-slate-800">
                            {computed.timeCost > 0 ? `Rp ${computed.timeCost.toLocaleString()}` : "—"}
                        </span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-500">
                        <span>Service Fee</span>
                        <span className="text-slate-800">
                            {computed.markup + computed.platformFee > 0
                                ? `Rp ${(computed.markup + computed.platformFee).toLocaleString()}`
                                : "—"}
                        </span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-500">
                        <span>Shipping</span>
                        <span className="text-slate-800">
                            {computed.shippingCost > 0 ? `Rp ${computed.shippingCost.toLocaleString()}` : "—"}
                        </span>
                    </div>
                    <div className="h-[1px] bg-slate-200 my-2"></div>
                    <div className="flex justify-between items-baseline pt-1">
                        <span className="text-slate-900 font-bold uppercase tracking-tighter text-xs">
                            {computed.total > 0 ? "Total Est." : "Upload to estimate"}
                        </span>
                        <span className="text-primary text-xl font-bold">
                            {computed.total > 0 ? `Rp ${computed.total.toLocaleString()}` : "—"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Support Card */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">support_agent</span>
                <div className="flex flex-col">
                    <p className="text-xs font-bold text-slate-900 leading-none">Need assistance?</p>
                    <p className="text-[10px] text-slate-500 mt-1">Talk to an engineer now</p>
                </div>
            </div>
        </aside>
    )
}
