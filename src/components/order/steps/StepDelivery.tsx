"use client"

import Script from "next/script"
import dynamic from "next/dynamic"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"

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

interface StepDeliveryProps {
    wizard: UseOrderWizardReturn
}

export function StepDelivery({ wizard }: StepDeliveryProps) {
    const { state, actions } = wizard

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">03 Delivery Address</h2>
                <p className="text-slate-500 max-w-xl">
                    Enter your delivery address. Search or pinpoint on map to auto-fill location details.
                </p>
            </div>

            {/* Map Picker with Biteship Search */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Cari Lokasi Pengiriman</label>
                {state.mapsLoaded ? (
                    <MapPicker
                        onLocationSelect={(location) => {
                            if (location.area) {
                                actions.setSelectedArea(location.area)
                            }
                            actions.setCustomerCoords({ lat: location.lat, lng: location.lng })
                            actions.searchNearestProvider(location.lat, location.lng)
                        }}
                    />
                ) : (
                    <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 animate-pulse">map</span>
                            <p className="text-sm text-slate-400 mt-2">Loading Google Maps...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Nearest Provider Display */}
            {state.isSearchingProvider && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4">
                    <div className="animate-spin">
                        <span className="material-symbols-outlined text-primary">sync</span>
                    </div>
                    <p className="text-sm text-slate-600">Mencari provider terdekat...</p>
                </div>
            )}

            {state.nearestProvider && !state.isSearchingProvider && (
                <div className="bg-gradient-to-r from-primary/5 to-orange-50 rounded-xl border border-primary/20 p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-primary">print</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Provider Terdekat</p>
                                <h4 className="font-bold text-slate-900 text-lg">{state.nearestProvider.businessName}</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    {state.nearestProvider.distance} km dari lokasi Anda
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-amber-500">
                                <span className="material-symbols-outlined text-sm">star</span>
                                <span className="font-bold">{state.nearestProvider.rating || "—"}</span>
                            </div>
                            {state.nearestProvider.isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mt-2">
                                    <span className="material-symbols-outlined text-sm">verified</span>
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-6 mt-4 pt-4 border-t border-primary/10">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-slate-400">print</span>
                            <span>{state.nearestProvider.availablePrinters} printer ready</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-slate-400">schedule</span>
                            <span>~{state.nearestProvider.queueEstimate || 0} min queue</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-slate-400">shopping_bag</span>
                            <span>{state.nearestProvider.totalOrders} orders</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recipient Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nama Penerima</label>
                        <input
                            type="text"
                            value={state.recipientName}
                            onChange={(e) => actions.setRecipientName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">No. Telepon</label>
                        <input
                            type="tel"
                            value={state.recipientPhone}
                            onChange={(e) => actions.setRecipientPhone(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="08123456789"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Detail Alamat (No. Rumah, Patokan, dll)</label>
                    <textarea
                        rows={2}
                        value={state.detailAddress}
                        onChange={(e) => actions.setDetailAddress(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        placeholder="Blok A No. 15, depan warung hijau"
                    />
                </div>

                {/* Auto-filled from Biteship */}
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Provinsi</label>
                        <input
                            type="text"
                            value={state.selectedArea?.administrativeLevel.province || ""}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kota</label>
                        <input
                            type="text"
                            value={state.selectedArea?.administrativeLevel.city || ""}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kecamatan</label>
                        <input
                            type="text"
                            value={state.selectedArea?.administrativeLevel.district || ""}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kode Pos</label>
                        <input
                            type="text"
                            value={state.selectedArea?.postalCode || ""}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
                            placeholder="—"
                        />
                    </div>
                </div>

                {!state.selectedArea && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                        <span className="material-symbols-outlined text-amber-500">warning</span>
                        <p className="text-sm text-amber-700">
                            Pilih lokasi dari peta atau cari alamat di atas untuk melanjutkan. Data akan terisi otomatis.
                        </p>
                    </div>
                )}
            </div>

            {/* Google Maps Script */}
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                onLoad={() => actions.setMapsLoaded(true)}
                strategy="lazyOnload"
            />
        </>
    )
}
