"use client"

import { useMemo, useState } from "react"
import type { OrderStatus } from "@prisma/client"
import { OrdersFilter } from "@/components/dashboard/orders/OrdersFilter"
import { ActiveOrderCard } from "@/components/dashboard/orders/ActiveOrderCard"
import { OrderCard } from "@/components/dashboard/orders/OrderCard"
import Link from "next/link"

interface OrderItem {
    id: string
    orderNumber: string
    createdAt: string
    totalPrice: number
    status: OrderStatus
    stlFileName: string
    quantity: number
    colorName: string | null
    thumbnailUrl: string | null
    materialName: string
}

interface ActiveOrderItem {
    id: string
    orderNumber: string
    createdAt: string
    totalPrice: number
    status: OrderStatus
    stlFileName: string
    quantity: number
    thumbnailUrl: string | null
    material: { name: string }
    provider?: { businessName: string } | null
    statusHistory: { status: OrderStatus; createdAt: string }[]
    shippingAddress?: string | null
    courierCode?: string | null
    trackingNumber?: string | null
    shippedAt?: string | null
}

interface OrdersClientProps {
    orders: OrderItem[]
    activeOrder: ActiveOrderItem | null
}

const ACTIVE_STATUSES: OrderStatus[] = [
    "PENDING_PAYMENT",
    "CONFIRMED",
    "IN_QUEUE",
    "SLICING",
    "PRINTING",
    "POST_PROCESSING",
    "PACKING",
    "SHIPPED",
    "DELIVERED",
]

const COMPLETED_STATUSES: OrderStatus[] = [
    "COMPLETED",
]

const CANCELLED_STATUSES: OrderStatus[] = [
    "CANCELLED",
    "REFUNDED",
    "PAYMENT_FAILED",
]

export function OrdersClient({ orders, activeOrder }: OrdersClientProps) {
    const [activeTab, setActiveTab] = useState("All Orders")
    const [query, setQuery] = useState("")

    const filteredOrders = useMemo(() => {
        const q = query.trim().toLowerCase()
        return orders.filter(order => {
            const statusMatch =
                activeTab === "All Orders" ||
                (activeTab === "Active" && ACTIVE_STATUSES.includes(order.status)) ||
                (activeTab === "Completed" && COMPLETED_STATUSES.includes(order.status)) ||
                (activeTab === "Cancelled" && CANCELLED_STATUSES.includes(order.status))

            if (!statusMatch) return false

            if (!q) return true

            const haystack = [
                order.orderNumber,
                order.stlFileName,
                order.materialName,
                order.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            return haystack.includes(q)
        })
    }, [orders, activeTab, query])

    return (
        <>
            <OrdersFilter
                activeTab={activeTab}
                onTabChange={setActiveTab}
                query={query}
                onQueryChange={setQuery}
            />

            <div className="grid grid-cols-1 gap-6 mb-20">
                {activeOrder && (
                    <ActiveOrderCard order={activeOrder} />
                )}

                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            orderId={order.orderNumber}
                            date={new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            total={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(order.totalPrice))}
                            status={order.status}
                            projectName={order.stlFileName || "Untitled Project"}
                            material={`${order.materialName}${order.colorName ? ` (${order.colorName})` : ''}`}
                            quantity={`${order.quantity} Unit${order.quantity > 1 ? 's' : ''}`}
                            projectImage={order.thumbnailUrl || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=300"}
                        />
                    ))
                ) : (
                    !activeOrder && (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                            <p className="text-slate-400 font-medium">No orders found</p>
                            <Link href="/order" className="text-primary font-bold hover:underline mt-2 inline-block">Start a new project</Link>
                        </div>
                    )
                )}
            </div>
        </>
    )
}
