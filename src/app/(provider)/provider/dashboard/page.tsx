import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { VerificationPendingState } from "@/components/provider/dashboard/VerificationPendingState"
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

// Helper to format currency
function formatCurrency(amount: number): string {
    if (amount >= 1000000) {
        return `Rp ${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
        return `Rp ${(amount / 1000).toFixed(1)}K`
    }
    return `Rp ${amount.toLocaleString('id-ID')}`
}

export default async function ProviderDashboardPage() {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        include: {
            printers: {
                include: {
                    currentMaterial: true,
                }
            }
        }
    })

    if (!provider) return <div>Provider profile not found</div>

    if (!provider.isVerified) {
        return <VerificationPendingState />
    }

    // Transform printers for live fleet display
    const printers = provider.printers.map(p => ({
        id: p.id,
        name: p.name,
        material: p.currentMaterial?.name || "Unknown",
        status: p.status.toLowerCase() as "printing" | "idle" | "error" | "offline" | "cooling",
        progress: (p.lastJobInfo as any)?.progress,
        filename: (p.lastJobInfo as any)?.filename,
        nozzleTemp: (p.lastTemperatures as any)?.hotend || (p.lastTemperatures as any)?.tool0,
        bedTemp: (p.lastTemperatures as any)?.bed,
        lastSeenAt: p.lastSeenAt?.toISOString() || null
    }))

    // Count statistics
    const activePrinters = printers.filter(p => p.status !== "offline").length
    const totalPrinters = printers.length

    // Get current date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 6)
    const yesterdayStart = new Date(today)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const previousWeekStart = new Date(today)
    previousWeekStart.setDate(previousWeekStart.getDate() - 13)
    const previousWeekEnd = new Date(today)
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1)

    // Count jobs by status for queue
    const [printingJobs, inQueueJobs, slicingJobs] = await Promise.all([
        prisma.order.count({
            where: { providerId: provider.id, status: "PRINTING" }
        }),
        prisma.order.count({
            where: { providerId: provider.id, status: "IN_QUEUE" }
        }),
        prisma.order.count({
            where: { providerId: provider.id, status: "SLICING" }
        })
    ])

    // Count completed jobs using printCompletedAt
    const [completedToday, completedThisWeek, completedYesterday, completedPrevWeek, totalCompleted, totalOrders] = await Promise.all([
        prisma.order.count({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: today }
            }
        }),
        prisma.order.count({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: weekStart }
            }
        }),
        prisma.order.count({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: yesterdayStart, lt: today }
            }
        }),
        prisma.order.count({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: previousWeekStart, lt: previousWeekEnd }
            }
        }),
        prisma.order.count({
            where: { providerId: provider.id, status: "COMPLETED" }
        }),
        prisma.order.count({
            where: { providerId: provider.id }
        })
    ])

    // Calculate revenue from completed orders
    const [totalRevenueData, currentMonthRevenueData, previousMonthRevenueData, pendingPayoutData] = await Promise.all([
        prisma.order.aggregate({
            where: {
                providerId: provider.id,
                status: "COMPLETED"
            },
            _sum: {
                printingCost: true
            }
        }),
        prisma.order.aggregate({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: monthStart }
            },
            _sum: {
                printingCost: true
            }
        }),
        prisma.order.aggregate({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: previousMonthStart, lt: previousMonthEnd }
            },
            _sum: {
                printingCost: true
            }
        }),
        prisma.order.aggregate({
            where: {
                providerId: provider.id,
                status: "COMPLETED",
                printCompletedAt: { gte: monthStart }
            },
            _sum: {
                printingCost: true
            }
        })
    ])

    const totalRevenue = Number(totalRevenueData._sum.printingCost || 0)
    const currentMonthRevenue = Number(currentMonthRevenueData._sum.printingCost || 0)
    const previousMonthRevenue = Number(previousMonthRevenueData._sum.printingCost || 0)
    const pendingPayout = Number(pendingPayoutData._sum.printingCost || 0)

    const revenueChangeValue = previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : (currentMonthRevenue > 0 ? 100 : 0)
    const revenueChange = `${revenueChangeValue >= 0 ? "+" : ""}${revenueChangeValue.toFixed(0)}%`

    // Calculate success rate (simplified - completed/total * 100)
    const successRate = totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 100

    // Get completed orders for analytics (last 7 days)
    const completedRecent = await prisma.order.findMany({
        where: {
            providerId: provider.id,
            status: "COMPLETED",
            printCompletedAt: { gte: weekStart }
        },
        select: {
            printCompletedAt: true,
            createdAt: true,
            estimatedPrintTime: true,
            filamentWeightG: true,
            printerId: true,
            printer: { select: { name: true } }
        }
    })

    // Weekly chart data (last 7 days)
    const weeklyBuckets = Array.from({ length: 7 }).map((_, idx) => {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + idx)
        return {
            label: day.toLocaleDateString("en-US", { weekday: "short" }),
            dateKey: day.toDateString(),
            completed: 0,
            printHours: 0,
        }
    })

    completedRecent.forEach(order => {
        const date = order.printCompletedAt || order.createdAt
        const key = date.toDateString()
        const bucket = weeklyBuckets.find(b => b.dateKey === key)
        if (bucket) {
            bucket.completed += 1
            if (order.estimatedPrintTime) {
                bucket.printHours += order.estimatedPrintTime / 60
            }
        }
    })

    const weeklyChartData = weeklyBuckets.map(b => ({
        label: b.label,
        completed: b.completed,
        printHours: Math.round(b.printHours)
    }))

    // Daily chart data (today by 4-hour buckets)
    const dailyBuckets = [
        { label: "00-04", start: 0, end: 4, completed: 0, printHours: 0 },
        { label: "04-08", start: 4, end: 8, completed: 0, printHours: 0 },
        { label: "08-12", start: 8, end: 12, completed: 0, printHours: 0 },
        { label: "12-16", start: 12, end: 16, completed: 0, printHours: 0 },
        { label: "16-20", start: 16, end: 20, completed: 0, printHours: 0 },
        { label: "20-24", start: 20, end: 24, completed: 0, printHours: 0 },
    ]

    completedRecent.forEach(order => {
        const date = order.printCompletedAt || order.createdAt
        if (date >= today) {
            const hour = date.getHours()
            const bucket = dailyBuckets.find(b => hour >= b.start && hour < b.end)
            if (bucket) {
                bucket.completed += 1
                if (order.estimatedPrintTime) {
                    bucket.printHours += order.estimatedPrintTime / 60
                }
            }
        }
    })

    const dailyChartData = dailyBuckets.map(b => ({
        label: b.label,
        completed: b.completed,
        printHours: Math.round(b.printHours)
    }))

    // Print time analytics by printer (avg hours/day over last 7 days)
    const perPrinter: Record<string, { name: string; minutes: number }> = {}
    completedRecent.forEach(order => {
        if (!order.printerId) return
        const key = order.printerId
        const name = order.printer?.name || "Printer"
        if (!perPrinter[key]) perPrinter[key] = { name, minutes: 0 }
        perPrinter[key].minutes += order.estimatedPrintTime || 0
    })

    const printTimeFleets = Object.values(perPrinter)
        .map((p, idx) => ({
            name: p.name,
            avgHours: Number(((p.minutes / 60) / 7).toFixed(1)),
            maxHours: 24,
            color: (idx % 3 === 0 ? "teal" : idx % 3 === 1 ? "emerald" : "slate") as "teal" | "emerald" | "slate"
        }))
        .sort((a, b) => b.avgHours - a.avgHours)
        .slice(0, 4)

    // Today print hours and material used
    const printHoursToday = completedRecent
        .filter(o => (o.printCompletedAt || o.createdAt) >= today)
        .reduce((sum, o) => sum + ((o.estimatedPrintTime || 0) / 60), 0)

    const materialUsedGrams = completedRecent
        .filter(o => (o.printCompletedAt || o.createdAt) >= today)
        .reduce((sum, o) => sum + (o.filamentWeightG || 0), 0)

    // Average print time (last 30 days)
    const avgPrintTimeData = await prisma.order.aggregate({
        where: {
            providerId: provider.id,
            status: "COMPLETED",
            printCompletedAt: { gte: previousMonthStart }
        },
        _avg: {
            estimatedPrintTime: true
        }
    })

    const avgPrintTimeMinutes = Math.round(avgPrintTimeData._avg.estimatedPrintTime || 0)

    const todayChangeValue = completedYesterday > 0
        ? ((completedToday - completedYesterday) / completedYesterday) * 100
        : (completedToday > 0 ? 100 : 0)
    const weekChangeValue = completedPrevWeek > 0
        ? ((completedThisWeek - completedPrevWeek) / completedPrevWeek) * 100
        : (completedThisWeek > 0 ? 100 : 0)
    const todayChange = `${todayChangeValue >= 0 ? "+" : ""}${todayChangeValue.toFixed(0)}%`
    const weekChange = `${weekChangeValue >= 0 ? "+" : ""}${weekChangeValue.toFixed(0)}%`

    // Get orders for the queue table
    const pendingOrders = await prisma.order.findMany({
        where: {
            providerId: provider.id,
            status: { in: ["IN_QUEUE", "SLICING", "PRINTING"] }
        },
        include: {
            user: { select: { name: true } },
            material: { select: { name: true } }
        },
        orderBy: { createdAt: "asc" },
        take: 10
    })

    // Transform orders to queue items
    const orders = pendingOrders.map(order => ({
        id: order.id,
        orderId: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
        customer: order.user?.name || "Customer",
        date: order.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        material: order.material?.name || "PLA",
        estimatedTime: order.estimatedPrintTime
            ? `${Math.floor(order.estimatedPrintTime / 60)}h ${order.estimatedPrintTime % 60}m`
            : "TBD",
        status: (order.status === "PRINTING" ? "printing" :
            order.status === "IN_QUEUE" ? "pending" : "pending") as "urgent" | "printing" | "pending" | "completed",
        method: "FDM / FFF",
        fleet: "Desktop Fleet"
    }))

    return (
        <DashboardClient
            providerId={provider.id}
            printers={printers}
            stats={{
                activePrinters,
                totalPrinters,
                queuedJobs: printingJobs + inQueueJobs + slicingJobs,
                completedToday,
                completedThisWeek,
                avgPrintTimeMinutes,
                successRate,
                printHoursToday: Math.round(printHoursToday),
                materialUsedGrams: Math.round(materialUsedGrams),
                todayChange,
                weekChange,
                jobsByStatus: {
                    printing: printingJobs,
                    in_queue: inQueueJobs,
                    slicing: slicingJobs
                },
                // Revenue metrics
                totalRevenue: formatCurrency(totalRevenue),
                pendingPayout: formatCurrency(pendingPayout),
                revenueChange,
                totalCompletedOrders: totalCompleted
            }}
            chartData={{
                weekly: weeklyChartData,
                daily: dailyChartData
            }}
            printTimeFleets={printTimeFleets}
            orders={orders}
        />
    )
}
