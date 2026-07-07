"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface OrderCardProps {
    orderId: string
    date: string
    total: string
    status: string
    projectImage: string
    projectName: string
    material: string
    quantity: string
}

export function OrderCard({
    orderId,
    date,
    total,
    status,
    projectImage,
    projectName,
    material,
    quantity
}: OrderCardProps) {

    // Helper to get status colors
    const getStatusColor = (status: string) => {
        // Normalize status
        const s = status.toUpperCase();
        if (s === "DELIVERED" || s === "COMPLETED") {
            return "bg-emerald-100 text-emerald-700 border-emerald-200"
        }
        if (s === "SHIPPED") {
            return "bg-amber-100 text-amber-700 border-amber-200"
        }
        if (s === "CANCELLED" || s === "REFUNDED" || s === "PAYMENT_FAILED") {
            return "bg-red-100 text-red-700 border-red-200"
        }
        // Processing / Active states
        return "bg-blue-100 text-blue-700 border-blue-200"
    }

    return (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden card-shadow">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                        <p className="font-mono text-primary font-bold">{orderId}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Placed</p>
                        <p className="text-sm font-semibold text-slate-700">{date}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Price</p>
                        <p className="text-sm font-bold text-slate-900">{total}</p>
                    </div>
                    <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                        getStatusColor(status)
                    )}>
                        {status}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-32 aspect-square rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0 relative">
                    <Image
                        src={projectImage}
                        alt="Project Preview"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Name</p>
                        <p className="text-base font-bold text-slate-900">{projectName}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Material</p>
                        <p className="text-sm font-medium text-slate-700">{material}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                        <p className="text-sm font-medium text-slate-700">{quantity}</p>
                    </div>
                    <div className="flex items-center justify-end">
                        {status === "Shipped" ? (
                            <button className="px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-orange-50 transition-colors">
                                Track Order
                            </button>
                        ) : (
                            <button className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                                View Details
                            </button>
                        )}

                    </div>
                </div>
            </div>
        </div>
    )
}
