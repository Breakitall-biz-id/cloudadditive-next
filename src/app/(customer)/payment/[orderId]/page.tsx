'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOrderDetail } from '@/actions/customer-orders'
import Script from 'next/script'

export default function PaymentPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [order, setOrder] = useState<any>(null)
    const [snapToken, setSnapToken] = useState<string | null>(null)
    const [snapReady, setSnapReady] = useState(false)

    // Fetch order details
    useEffect(() => {
        async function loadOrder() {
            try {
                const result = await getOrderDetail(orderId)
                if (result.success && result.order) {
                    setOrder(result.order)

                    // Check if order has snapToken
                    if (result.order.snapToken) {
                        setSnapToken(result.order.snapToken)
                    } else {
                        setError('Token pembayaran tidak ditemukan. Silakan hubungi customer service.')
                    }
                } else {
                    setError(result.error || 'Order tidak ditemukan')
                }
            } catch (err) {
                console.error('Failed to load order:', err)
                setError('Gagal memuat data order')
            } finally {
                setLoading(false)
            }
        }

        if (orderId) {
            loadOrder()
        }
    }, [orderId])

    // Open Midtrans Snap when ready
    useEffect(() => {
        if (snapReady && snapToken && window.snap) {
            window.snap.pay(snapToken, {
                onSuccess: function (result) {
                    console.log('Payment success:', result)
                    router.push(`/order/success?order_id=${order.orderNumber}`)
                },
                onPending: function (result) {
                    console.log('Payment pending:', result)
                    router.push(`/order/pending?order_id=${order.orderNumber}`)
                },
                onError: function (result) {
                    console.log('Payment error:', result)
                    router.push(`/order/failed?order_id=${order.orderNumber}`)
                },
                onClose: function () {
                    console.log('Payment popup closed')
                    router.push('/dashboard')
                }
            })
        }
    }, [snapReady, snapToken, order, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                    <p className="text-slate-600 font-medium">Memuat halaman pembayaran...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h1>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Load Midtrans Snap script */}
            <Script
                src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js'}
                data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
                onLoad={() => setSnapReady(true)}
                strategy="afterInteractive"
            />

            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <span className="material-symbols-outlined text-6xl text-primary mb-4 animate-pulse">payment</span>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Memproses Pembayaran</h1>
                    <p className="text-slate-600 mb-2">Order: {order?.orderNumber}</p>
                    <p className="text-sm text-slate-500 mb-6">Mohon tunggu, jendela pembayaran akan segera terbuka...</p>

                    {!snapReady && (
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    )}

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        </>
    )
}
