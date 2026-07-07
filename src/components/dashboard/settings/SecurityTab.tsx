"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { changeCustomerPassword, updateCustomerTwoFactor } from "@/actions/customer-settings"

interface SecurityTabProps {
    twoFactorEnabled: boolean
    sessionExpires: string | null
}

export function SecurityTab({ twoFactorEnabled, sessionExpires }: SecurityTabProps) {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [twoFactor, setTwoFactor] = useState(twoFactorEnabled)
    const [twoFactorSaving, setTwoFactorSaving] = useState(false)
    const [twoFactorMsg, setTwoFactorMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const handleChangePassword = async () => {
        setMsg(null)

        if (newPassword !== confirmPassword) {
            setMsg({ type: "error", text: "Konfirmasi password tidak cocok" })
            return
        }

        if (newPassword.length < 8) {
            setMsg({ type: "error", text: "Password baru minimal 8 karakter" })
            return
        }

        setSaving(true)
        const result = await changeCustomerPassword({
            currentPassword,
            newPassword,
        })

        if (result.success) {
            setMsg({ type: "success", text: "Password berhasil diubah!" })
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } else {
            setMsg({ type: "error", text: result.error || "Gagal mengubah password" })
        }
        setSaving(false)
        setTimeout(() => setMsg(null), 4000)
    }

    const handleToggleTwoFactor = async () => {
        const nextValue = !twoFactor
        setTwoFactor(nextValue)
        setTwoFactorSaving(true)
        setTwoFactorMsg(null)
        const result = await updateCustomerTwoFactor(nextValue)
        if (result.success) {
            setTwoFactorMsg({ type: "success", text: nextValue ? "2FA diaktifkan." : "2FA dinonaktifkan." })
        } else {
            setTwoFactor(!nextValue)
            setTwoFactorMsg({ type: "error", text: result.error || "Gagal memperbarui 2FA" })
        }
        setTwoFactorSaving(false)
        setTimeout(() => setTwoFactorMsg(null), 3000)
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Section Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-900">Keamanan Akun</h3>
                <p className="text-sm text-slate-500">Kelola password dan pengaturan keamanan akun Anda.</p>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 card-shadow shadow-sm space-y-6">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Ubah Password</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pastikan password baru minimal 8 karakter</p>
                </div>

                <div className="space-y-4 max-w-md">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Password Saat Ini</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Masukkan password saat ini"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {showCurrent ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Password Baru</label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Masukkan password baru"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {showNew ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="text-xs text-amber-500 mt-1">Minimal 8 karakter</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Konfirmasi Password Baru</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                            <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={handleChangePassword}
                        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                        className={cn(
                            "px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl transition-all shadow-sm",
                            saving || !currentPassword || !newPassword || !confirmPassword
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-primary/90 hover:shadow-md"
                        )}
                    >
                        {saving ? "Mengubah..." : "Ubah Password"}
                    </button>
                    {msg && (
                        <p className={cn(
                            "text-sm font-medium animate-in fade-in",
                            msg.type === "success" ? "text-emerald-600" : "text-red-500"
                        )}>
                            {msg.text}
                        </p>
                    )}
                </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 card-shadow shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Autentikasi Dua Faktor (2FA)</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Tambahkan lapisan keamanan ekstra untuk akun Anda.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={twoFactor}
                            onChange={handleToggleTwoFactor}
                            disabled={twoFactorSaving}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border-gray-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all peer-checked:bg-primary">
                        </div>
                    </label>
                </div>
                {twoFactorMsg && (
                    <p className={cn(
                        "text-xs mt-3 font-medium",
                        twoFactorMsg.type === "success" ? "text-emerald-600" : "text-red-500"
                    )}>
                        {twoFactorMsg.text}
                    </p>
                )}
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 card-shadow shadow-sm">
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-900">Sesi Aktif</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Perangkat yang saat ini login ke akun Anda.</p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/[0.03] border border-primary/10">
                        <div>
                            <p className="text-sm font-bold text-slate-900">Sesi saat ini</p>
                            <p className="text-xs text-slate-500">
                                {sessionExpires ? `Berlaku hingga ${new Date(sessionExpires).toLocaleString("id-ID")}` : "Aktif sekarang"}
                            </p>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            AKTIF
                        </span>
                    </div>
                </div>
            </div>
        </section>
    )
}
