"use client"

import { useEffect, useState } from "react"
import { getUserAddresses } from "@/actions/customer-settings"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"

interface SavedAddressListProps {
    wizard: UseOrderWizardReturn
}

interface Address {
    id: string
    label: string
    recipientName: string
    phone: string
    street: string
    city: string
    province: string
    postalCode: string
    latitude: number | null
    longitude: number | null
    isDefault: boolean
}

export function SavedAddressList({ wizard }: SavedAddressListProps) {
    const { state, actions } = wizard
    const [addresses, setAddresses] = useState<Address[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadAddresses() {
            setIsLoading(true)
            const result = await getUserAddresses()
            if (result.success) {
                setAddresses(result.addresses)
            }
            setIsLoading(false)
        }
        loadAddresses()
    }, [])

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12">
                <div className="text-center">
                    <div className="animate-spin inline-block">
                        <span className="material-symbols-outlined text-4xl text-primary">sync</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-4">Memuat alamat tersimpan...</p>
                </div>
            </div>
        )
    }

    if (addresses.length === 0) {
        return (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-8">
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-amber-400">location_off</span>
                    <h4 className="font-bold text-amber-900 mt-4">Belum Ada Alamat Tersimpan</h4>
                    <p className="text-sm text-amber-700 mt-2">
                        Anda belum memiliki alamat tersimpan. Silakan gunakan tab "Alamat Baru" untuk menambahkan alamat.
                    </p>
                    <button
                        onClick={() => actions.setAddressMode('new')}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                    >
                        Tambah Alamat Baru
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {addresses.map((address) => (
                <button
                    key={address.id}
                    onClick={() => actions.selectSavedAddress(address)}
                    className={`w-full text-left bg-white rounded-xl border-2 p-5 transition-all hover:border-primary/50 hover:shadow-md ${state.selectedSavedAddressId === address.id
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                            <div className={`size-12 rounded-xl flex items-center justify-center flex-shrink-0 ${state.selectedSavedAddressId === address.id
                                    ? 'bg-primary/10'
                                    : 'bg-slate-100'
                                }`}>
                                <span className={`material-symbols-outlined text-2xl ${state.selectedSavedAddressId === address.id
                                        ? 'text-primary'
                                        : 'text-slate-400'
                                    }`}>
                                    home
                                </span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900">{address.label}</h4>
                                    {address.isDefault && (
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                            UTAMA
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 mb-2">
                                    {address.recipientName} • {address.phone}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {address.street}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {address.city}, {address.province} {address.postalCode}
                                </p>
                            </div>
                        </div>
                        {state.selectedSavedAddressId === address.id && (
                            <div className="flex-shrink-0">
                                <div className="size-8 rounded-full bg-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-lg">check</span>
                                </div>
                            </div>
                        )}
                    </div>
                </button>
            ))}
        </div>
    )
}
