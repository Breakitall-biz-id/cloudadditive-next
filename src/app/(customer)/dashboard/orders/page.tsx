import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OrderService } from "@/services/order"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { OrdersClient } from "./OrdersClient"

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    const userId = session.user.id
    const [allOrders, activeOrder, stats] = await Promise.all([
        OrderService.getUserOrders(userId),
        OrderService.getActiveOrder(userId),
        OrderService.getOrderStats(userId)
    ])

    // Filter out the active order from the general list if it's displayed separately
    // Or keep it? Usually active is shown at top, then list of "Past Orders". 
    // Let's interpret the UI: "Active Order" (singular big card) + "Past Orders" (list).
    // So "Past Orders" should exclude the one strictly currently active? 
    // Or maybe list everything. Let's exclude the featured active one to avoid duplication.

    const pastOrders = allOrders.filter(o => o.id !== activeOrder?.id)

    const serializedOrders = pastOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        totalPrice: Number(o.totalPrice),
        status: o.status,
        stlFileName: o.stlFileName,
        quantity: o.quantity,
        colorName: o.colorName || null,
        thumbnailUrl: o.thumbnailUrl || null,
        materialName: o.material?.name || "Unknown",
    }))

    const serializedActiveOrder = activeOrder ? {
        id: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        createdAt: activeOrder.createdAt.toISOString(),
        totalPrice: Number(activeOrder.totalPrice),
        status: activeOrder.status,
        stlFileName: activeOrder.stlFileName,
        quantity: activeOrder.quantity,
        thumbnailUrl: activeOrder.thumbnailUrl,
        material: { name: activeOrder.material?.name || "Unknown" },
        provider: activeOrder.provider ? { businessName: activeOrder.provider.businessName } : null,
        statusHistory: activeOrder.statusHistory.map(h => ({
            status: h.status,
            createdAt: h.createdAt.toISOString(),
        })),
        shippingAddress: activeOrder.shippingAddress,
        courierCode: activeOrder.courierCode,
        trackingNumber: activeOrder.trackingNumber,
        shippedAt: activeOrder.shippedAt ? activeOrder.shippedAt.toISOString() : null,
    } : null

    return (
        <div className="custom-scrollbar h-full">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">My Orders</h2>
                    <p className="text-slate-500 mt-1">Manage and track your <span className="font-bold text-slate-900">{stats.active}</span> active and past projects.</p>
                </div>
                <Link
                    href="/order"
                    className="bg-primary text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-orange-600 transition-all card-shadow"
                >
                    <PlusCircle className="w-5 h-5" />
                    New Order
                </Link>
            </div>

            <OrdersClient
                orders={serializedOrders}
                activeOrder={serializedActiveOrder}
            />

            <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50">
                <span className="material-symbols-outlined">support_agent</span>
            </button>
        </div>
    )
}
