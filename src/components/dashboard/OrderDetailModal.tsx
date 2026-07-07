"use client"

import { useEffect, useState } from "react"
import { getOrderDetail } from "@/actions/customer-orders"

type OrderDetail = {
    id: string
    orderNumber: string
    status: string
    createdAt: Date
    totalPrice: any
    quantity: number
    stlFileName: string
    thumbnailUrl: string | null
    material: {
        name: string
        pricePerGram?: any
    } | null
    quality: {
        name: string
    } | null
    printer: {
        name: string
        provider: {
            businessName: string
            city: string
        }
    } | null
    // Delivery info (optional)
    recipientName?: string | null
    recipientPhone?: string | null
    deliveryStreet?: string | null
    deliveryCity?: string | null
    deliveryProvince?: string | null
    deliveryPostalCode?: string | null
    // Pricing (optional)
    materialCost?: any | null
    printTimeCost?: any | null
    processingFee?: any | null
    shippingCost?: any | null
    // Model details (optional)
    estimatedPrintTime?: number | null
    filamentWeightG?: number | null
    modelWidth?: number | null
    modelHeight?: number | null
    modelDepth?: number | null
}

type OrderDetailModalProps = {
    orderId: string
    onClose: () => void
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
    const [order, setOrder] = useState<OrderDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadOrder() {
            setIsLoading(true)
            const result = await getOrderDetail(orderId)
            if (result.success && result.order) {
                setOrder(result.order as OrderDetail)
            } else {
                setError(result.error || "Failed to load order")
            }
            setIsLoading(false)
        }
        loadOrder()
    }, [orderId])

    const handlePayment = () => {
        window.location.href = `/payment/${orderId}`
    }

    const isPendingPayment = order?.status === "PENDING_PAYMENT"
    const isPaymentFailed = order?.status === "PAYMENT_FAILED"

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Order Details</h2>
                        {order && (
                            <p className="text-sm text-slate-500 font-mono">{order.orderNumber}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isLoading && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-sm text-slate-500 mt-4">Loading order details...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
                            <p className="text-sm text-red-700 mt-2">{error}</p>
                        </div>
                    )}

                    {order && (
                        <>
                            {/* Status Badge */}
                            <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${isPendingPayment ? 'bg-amber-100 text-amber-700' :
                                    isPaymentFailed ? 'bg-red-100 text-red-700' :
                                        'bg-primary/10 text-primary'
                                    }`}>
                                    {order.status.replace(/_/g, ' ')}
                                </div>
                                <p className="text-sm text-slate-500">
                                    {new Date(order.createdAt).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>

                            {/* Model Preview */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-bold text-slate-900 mb-3">Model</h3>
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden">
                                        {order.thumbnailUrl ? (
                                            <img
                                                src={order.thumbnailUrl}
                                                alt={order.stlFileName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-3xl text-slate-400">view_in_ar</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900">{order.stlFileName}</p>
                                        {order.modelWidth && order.modelHeight && order.modelDepth && (
                                            <p className="text-sm text-slate-500 mt-1">
                                                Dimensions: {order.modelWidth.toFixed(1)} × {order.modelHeight.toFixed(1)} × {order.modelDepth.toFixed(1)} mm
                                            </p>
                                        )}
                                        {order.estimatedPrintTime && (
                                            <p className="text-sm text-slate-500">
                                                Print time: {Math.floor(order.estimatedPrintTime / 60)}h {order.estimatedPrintTime % 60}m
                                            </p>
                                        )}
                                        {order.filamentWeightG && (
                                            <p className="text-sm text-slate-500">
                                                Filament: {order.filamentWeightG.toFixed(1)}g
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Configuration */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-bold text-slate-900 mb-3">Configuration</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500">Material</p>
                                        <p className="font-semibold text-slate-900">{order.material?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Quality</p>
                                        <p className="font-semibold text-slate-900">{order.quality?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Quantity</p>
                                        <p className="font-semibold text-slate-900">{order.quantity} unit{order.quantity > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Provider & Printer */}
                            {order.printer && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h3 className="font-bold text-slate-900 mb-3">Provider & Printer</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-slate-500">Provider</p>
                                            <p className="font-semibold text-slate-900">{order.printer.provider.businessName}</p>
                                            <p className="text-sm text-slate-500">{order.printer.provider.city}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Printer</p>
                                            <p className="font-semibold text-slate-900">{order.printer.name}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Delivery */}
                            {order.recipientName && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h3 className="font-bold text-slate-900 mb-3">Delivery</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-slate-500">Recipient</p>
                                            <p className="font-semibold text-slate-900">{order.recipientName}</p>
                                            <p className="text-sm text-slate-500">{order.recipientPhone}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Address</p>
                                            <p className="text-sm text-slate-700">
                                                {order.deliveryStreet}<br />
                                                {order.deliveryCity}, {order.deliveryProvince} {order.deliveryPostalCode}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cost Breakdown */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-bold text-slate-900 mb-3">Cost Breakdown</h3>
                                <div className="space-y-2">
                                    {order.materialCost && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Material</span>
                                            <span className="font-semibold">Rp {Number(order.materialCost).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {order.printTimeCost && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Print Time</span>
                                            <span className="font-semibold">Rp {Number(order.printTimeCost).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {order.processingFee && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Processing Fee</span>
                                            <span className="font-semibold">Rp {Number(order.processingFee).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {order.shippingCost && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Shipping</span>
                                            <span className="font-semibold">Rp {Number(order.shippingCost).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between">
                                        <span className="font-bold text-slate-900">Total</span>
                                        <span className="font-bold text-primary text-lg">
                                            Rp {Number(order.totalPrice).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {(isPendingPayment || isPaymentFailed) && (
                                    <button
                                        onClick={handlePayment}
                                        className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${isPaymentFailed ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined">
                                            {isPaymentFailed ? 'refresh' : 'payment'}
                                        </span>
                                        {isPaymentFailed ? 'Coba Lagi' : 'Bayar Sekarang'}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
