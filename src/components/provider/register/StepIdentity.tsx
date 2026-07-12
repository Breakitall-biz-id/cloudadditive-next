"use client"

import { ArrowRight } from "lucide-react"
import type { UseProviderWizardReturn } from "@/hooks/useProviderWizard"
import Script from "next/script"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Dynamic import MapPicker to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/order/MapPicker"), {
    ssr: false,
    loading: () => (
        <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 animate-pulse">map</span>
                <p className="text-sm text-slate-400 mt-2">Loading map...</p>
            </div>
        </div>
    ),
})

interface StepProps {
    wizard: UseProviderWizardReturn
}

export function StepIdentity({ wizard }: StepProps) {
    const { state, actions, computed } = wizard

    // Standard input style from StepDelivery
    // Note: Added h-12 to match previous padding look with Shadcn components
    // Standard input style from StepDelivery
    // Note: Added !h-12 to forcefully override Shadcn's data-[size=default]:h-9 specificity
    // Added bg-white to ensure consistent background
    // Added text-base md:text-sm to match Input's default typography
    const inputClassName = "w-full !h-12 px-4 rounded-xl border-slate-200 bg-white text-base md:text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none"
    const labelClassName = "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block"
    const addressInputClassName = "w-full h-12 px-4 rounded-xl border-slate-200 bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none"

    return (
        <div className="w-full max-w-2xl animate-fade-in">
            <div className="mb-12">
                <div className="flex justify-between mb-4">
                    <span className="text-sm font-bold text-primary font-mono">STEP 01/03</span>
                    <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Identity & Location</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: "33%" }}></div>
                </div>
            </div>

            <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                <section>
                    <h2 className="text-2xl font-bold text-slate-900">Business Information</h2>
                    <p className="text-slate-500 mt-1">Tell us about your company and where you operate.</p>
                </section>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block">
                                <span className={labelClassName}>Business Name</span>
                                <Input
                                    value={state.businessName}
                                    onChange={(e) => actions.setBusinessName(e.target.value)}
                                    className={inputClassName}
                                    placeholder="e.g. Precision Prints Ltd."
                                    type="text"
                                />
                            </label>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block">
                                <span className={labelClassName}>Business Type</span>
                                <Select
                                    value={state.businessType}
                                    onValueChange={actions.setBusinessType}
                                >
                                    <SelectTrigger className={inputClassName}>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Individual">Individual</SelectItem>
                                        <SelectItem value="CV/PT">CV/PT</SelectItem>
                                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </label>
                        </div>
                        <div className="col-span-2">
                            <label className="block">
                                <span className={labelClassName}>Business Registration Number / NIB</span>
                                <Input
                                    value={state.businessNumber}
                                    onChange={(e) => actions.setBusinessNumber(e.target.value)}
                                    className={`${inputClassName} font-mono`}
                                    placeholder="1234567890"
                                    type="text"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <section className="mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Store/Provider Location</h3>
                            <p className="text-sm text-slate-500">Pick your location on the map to auto-fill address details.</p>
                        </section>

                        {/* Map Picker */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                            <label className={labelClassName}>Location Search</label>
                            {state.mapsLoaded ? (
                                <MapPicker
                                    defaultLat={state.latitude || -6.9175}
                                    defaultLng={state.longitude || 107.6191}
                                    onLocationSelect={(location) => {
                                        actions.setCoordinates(location.lat, location.lng)

                                        // Auto-fill logic
                                        if (location.area) {
                                            actions.setSelectedArea(location.area)
                                            actions.setProvince(location.area.administrativeLevel.province)
                                            actions.setCity(location.area.administrativeLevel.city)
                                            actions.setPostalCode(location.area.postalCode)
                                        }
                                    }}
                                />
                            ) : (
                                <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin mb-2">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">sync</span>
                                        </div>
                                        <p className="text-sm text-slate-400">Loading Maps...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Address Details */}
                        <div className="space-y-6">
                            <div>
                                <label className="block">
                                    <span className={labelClassName}>Street Address / Detail</span>
                                    <Textarea
                                        value={state.streetAddress}
                                        onChange={(e) => actions.setStreetAddress(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-none min-h-[100px] resize-none"
                                        placeholder="Jl. Industrial Way No. 42 (Building A)..."
                                    />
                                </label>
                            </div>

                            {/* Address grid can be auto-filled by map, but remains editable as fallback. */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block">
                                        <span className={labelClassName}>Province</span>
                                        <Input
                                            value={state.selectedArea?.administrativeLevel.province || state.province || ""}
                                            onChange={(e) => actions.setProvince(e.target.value)}
                                            className={addressInputClassName}
                                            placeholder="D.I. Yogyakarta"
                                            type="text"
                                        />
                                    </label>
                                </div>
                                <div>
                                    <label className="block">
                                        <span className={labelClassName}>City</span>
                                        <Input
                                            value={state.selectedArea?.administrativeLevel.city || state.city || ""}
                                            onChange={(e) => actions.setCity(e.target.value)}
                                            className={addressInputClassName}
                                            placeholder="Sleman"
                                            type="text"
                                        />
                                    </label>
                                </div>
                                <div>
                                    <label className="block">
                                        <span className={labelClassName}>Postal Code</span>
                                        <Input
                                            value={state.selectedArea?.postalCode || state.postalCode || ""}
                                            onChange={(e) => actions.setPostalCode(e.target.value)}
                                            className={`${addressInputClassName} font-mono`}
                                            placeholder="55584"
                                            type="text"
                                        />
                                    </label>
                                </div>
                            </div>

                            {!state.selectedArea && (
                                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex gap-3">
                                    <span className="material-symbols-outlined text-sky-500">info</span>
                                    <p className="text-sm text-sky-700">
                                        You can search on the map or fill the location details manually.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end pt-8">
                    <button
                        onClick={actions.goNext}
                        disabled={!computed.canProceed}
                        className={`font-bold text-sm px-10 py-3.5 rounded-xl transition-all shadow-lg flex items-center gap-2 ${computed.canProceed
                            ? "bg-primary hover:bg-orange-600 text-white shadow-orange-500/20"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            }`}
                        type="button"
                    >
                        Next Step
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </form>

            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                onLoad={() => actions.setMapsLoaded(true)}
                strategy="lazyOnload"
            />
        </div>
    )
}
