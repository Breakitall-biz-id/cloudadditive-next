"use client"

import { useState, useCallback } from "react"
import Script from "next/script"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

const MapPicker = dynamic(() => import("@/components/order/MapPicker"), {
    ssr: false,
    loading: () => (
        <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-400 mt-3">Memuat peta...</p>
            </div>
        </div>
    ),
})

interface Area {
    id: string
    name: string
    postalCode: string
    administrativeLevel: {
        country: string
        province: string
        city: string
        district: string
    }
}

export interface AddressFormData {
    label: string
    recipientName: string
    phone: string
    street: string
    city: string
    province: string
    postalCode: string
    latitude: number | null
    longitude: number | null
}

interface AddressFormWithMapProps {
    initialData?: Partial<AddressFormData>
    onSubmit: (data: AddressFormData) => Promise<void> | void
    onCancel?: () => void
    submitLabel?: string
    showLabel?: boolean
    compact?: boolean
}

export function AddressFormWithMap({
    initialData,
    onSubmit,
    onCancel,
    submitLabel = "Simpan Alamat",
    showLabel = true,
    compact = false,
}: AddressFormWithMapProps) {
    const [mapsLoaded, setMapsLoaded] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [label, setLabel] = useState(initialData?.label || "")
    const [recipientName, setRecipientName] = useState(initialData?.recipientName || "")
    const [phone, setPhone] = useState(initialData?.phone || "")
    const [street, setStreet] = useState(initialData?.street || "")

    // Auto-filled from map/Biteship
    const [selectedArea, setSelectedArea] = useState<Area | null>(null)
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        initialData?.latitude && initialData?.longitude
            ? { lat: initialData.latitude, lng: initialData.longitude }
            : null
    )

    const handleLocationSelect = useCallback(
        (location: { lat: number; lng: number; address: string; area?: Area }) => {
            setCoords({ lat: location.lat, lng: location.lng })
            if (location.area) {
                setSelectedArea(location.area)
            }
            // Pre-fill street with the full address if empty
            if (!street) {
                setStreet(location.address)
            }
        },
        [street]
    )

    const canSubmit =
        recipientName.trim() &&
        phone.trim() &&
        street.trim() &&
        selectedArea &&
        coords &&
        (!showLabel || label.trim())

    const handleSubmit = async () => {
        if (!canSubmit || !selectedArea || !coords) return

        setSubmitting(true)
        try {
            await onSubmit({
                label: showLabel ? label : "Alamat",
                recipientName,
                phone,
                street,
                city: selectedArea.administrativeLevel.city,
                province: selectedArea.administrativeLevel.province,
                postalCode: selectedArea.postalCode,
                latitude: coords.lat,
                longitude: coords.lng,
            })
        } finally {
            setSubmitting(false)
        }
    }

    const inputClass =
        "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"

    return (
        <div className="space-y-5">
            {/* Map Picker */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pilih Lokasi</p>
                {mapsLoaded ? (
                    <MapPicker
                        onLocationSelect={handleLocationSelect}
                        defaultLat={coords?.lat}
                        defaultLng={coords?.lng}
                    />
                ) : (
                    <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-slate-400 mt-3">Memuat Google Maps...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Recipient Details */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detail Penerima</p>
                <div className={cn("grid gap-4", compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2")}>
                    {showLabel && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Label</label>
                            <input
                                type="text"
                                placeholder="Contoh: Rumah, Kantor"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Penerima</label>
                        <input
                            type="text"
                            placeholder="Nama lengkap penerima"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">No. Telepon</label>
                        <input
                            type="tel"
                            placeholder="08123456789"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={cn(showLabel ? "md:col-span-2" : "col-span-2")}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Detail Alamat</label>
                        <textarea
                            rows={2}
                            placeholder="No. rumah, patokan, dll"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className={cn(inputClass, "resize-none")}
                        />
                    </div>
                </div>
            </div>

            {/* Auto-filled Area */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Area (otomatis dari peta)</p>
                <div className={cn("grid gap-4", compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-4")}>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Provinsi</label>
                        <input
                            type="text"
                            value={selectedArea?.administrativeLevel.province || ""}
                            readOnly
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600"
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Kota</label>
                        <input
                            type="text"
                            value={selectedArea?.administrativeLevel.city || ""}
                            readOnly
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600"
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Kecamatan</label>
                        <input
                            type="text"
                            value={selectedArea?.administrativeLevel.district || ""}
                            readOnly
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600"
                            placeholder="—"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Kode Pos</label>
                        <input
                            type="text"
                            value={selectedArea?.postalCode || ""}
                            readOnly
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600"
                            placeholder="—"
                        />
                    </div>
                </div>
            </div>

            {/* Warning if no area selected */}
            {!selectedArea && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    Pilih lokasi dari peta atau cari alamat untuk mengisi data area secara otomatis.
                </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className={cn(
                        "px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl transition-all",
                        !canSubmit || submitting ? "opacity-40 cursor-not-allowed" : "hover:bg-primary/90"
                    )}
                >
                    {submitting ? "Menyimpan..." : submitLabel}
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Batal
                    </button>
                )}
            </div>

            {/* Google Maps Script */}
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                onLoad={() => setMapsLoaded(true)}
                strategy="lazyOnload"
            />
        </div>
    )
}
