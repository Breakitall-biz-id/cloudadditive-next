'use client'

import { useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import {
    CheckCircle2,
    Clock,
    XCircle,
    Package,
    ArrowRight,
    Home,
    FileText,
} from 'lucide-react'

// Status configuration
const STATUS_CONFIG = {
    success: {
        icon: CheckCircle2,
        title: 'Pembayaran Berhasil!',
        subtitle: 'Pesanan kamu telah dikonfirmasi dan sedang diproses.',
        description:
            'Kami akan mulai mencetak pesanan kamu segera. Kamu akan menerima email konfirmasi beserta detail pesanan.',
        bgGradient: 'from-emerald-500/10 via-transparent to-teal-500/10',
        iconColor: 'text-emerald-500',
        ringColor: 'ring-emerald-500/20',
        bgIcon: 'bg-emerald-500/10',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-600 dark:text-emerald-400',
        badgeLabel: 'Payment Confirmed',
        accentBar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        btnBg: 'bg-emerald-600 hover:bg-emerald-700',
        btnLabel: 'Lihat Pesanan Saya',
        showPulse: false,
    },
    pending: {
        icon: Clock,
        title: 'Menunggu Pembayaran',
        subtitle: 'Pembayaran kamu sedang diproses.',
        description:
            'Mohon selesaikan pembayaran sebelum batas waktu yang ditentukan. Pesanan akan otomatis dikonfirmasi setelah pembayaran berhasil.',
        bgGradient: 'from-amber-500/10 via-transparent to-orange-500/10',
        iconColor: 'text-amber-500',
        ringColor: 'ring-amber-500/20',
        bgIcon: 'bg-amber-500/10',
        badgeBg: 'bg-amber-500/10',
        badgeText: 'text-amber-600 dark:text-amber-400',
        badgeLabel: 'Awaiting Payment',
        accentBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
        btnBg: 'bg-amber-600 hover:bg-amber-700',
        btnLabel: 'Cek Status Pesanan',
        showPulse: true,
    },
    failed: {
        icon: XCircle,
        title: 'Pembayaran Gagal',
        subtitle: 'Terjadi kesalahan saat memproses pembayaran kamu.',
        description:
            'Silakan coba lagi atau gunakan metode pembayaran lain. Jika masalah berlanjut, hubungi tim support kami.',
        bgGradient: 'from-red-500/10 via-transparent to-rose-500/10',
        iconColor: 'text-red-500',
        ringColor: 'ring-red-500/20',
        bgIcon: 'bg-red-500/10',
        badgeBg: 'bg-red-500/10',
        badgeText: 'text-red-600 dark:text-red-400',
        badgeLabel: 'Payment Failed',
        accentBar: 'bg-gradient-to-r from-red-500 to-rose-500',
        btnBg: 'bg-red-600 hover:bg-red-700',
        btnLabel: 'Coba Lagi',
        showPulse: false,
    },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

function OrderStatusContent() {
    const params = useParams<{ status: string }>()
    const searchParams = useSearchParams()
    const status = params.status as StatusKey
    const orderId = searchParams.get('order_id')

    // Validate status
    if (!STATUS_CONFIG[status]) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                        Halaman Tidak Ditemukan
                    </h1>
                    <Link
                        href="/"
                        className="text-[var(--brand-primary)] hover:underline"
                    >
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        )
    }

    const config = STATUS_CONFIG[status]
    const Icon = config.icon

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            {/* Background gradient */}
            <div
                className={`fixed inset-0 bg-gradient-to-br ${config.bgGradient} pointer-events-none`}
            />

            <div className="relative w-full max-w-lg">
                {/* Main card */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden">
                    {/* Top accent bar */}
                    <div className={`h-1 w-full ${config.accentBar}`} />

                    <div className="p-8 sm:p-10">
                        {/* Icon with pulse effect */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                {config.showPulse && (
                                    <div
                                        className={`absolute inset-0 ${config.bgIcon} rounded-full animate-ping opacity-30`}
                                    />
                                )}
                                <div
                                    className={`w-20 h-20 ${config.bgIcon} rounded-full flex items-center justify-center ring-4 ${config.ringColor}`}
                                >
                                    <Icon className={`w-10 h-10 ${config.iconColor}`} />
                                </div>
                            </div>
                        </div>

                        {/* Badge */}
                        <div className="flex justify-center mb-4">
                            <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}
                            >
                                {config.badgeLabel}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] text-center mb-2">
                            {config.title}
                        </h1>

                        <p className="text-[var(--text-secondary)] text-center mb-6">
                            {config.subtitle}
                        </p>

                        {/* Order ID */}
                        {orderId && (
                            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Package className="w-4 h-4" />
                                        <span>Order ID</span>
                                    </div>
                                    <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                                        {orderId}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed mb-8">
                            {config.description}
                        </p>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-3">
                            {status === 'failed' ? (
                                <>
                                    <Link
                                        href="/order"
                                        className={`flex items-center justify-center gap-2 w-full px-6 py-3 ${config.btnBg} text-white rounded-xl font-medium transition-colors`}
                                    >
                                        {config.btnLabel}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="/dashboard/orders"
                                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl font-medium transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Lihat Pesanan Saya
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/dashboard/orders"
                                        className={`flex items-center justify-center gap-2 w-full px-6 py-3 ${config.btnBg} text-white rounded-xl font-medium transition-colors`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        {config.btnLabel}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="/"
                                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl font-medium transition-colors"
                                    >
                                        <Home className="w-4 h-4" />
                                        Kembali ke Beranda
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Help footer */}
                <p className="text-xs text-[var(--text-tertiary)] text-center mt-6">
                    Butuh bantuan?{' '}
                    <a
                        href="mailto:support@cloudadditive.com"
                        className="text-[var(--brand-primary)] hover:underline"
                    >
                        Hubungi Support
                    </a>
                </p>
            </div>
        </div>
    )
}

export default function OrderStatusPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" />
                </div>
            }
        >
            <OrderStatusContent />
        </Suspense>
    )
}
