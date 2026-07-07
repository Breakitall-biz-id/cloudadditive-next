"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { updateCustomerNotificationSettings, type NotificationSettingsPayload } from "@/actions/customer-settings"

interface NotificationSetting {
    key: string
    label: string
    description: string
    enabled: boolean
}

interface NotificationGroup {
    title: string
    settings: NotificationSetting[]
}

const defaultGroups: NotificationGroup[] = [
    {
        title: "Pesanan & Pengiriman",
        settings: [
            { key: "order_confirmed", label: "Konfirmasi Pesanan", description: "Notifikasi saat pesanan dikonfirmasi", enabled: true },
            { key: "print_started", label: "Pencetakan Dimulai", description: "Notifikasi saat proses cetak dimulai", enabled: true },
            { key: "print_completed", label: "Pencetakan Selesai", description: "Notifikasi saat proses cetak selesai", enabled: true },
            { key: "shipping_update", label: "Update Pengiriman", description: "Notifikasi tracking pengiriman", enabled: true },
        ],
    },
    {
        title: "Pembayaran",
        settings: [
            { key: "payment_success", label: "Pembayaran Berhasil", description: "Notifikasi saat pembayaran diterima", enabled: true },
            { key: "payment_reminder", label: "Pengingat Pembayaran", description: "Pengingat untuk pesanan belum dibayar", enabled: true },
            { key: "refund", label: "Pengembalian Dana", description: "Notifikasi saat refund diproses", enabled: true },
        ],
    },
    {
        title: "Promosi & Informasi",
        settings: [
            { key: "promo", label: "Promo & Diskon", description: "Penawaran spesial dan diskon", enabled: false },
            { key: "newsletter", label: "Newsletter", description: "Tips & berita seputar 3D printing", enabled: false },
            { key: "product_update", label: "Update Material Baru", description: "Notifikasi material atau fitur baru", enabled: true },
        ],
    },
]

interface NotificationsTabProps {
    initialEmailEnabled: boolean
    initialSettings: NotificationSettingsPayload
}

export function NotificationsTab({ initialEmailEnabled, initialSettings }: NotificationsTabProps) {
    const [groups, setGroups] = useState<NotificationGroup[]>(() => {
        const map: Record<string, boolean> = {
            order_confirmed: initialSettings.orderConfirmed,
            print_started: initialSettings.printStarted,
            print_completed: initialSettings.printCompleted,
            shipping_update: initialSettings.shippingUpdate,
            payment_success: initialSettings.paymentSuccess,
            payment_reminder: initialSettings.paymentReminder,
            refund: initialSettings.refund,
            promo: initialSettings.promo,
            newsletter: initialSettings.newsletter,
            product_update: initialSettings.productUpdate,
        }

        return defaultGroups.map(group => ({
            ...group,
            settings: group.settings.map(setting => ({
                ...setting,
                enabled: map[setting.key] ?? setting.enabled,
            }))
        }))
    })
    const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const toggleSetting = (groupIndex: number, settingIndex: number) => {
        setGroups((prev) => {
            const updated = [...prev]
            const group = { ...updated[groupIndex] }
            const settings = [...group.settings]
            settings[settingIndex] = { ...settings[settingIndex], enabled: !settings[settingIndex].enabled }
            group.settings = settings
            updated[groupIndex] = group
            return updated
        })
    }

    const toggleAll = (groupIndex: number, value: boolean) => {
        setGroups((prev) => {
            const updated = [...prev]
            const group = { ...updated[groupIndex] }
            group.settings = group.settings.map((s) => ({ ...s, enabled: value }))
            updated[groupIndex] = group
            return updated
        })
    }

    const toPayload = (): NotificationSettingsPayload => {
        const all = groups.flatMap(g => g.settings)
        const get = (key: string) => all.find(s => s.key === key)?.enabled ?? false
        return {
            emailEnabled,
            orderConfirmed: get("order_confirmed"),
            printStarted: get("print_started"),
            printCompleted: get("print_completed"),
            shippingUpdate: get("shipping_update"),
            paymentSuccess: get("payment_success"),
            paymentReminder: get("payment_reminder"),
            refund: get("refund"),
            promo: get("promo"),
            newsletter: get("newsletter"),
            productUpdate: get("product_update"),
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMsg(null)
        const result = await updateCustomerNotificationSettings(toPayload())
        if (result.success) {
            setMsg({ type: "success", text: "Preferensi notifikasi tersimpan." })
        } else {
            setMsg({ type: "error", text: result.error || "Gagal menyimpan preferensi" })
        }
        setSaving(false)
        setTimeout(() => setMsg(null), 3000)
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Section Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-900">Notifikasi</h3>
                <p className="text-sm text-slate-500">Atur jenis notifikasi yang ingin Anda terima.</p>
            </div>

            {/* Email Preference */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 card-shadow shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Notifikasi Email</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Terima notifikasi melalui email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={emailEnabled}
                            onChange={() => setEmailEnabled(!emailEnabled)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border-gray-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all peer-checked:bg-primary">
                        </div>
                    </label>
                </div>
            </div>

            {/* Notification Groups */}
            {groups.map((group, gi) => {
                const allEnabled = group.settings.every((s) => s.enabled)

                return (
                    <div key={group.title} className="bg-white rounded-2xl border border-slate-200 card-shadow shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h4 className="text-sm font-bold text-slate-900">{group.title}</h4>
                            <button
                                onClick={() => toggleAll(gi, !allEnabled)}
                                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                                {allEnabled ? "Matikan Semua" : "Aktifkan Semua"}
                            </button>
                        </div>

                        {/* Settings List */}
                        <div className="divide-y divide-slate-50">
                            {group.settings.map((setting, si) => (
                                <div key={setting.key} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{setting.label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{setting.description}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={setting.enabled}
                                            onChange={() => toggleSetting(gi, si)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer 
                                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                            after:bg-white after:border-gray-300 after:border after:rounded-full 
                                            after:h-5 after:w-5 after:transition-all peer-checked:bg-primary">
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}

            <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400 italic">
                    Perubahan preferensi notifikasi akan berlaku segera.
                </p>
                <div className="flex items-center gap-3">
                    {msg && (
                        <span className={cn("text-xs font-medium", msg.type === "success" ? "text-emerald-600" : "text-red-500")}>
                            {msg.text}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                            saving ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90"
                        )}
                    >
                        {saving ? "Menyimpan..." : "Simpan Preferensi"}
                    </button>
                </div>
            </div>
        </section>
    )
}
