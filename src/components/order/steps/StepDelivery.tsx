"use client"

import { useState } from "react"
import Script from "next/script"
import dynamic from "next/dynamic"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import { SavedAddressList } from "@/components/order/SavedAddressList"

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
    const [manualProvince, setManualProvince] = useState(state.selectedArea?.administrativeLevel.province || "")
    const [manualCity, setManualCity] = useState(state.selectedArea?.administrativeLevel.city || "")
    const [manualDistrict, setManualDistrict] = useState(state.selectedArea?.administrativeLevel.district || "")
    const [manualPostalCode, setManualPostalCode] = useState(state.selectedArea?.postalCode || "")
    const [minDueDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

    const useManualLocation = () => {
        if (!manualProvince || !manualCity || !manualPostalCode) return

        actions.setSelectedArea({
            id: `${manualCity}-${manualPostalCode}`,
            name: manualDistrict || manualCity,
            postalCode: manualPostalCode,
            administrativeLevel: {
                country: "Indonesia",
                province: manualProvince,
                city: manualCity,
                district: manualDistrict,
            },
        })

        const coords = state.customerCoords || { lat: -7.7586, lng: 110.4096 }
        actions.setCustomerCoords(coords)
        actions.findBestPrinterPreCheck(coords.lat, coords.lng)
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">03 Delivery Address</h2>
                <p className="text-slate-500 max-w-xl">
                    Enter your delivery address. Search or pinpoint on map to auto-fill location details.
                </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                    onClick={() => actions.setAddressMode('saved')}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${state.addressMode === 'saved'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <span className="material-symbols-outlined text-lg align-middle mr-2">bookmark</span>
                    Pilih Alamat Tersimpan
                </button>
                <button
                    onClick={() => actions.setAddressMode('new')}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${state.addressMode === 'new'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <span className="material-symbols-outlined text-lg align-middle mr-2">add_location</span>
                    Alamat Baru
                </button>
            </div>

            {/* Saved Address Mode */}
            {state.addressMode === 'saved' && (
                <SavedAddressList wizard={wizard} />
            )}

            {/* New Address Mode - Map Picker with Biteship Search */}
            {state.addressMode === 'new' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Cari Lokasi Pengiriman</label>
                    {state.mapsLoaded ? (
                        <MapPicker
                            onLocationSelect={(location) => {
                                if (location.area) {
                                    actions.setSelectedArea(location.area)
                                }
                                actions.setCustomerCoords({ lat: location.lat, lng: location.lng })
                                // Use new pre-check function to find best printer
                                actions.findBestPrinterPreCheck(location.lat, location.lng)
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
            )}

            {/* Nearest Provider Display */}
            {/* Printer Search Status */}
            {state.isSearchingPrinter && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4">
                    <div className="animate-spin">
                        <span className="material-symbols-outlined text-primary">sync</span>
                    </div>
                    <p className="text-sm text-slate-600">Mencari printer terbaik untuk pesanan Anda...</p>
                </div>
            )}

            {/* Printer Search Error */}
            {state.printerSearchError && !state.isSearchingPrinter && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-2xl text-red-500">error</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-red-700 text-lg">Printer Tidak Tersedia</h4>
                            <p className="text-sm text-red-600 mt-1">{state.printerSearchError}</p>
                            <p className="text-sm text-red-500 mt-2">
                                Coba pilih lokasi lain atau ubah material/ukuran model Anda.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {state.selectedPrinter && !state.isSearchingPrinter && (
                <div className="bg-gradient-to-r from-primary/5 to-orange-50 rounded-xl border border-primary/20 p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-primary">print</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Printer Terpilih</p>
                                <h4 className="font-bold text-slate-900 text-lg">{state.selectedPrinter.printerName}</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    {state.selectedPrinter.providerName} • {state.selectedPrinter.providerCity}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            {state.selectedPrinter.canPrintImmediately ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                    <span className="material-symbols-outlined text-sm">bolt</span>
                                    Ready
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    Queued
                                </span>
                            )}
                            {state.selectedPrinter.isVerified && (
                                <span className="block mt-2 inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                    <span className="material-symbols-outlined text-sm">verified</span>
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-6 mt-4 pt-4 border-t border-primary/10">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-slate-400">location_on</span>
                            <span>{Math.round(state.selectedPrinter.breakdown?.distanceKm || 0)} km</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-slate-400">schedule</span>
                            <span>~{state.selectedPrinter.queuedOrders * 30 || 0} min queue</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="material-symbols-outlined text-slate-400">speed</span>
                            <span>Score: {Math.round(state.selectedPrinter.score)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recipient Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <label className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 block">
                        Kapan pesanan dibutuhkan?
                    </label>
                    <div className="grid gap-3 md:grid-cols-[260px_1fr] md:items-center">
                        <input
                            type="date"
                            min={minDueDate}
                            value={state.dueDate}
                            onChange={(event) => actions.setDueDate(event.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <p className="text-sm text-amber-800">
                            Opsional. Jika diisi, deadline ini akan disimpan untuk prioritas routing dan optimasi jadwal berikutnya.
                        </p>
                    </div>
                </div>

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

                {/* Auto-filled from Biteship, editable as fallback when map/autocomplete is unavailable. */}
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Provinsi</label>
                        <input
                            type="text"
                            value={state.selectedArea?.administrativeLevel.province || manualProvince}
                            onChange={(event) => setManualProvince(event.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="D.I. Yogyakarta"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kota</label>
                        <input
                            type="text"
                            value={state.selectedArea?.administrativeLevel.city || manualCity}
                            onChange={(event) => setManualCity(event.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Sleman"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kecamatan</label>
                        <input
                            type="text"
                            value={state.selectedArea?.administrativeLevel.district || manualDistrict}
                            onChange={(event) => setManualDistrict(event.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Ngaglik"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Kode Pos</label>
                        <input
                            type="text"
                            value={state.selectedArea?.postalCode || manualPostalCode}
                            onChange={(event) => setManualPostalCode(event.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="55584"
                        />
                    </div>
                </div>

                {!state.selectedArea && (
                    <button
                        type="button"
                        onClick={useManualLocation}
                        disabled={!manualProvince || !manualCity || !manualPostalCode || state.isSearchingPrinter}
                        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        Gunakan Alamat Manual & Cari Printer
                    </button>
                )}

                {!state.selectedArea && (
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex gap-3">
                        <span className="material-symbols-outlined text-sky-500">info</span>
                        <p className="text-sm text-sky-700">
                            Anda bisa memilih lokasi dari peta atau mengisi area manual lalu mencari printer.
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
