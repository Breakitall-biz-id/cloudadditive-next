"use client"

import dynamic from "next/dynamic"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"

// Dynamic import Model3DViewer
const Model3DViewer = dynamic(() => import("@/components/order/Model3DViewer"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <span className="material-symbols-outlined text-4xl text-slate-300 animate-pulse">view_in_ar</span>
        </div>
    ),
})

interface Preview3DModalProps {
    wizard: UseOrderWizardReturn
}

export function Preview3DModal({ wizard }: Preview3DModalProps) {
    const { state, actions } = wizard

    if (!state.showPreviewModal || !state.file) {
        return null
    }

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => actions.setShowPreviewModal(false)}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">view_in_ar</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{state.file.name}</h3>
                            {state.modelDimensions && (
                                <p className="text-xs text-slate-500 font-mono">
                                    {state.modelDimensions.width} × {state.modelDimensions.height} × {state.modelDimensions.depth} mm
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => actions.setShowPreviewModal(false)}
                        className="size-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Modal Body - 3D Viewer */}
                <div className="flex-1 bg-slate-50 p-4 min-h-[500px]">
                    <Model3DViewer
                        file={state.file}
                        className="w-full h-full min-h-[480px] rounded-xl"
                    />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">3d_rotation</span>
                            Drag to rotate
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">zoom_in</span>
                            Scroll to zoom
                        </span>
                    </div>
                    <button
                        onClick={() => actions.setShowPreviewModal(false)}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    )
}
