"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { updateCustomerProfile, addCustomerAddress, deleteCustomerAddress, setDefaultAddress } from "@/actions/customer-settings"
import { AddressFormWithMap, type AddressFormData } from "@/components/shared/AddressFormWithMap"

interface Address {
    id: string
    label: string
    recipientName: string
    phone: string
    street: string
    city: string
    province: string
    postalCode: string
    isDefault: boolean
    latitude: number | null
    longitude: number | null
}

interface ProfileTabProps {
    user: {
        id: string
        name: string
        email: string
        phone: string | null
        avatarUrl: string | null
    }
    addresses: Address[]
    onRefresh: () => void
}

export function ProfileTab({ user, addresses, onRefresh }: ProfileTabProps) {
    const [name, setName] = useState(user.name)
    const [phone, setPhone] = useState(user.phone || "")
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    const handleSaveProfile = async () => {
        setSaving(true)
        setSaveMsg(null)
        const result = await updateCustomerProfile({ name, phone })
        if (result.success) {
            setSaveMsg({ type: "success", text: "Profil berhasil disimpan!" })
            onRefresh()
        } else {
            setSaveMsg({ type: "error", text: result.error || "Gagal menyimpan" })
        }
        setSaving(false)
        setTimeout(() => setSaveMsg(null), 3000)
    }

    const handleAddAddress = async (data: AddressFormData) => {
        const result = await addCustomerAddress({
            ...data,
            isDefault: addresses.length === 0,
        })
        if (result.success) {
            setShowAddForm(false)
            onRefresh()
        }
    }

    const handleDeleteAddress = async (id: string) => {
        if (!confirm("Yakin ingin menghapus alamat ini?")) return
        await deleteCustomerAddress(id)
        onRefresh()
    }

    const handleSetDefault = async (id: string) => {
        await setDefaultAddress(id)
        onRefresh()
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Section Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-900">Informasi Profil</h3>
                <p className="text-sm text-slate-500">Kelola data pribadi dan foto profil Anda.</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 card-shadow shadow-sm space-y-8">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                    <div className="relative">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt="Foto profil"
                                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                <span className="text-xl font-bold text-primary">{initials}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <button className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors mb-1.5">
                            Ubah Foto
                        </button>
                        <p className="text-xs text-slate-400">JPG, PNG. Maks 800KB</p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nomor Telepon</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+62 812 3456 7890"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className={cn(
                            "px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl transition-all shadow-sm",
                            saving ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90 hover:shadow-md"
                        )}
                    >
                        {saving ? "Menyimpan..." : "Simpan Profil"}
                    </button>
                    {saveMsg && (
                        <p className={cn(
                            "text-sm font-medium animate-in fade-in",
                            saveMsg.type === "success" ? "text-emerald-600" : "text-red-500"
                        )}>
                            {saveMsg.text}
                        </p>
                    )}
                </div>
            </div>

            {/* Saved Addresses */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Alamat Tersimpan</h3>
                        <p className="text-sm text-slate-500">Kelola alamat pengiriman Anda.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="text-primary text-sm font-bold hover:text-primary/80 transition-colors"
                    >
                        {showAddForm ? "Batal" : "+ Tambah Alamat"}
                    </button>
                </div>

                {/* Add Address Form – Now with Map Picker */}
                {showAddForm && (
                    <div className="bg-white rounded-2xl border border-primary/20 border-dashed p-6 card-shadow shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 className="text-sm font-bold text-slate-900 mb-4">Alamat Baru</h4>
                        <AddressFormWithMap
                            onSubmit={handleAddAddress}
                            onCancel={() => setShowAddForm(false)}
                            showLabel
                            compact
                        />
                    </div>
                )}

                {/* Address Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                        <div
                            key={addr.id}
                            className={cn(
                                "group p-5 rounded-2xl border bg-white card-shadow shadow-sm transition-all",
                                addr.isDefault
                                    ? "border-primary/30 bg-primary/[0.02]"
                                    : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">{addr.label}</span>
                                    {addr.isDefault && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                            UTAMA
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!addr.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(addr.id)}
                                            className="px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                        >
                                            Jadikan Utama
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteAddress(addr.id)}
                                        className="px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 font-medium">{addr.recipientName}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {addr.street}
                                <br />
                                {addr.city}, {addr.province} {addr.postalCode}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">{addr.phone}</p>
                        </div>
                    ))}

                    {addresses.length === 0 && !showAddForm && (
                        <div className="md:col-span-2 text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <p className="text-sm text-slate-400">Belum ada alamat tersimpan</p>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="text-primary text-sm font-bold hover:underline mt-2"
                            >
                                Tambah alamat pertama
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
