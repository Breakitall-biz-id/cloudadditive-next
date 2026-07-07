"use client"

import { useEffect } from "react"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"

interface StepCourierProps {
    wizard: UseOrderWizardReturn
}

export function StepCourier({ wizard }: StepCourierProps) {
    const { state, actions } = wizard

    // Get origin coordinates from selected printer's provider
    const originLatitude = state.selectedPrinter?.coordinates?.lat
    const originLongitude = state.selectedPrinter?.coordinates?.lng

    // Fetch rates when component mounts or when we have valid coordinates
    useEffect(() => {
        if (
            state.customerCoords &&
            originLatitude &&
            originLongitude &&
            !state.courierRates.length &&
            !state.isLoadingRates
        ) {
            actions.fetchCourierRates(
                originLatitude,
                originLongitude,
                state.customerCoords.lat,
                state.customerCoords.lng
            )
        }
    }, [state.customerCoords, originLatitude, originLongitude, state.courierRates.length, state.isLoadingRates, actions])

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">04 Select Courier</h2>
                <p className="text-slate-500 max-w-xl">
                    Choose your preferred shipping method. Rates calculated based on package weight and destination.
                </p>
            </div>

            {/* Loading State */}
            {state.isLoadingRates && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center gap-4">
                    <div className="animate-spin">
                        <span className="material-symbols-outlined text-4xl text-primary">sync</span>
                    </div>
                    <p className="text-slate-500">Fetching shipping rates...</p>
                </div>
            )}

            {/* No Rates Available */}
            {!state.isLoadingRates && state.courierRates.length === 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 flex gap-4">
                    <span className="material-symbols-outlined text-amber-500">warning</span>
                    <div>
                        <p className="font-bold text-amber-700">No courier rates available</p>
                        <p className="text-sm text-amber-600 mt-1">
                            Please ensure your delivery address is properly set in the previous step.
                        </p>
                        <button
                            onClick={() => {
                                if (state.customerCoords && originLatitude && originLongitude) {
                                    actions.fetchCourierRates(
                                        originLatitude,
                                        originLongitude,
                                        state.customerCoords.lat,
                                        state.customerCoords.lng
                                    )
                                }
                            }}
                            className="mt-3 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Courier List */}
            {!state.isLoadingRates && state.courierRates.length > 0 && (
                <div className="flex flex-col gap-3">
                    {state.courierRates.map((courier) => (
                        <button
                            key={courier.id}
                            onClick={() => actions.setSelectedCourier(courier.id)}
                            className={`bg-white rounded-xl p-5 border-2 flex items-center justify-between transition-all ${state.selectedCourier === courier.id
                                ? "border-primary shadow-lg shadow-primary/10"
                                : "border-slate-200 hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-600">local_shipping</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900">
                                        {courier.courierName} - {courier.serviceName}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {courier.duration} {courier.durationUnit}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-primary">Rp {courier.price.toLocaleString()}</p>
                                {state.selectedCourier === courier.id && (
                                    <span className="text-xs text-primary font-bold">Selected</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4">
                <span className="material-symbols-outlined text-slate-400">info</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Shipping rates are fetched in real-time from Biteship. Rates may vary based on actual package dimensions and weight after printing is complete.
                </p>
            </div>
        </>
    )
}
