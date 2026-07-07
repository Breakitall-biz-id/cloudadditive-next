import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { WelcomeSection } from "@/components/dashboard/WelcomeSection"
import { OrderTimeline } from "@/components/dashboard/OrderTimeline"
import { ActivePrints } from "@/components/dashboard/ActivePrints"
import { OrderHistory } from "@/components/dashboard/OrderHistory"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { ProviderBanner } from "@/components/dashboard/ProviderBanner"
import { OrderStatus } from "@prisma/client"
import { OrderService } from "@/services/order"

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "Pending Payment",
    PAYMENT_FAILED: "Payment Failed",
    CONFIRMED: "Confirmed",
    IN_QUEUE: "In Queue",
    SLICING: "Slicing",
    PRINTING: "Printing",
    POST_PROCESSING: "Post Processing",
    PACKING: "Packing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
}

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "bg-amber-100 text-amber-800",
    PAYMENT_FAILED: "bg-red-100 text-red-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    IN_QUEUE: "bg-indigo-100 text-indigo-800",
    SLICING: "bg-purple-100 text-purple-800",
    PRINTING: "bg-emerald-100 text-emerald-800",
    POST_PROCESSING: "bg-orange-100 text-orange-800",
    PACKING: "bg-green-100 text-green-800",
    SHIPPED: "bg-amber-100 text-amber-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-slate-100 text-slate-600",
    REFUNDED: "bg-rose-100 text-rose-700",
}

const formatDateTime = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

export default async function DashboardPage() {
    const session = await auth()

    // Auth check is also handled in layout, but double check is fine or can be removed if strictly relying on layout/middleware
    if (!session) {
        redirect("/login")
    }

    const userId = session.user.id

    const [stats, activeOrder, allOrders] = await Promise.all([
        OrderService.getOrderStats(userId),
        OrderService.getActiveOrder(userId),
        OrderService.getUserOrders(userId),
    ])

    const historyStatuses: OrderStatus[] = [
        OrderStatus.COMPLETED,
        OrderStatus.DELIVERED,
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
    ]

    const historyOrders = allOrders
        .filter(o => historyStatuses.includes(o.status))
        .slice(0, 10)

    const historyItems = historyOrders.map(o => ({
        id: `#${o.orderNumber}`,
        date: new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        project: o.stlFileName || "Untitled Project",
        status: STATUS_LABELS[o.status],
        total: Number(o.totalPrice).toLocaleString("id-ID"),
        statusColor: STATUS_COLORS[o.status],
    }))

    const timelineItems = (() => {
        if (!activeOrder) return []
        const history = [...activeOrder.statusHistory]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .slice(-4)

        if (history.length === 0) {
            return [{
                status: "current" as const,
                title: STATUS_LABELS[activeOrder.status],
                time: formatDateTime(activeOrder.createdAt),
            }]
        }

        return history.map((h, idx) => ({
            status: idx === history.length - 1 ? "current" as const : "completed" as const,
            title: STATUS_LABELS[h.status],
            time: formatDateTime(h.createdAt),
        }))
    })()

    return (
        <div className="space-y-8">
            {/* Provider Banner */}
            <ProviderBanner />

            {/* Hero Section: Welcome + Timeline */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 h-full">
                    <WelcomeSection
                        name={session.user.name ?? "User"}
                        activeCount={stats.active}
                    />
                </div>
                <div className="h-full">
                    <OrderTimeline
                        items={timelineItems}
                        isLive={!!activeOrder}
                    />
                </div>
            </div>

            {/* Active Prints Section */}
            <ActivePrints />

            {/* Order History Section */}
            <OrderHistory items={historyItems} />

            {/* Stats Overview */}
            <StatsCards
                totalOrders={stats.total}
                totalSpent={stats.totalSpent}
                activePrints={stats.active}
                completedOrders={stats.completed}
            />
        </div>
    )
}
