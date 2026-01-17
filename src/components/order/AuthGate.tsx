"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AuthGateProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

/**
 * AuthGate component for hybrid checkout flow
 * Shows login/register prompt if user is not authenticated
 * Otherwise renders children
 */
export function AuthGate({ children, fallback }: AuthGateProps) {
    const { data: session, status } = useSession()
    const router = useRouter()

    // Loading state
    if (status === "loading") {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                    <p className="text-slate-500 text-sm">Memeriksa sesi...</p>
                </div>
            </div>
        )
    }

    // Not authenticated - show login prompt
    if (!session) {
        const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/order"
        const loginUrl = `/login?callbackUrl=${encodeURIComponent(currentUrl)}`
        const registerUrl = `/register?callbackUrl=${encodeURIComponent(currentUrl)}`

        if (fallback) return <>{fallback}</>

        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="max-w-md mx-auto text-center">
                    {/* Lock Icon */}
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-3xl text-primary">lock</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-black text-slate-900 mb-2">
                        Masuk untuk Melanjutkan
                    </h2>
                    <p className="text-slate-500 mb-8">
                        Untuk menyelesaikan pesanan dan pembayaran, silakan masuk atau buat akun terlebih dahulu.
                    </p>

                    {/* Benefits */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            Dengan akun Anda dapat:
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Melacak status pesanan secara real-time",
                                "Melihat riwayat pesanan sebelumnya",
                                "Menyimpan alamat pengiriman favorit",
                                "Mendapatkan notifikasi update pesanan",
                            ].map((benefit, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <Link
                            href={loginUrl}
                            className="w-full bg-primary hover:bg-cyber-violet text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">login</span>
                            Masuk ke Akun
                        </Link>
                        <Link
                            href={registerUrl}
                            className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            Buat Akun Baru
                        </Link>
                    </div>

                    {/* Security Badge */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        Data Anda aman dan terenkripsi
                    </div>
                </div>
            </div>
        )
    }

    // Authenticated - render children
    return <>{children}</>
}
