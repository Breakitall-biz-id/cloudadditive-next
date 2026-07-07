"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Check, MapPin } from "lucide-react"
import { confirmOrderReceived } from "@/actions/customer-orders"

interface ActiveOrderProps {
    order: {
        id: string
        orderNumber: string
        createdAt: string
        totalPrice: any // Decimal
        status: string
        thumbnailUrl: string | null
        stlFileName: string
        material: {
            name: string
        }
        quantity: number
        statusHistory: { status: string; createdAt: string }[]
        provider?: {
            businessName: string
        } | null
        shippingAddress?: string | null
        courierCode?: string | null
        trackingNumber?: string | null
        shippedAt?: string | null
    }
}

export function ActiveOrderCard({ order }: ActiveOrderProps) {
    if (!order) return null;

    const [currentStatus, setCurrentStatus] = useState(order.status)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const formatStatus = (value: string) => value.replace(/_/g, " ")

    const history = [...order.statusHistory]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const canConfirmReceived = currentStatus === "SHIPPED" || currentStatus === "DELIVERED"

    const handleConfirmReceived = () => {
        if (!canConfirmReceived || isPending) return

        setFeedback(null)
        startTransition(async () => {
            const result = await confirmOrderReceived(order.id)
            if (result.success) {
                setCurrentStatus("COMPLETED")
                setFeedback({ type: "success", message: "Pesanan berhasil dikonfirmasi diterima." })
                return
            }
            setFeedback({
                type: "error",
                message: result.error || "Gagal mengonfirmasi pesanan diterima.",
            })
        })
    }

    const steps = history.length > 0
        ? history.map((h, idx) => ({
            status: idx === history.length - 1 ? "current" as const : "completed" as const,
            title: formatStatus(h.status),
            time: new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
        : [{
            status: "current" as const,
            title: "Order Placed",
            time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]

    return (
        <div className="bg-white border-2 border-primary rounded-3xl overflow-hidden card-shadow relative mb-6">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-orange-50/30">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                        <p className="font-mono text-primary font-bold">{order.orderNumber}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Placed</p>
                        <p className="text-sm font-semibold text-slate-700">
                            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Price</p>
                        <p className="text-sm font-bold text-slate-900">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(order.totalPrice))}
                        </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 active-dot"></span>
                        {currentStatus}
                    </span>
                </div>
            </div>

            {/* Product Info */}
            <div className="p-6 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-32 aspect-square rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0 relative">
                    <Image
                        src={order.thumbnailUrl || "https://images.unsplash.com/photo-1617791160536-598cf32026fb?q=80&w=300"}
                        alt="Active Project"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Name</p>
                        <p className="text-base font-bold text-slate-900">{order.stlFileName || "Untitled Project"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Material</p>
                        <p className="text-sm font-medium text-slate-700">{order.material.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                        <p className="text-sm font-medium text-slate-700">{order.quantity} Units</p>
                    </div>
                    <div className="flex items-center justify-end">
                        <button className="px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-orange-50 transition-colors flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Track Order
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracking Section */}
            <div className="bg-slate-50 border-t border-slate-200 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Timeline */}
                    <div className="lg:col-span-4 space-y-6">
                            <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">route</span>
                                Live Progress
                            </h4>
                            <div className="relative pl-8 space-y-8">
                                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-orange-100"></div>

                                {steps.map((step, idx) => (
                                    <div key={`${step.title}-${idx}`} className="relative flex gap-4 items-start">
                                        {step.status === "completed" ? (
                                            <div className="absolute -left-8 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white z-10 shadow-sm">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        ) : (
                                            <div className="absolute -left-8 w-6 h-6 rounded-full bg-orange-100 border-2 border-primary flex items-center justify-center z-10">
                                                <div className="w-2 h-2 bg-primary rounded-full active-dot"></div>
                                            </div>
                                        )}
                                        <div>
                                            <p className={`text-sm font-bold ${step.status === "current" ? "text-primary" : "text-slate-900"}`}>{step.title}</p>
                                            <p className="text-xs text-slate-500">{step.time}</p>
                                        </div>
                                    </div>
                                ))}

                        </div>
                    </div>

                    {/* Map Preview removed per request */}

                    {/* Courier Detail */}
                    <div className="lg:col-span-3 flex flex-col justify-between">
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Provider</p>
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    {order.provider?.businessName || "Assigned Provider"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shipping</p>
                                <p className="text-xs text-slate-600">{order.shippingAddress || "Address not available yet"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tracking</p>
                                {order.trackingNumber ? (
                                    <div className="text-xs text-slate-700 font-mono">
                                        {order.courierCode?.toUpperCase() || "Courier"} • {order.trackingNumber}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">Belum tersedia</p>
                                )}
                            </div>
                        </div>
                        {canConfirmReceived && (
                            <button
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={handleConfirmReceived}
                                disabled={isPending}
                            >
                                {isPending ? "Menyimpan..." : "Konfirmasi Diterima"}
                            </button>
                        )}
                        {feedback && (
                            <p className={cn(
                                "text-xs mt-3",
                                feedback.type === "success" ? "text-emerald-700" : "text-red-600"
                            )}>
                                {feedback.message}
                            </p>
                        )}
                        <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all mt-4">
                            Details
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}
