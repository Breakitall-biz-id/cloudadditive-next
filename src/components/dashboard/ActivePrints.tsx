"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { getCustomerActiveOrders, getOrderDetail } from "@/actions/customer-orders"
import { OrderDetailModal } from "./OrderDetailModal"

type Order = {
    id: string
    orderNumber: string
    status: string
    createdAt: Date
    totalPrice: any // Prisma Decimal type
    quantity: number
    stlFileName: string
    thumbnailUrl: string | null
    material: {
        name: string
    } | null
    quality: {
        name: string
    } | null
    printer: {
        name: string
        provider: {
            businessName: string
        }
    } | null
    printProgress?: number | null
}

export function ActivePrints() {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [snapReady, setSnapReady] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function loadOrders() {
            setIsLoading(true)
            const result = await getCustomerActiveOrders()
            if (result.success) {
                setOrders(result.orders as Order[])
            }
            setIsLoading(false)
        }
        loadOrders()
    }, [])

    if (isLoading) {
        return (
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Active Orders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                            <div className="aspect-video w-full rounded-xl bg-slate-200 mb-4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                            <div className="h-6 bg-slate-200 rounded w-2/3 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (orders.length === 0) {
        return (
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Active Orders</h2>
                <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
                    <span className="material-symbols-outlined text-6xl text-slate-300">inbox</span>
                    <h3 className="font-bold text-slate-700 mt-4">No Active Orders</h3>
                    <p className="text-sm text-slate-500 mt-2">Start a new print order to see it here</p>
                    <Link
                        href="/order"
                        className="inline-block mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                    >
                        Create New Order
                    </Link>
                </div>
            </section>
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

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Active Orders</h2>
                    <Link href="/dashboard/orders" className="text-primary text-sm font-semibold hover:underline">
                        View all orders
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onViewDetail={() => setSelectedOrderId(order.id)}
                            snapReady={snapReady}
                            router={router}
                        />
                    ))}
                </div>
            </section>

            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </>
    )
}

function OrderCard({ order, onViewDetail, snapReady, router }: {
    order: Order;
    onViewDetail: () => void;
    snapReady: boolean;
    router: ReturnType<typeof useRouter>;
}) {
    const isPendingPayment = order.status === "PENDING_PAYMENT"
    const isPaymentFailed = order.status === "PAYMENT_FAILED"
    const isPrinting = order.status === "PRINTING"
    const isQueueing = order.status === "IN_QUEUE" || order.status === "CONFIRMED"
    const [isProcessing, setIsProcessing] = useState(false)

    const handlePayment = async () => {
        if (!snapReady) {
            console.error('Midtrans Snap is not ready yet')
            return
        }

        setIsProcessing(true)

        try {
            // Fetch order details to get snapToken
            const result = await getOrderDetail(order.id)

            if (!result.success || !result.order) {
                console.error('Failed to fetch order details')
                setIsProcessing(false)
                return
            }

            const snapToken = result.order.snapToken

            if (!snapToken) {
                console.error('No snap token available for this order')
                setIsProcessing(false)
                return
            }

            // Trigger Midtrans Snap popup
            window.snap?.pay(snapToken, {
                onSuccess: (result) => {
                    console.log('Payment success:', result)
                    router.push('/order/success')
                },
                onPending: (result) => {
                    console.log('Payment pending:', result)
                    router.push('/order/pending')
                },
                onError: (result) => {
                    console.error('Payment error:', result)
                    router.push('/order/failed')
                },
                onClose: () => {
                    console.log('Payment popup closed')
                    setIsProcessing(false)
                }
            })
        } catch (error) {
            console.error('Error initiating payment:', error)
            setIsProcessing(false)
        }
    }

    return (
        <div className={`bg-white border-2 rounded-2xl p-5 hover:shadow-md transition-all ${isPendingPayment ? 'border-amber-200' : isPaymentFailed ? 'border-red-200' : 'border-slate-200 hover:border-primary/50'
            }`}>
            {/* Image Container */}
            <div className="aspect-video w-full rounded-xl bg-slate-100 mb-4 overflow-hidden relative group">
                {isPendingPayment && (
                    <div className="absolute inset-0 bg-amber-50/90 flex items-center justify-center z-10 backdrop-blur-[1px]">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-4xl text-amber-500">schedule</span>
                            <p className="text-xs font-bold text-amber-700 mt-2">MENUNGGU PEMBAYARAN</p>
                        </div>
                    </div>
                )}

                {isPaymentFailed && (
                    <div className="absolute inset-0 bg-red-50/90 flex items-center justify-center z-10 backdrop-blur-[1px]">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
                            <p className="text-xs font-bold text-red-700 mt-2">PEMBAYARAN GAGAL</p>
                        </div>
                    </div>
                )}

                {isPrinting && !isPendingPayment && !isPaymentFailed && (
                    <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 z-10">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span> PRINTING
                    </div>
                )}

                {isQueueing && !isPendingPayment && !isPaymentFailed && (
                    <div className="absolute top-3 left-3 bg-slate-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-10">
                        QUEUEING
                    </div>
                )}

                {order.thumbnailUrl ? (
                    <img
                        src={order.thumbnailUrl}
                        alt={order.stlFileName}
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isPendingPayment || isPaymentFailed || isQueueing ? 'grayscale' : ''
                            }`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <span className="material-symbols-outlined text-4xl text-slate-300">view_in_ar</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className={`font-mono text-sm font-bold tracking-tight ${isPendingPayment ? 'text-amber-600' : isPaymentFailed ? 'text-red-600' : 'text-primary'
                        }`}>
                        {order.orderNumber}
                    </p>
                    <p className="font-bold text-slate-900 line-clamp-1">{order.stlFileName}</p>
                    <p className="text-xs mt-1 text-slate-500">
                        {order.material?.name} • {order.quantity} Unit{order.quantity > 1 ? 's' : ''}
                    </p>
                </div>
                {isPrinting && order.printProgress !== null && (
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{order.printProgress}%</p>
                    </div>
                )}
            </div>

            {/* Progress Bar (only for printing) */}
            {isPrinting && order.printProgress !== null && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div
                        className="h-full bg-primary transition-all duration-1000 ease-out"
                        style={{ width: `${order.printProgress}%` }}
                    ></div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {isPendingPayment && (
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing || !snapReady}
                        className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">payment</span>
                                Bayar Sekarang
                            </>
                        )}
                    </button>
                )}
                {isPaymentFailed && (
                    <button
                        onClick={handlePayment}
                        className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Coba Lagi
                    </button>
                )}
                <button
                    onClick={onViewDetail}
                    className={`px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${isPendingPayment || isPaymentFailed
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                >
                    <span className="material-symbols-outlined text-lg">info</span>
                    Detail
                </button>
            </div>
        </div>
    )
}
